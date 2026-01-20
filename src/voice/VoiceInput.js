// Voice Input Module
// Uses Transformers.js with Whisper for local speech-to-text
// Optional VAD (Voice Activity Detection) for auto-transcription
//
// FUTURE IMPROVEMENTS:
// 1. If performance is insufficient (especially on Raspberry Pi),
//    consider switching to whisper.cpp WASM which may be faster.
//    See: https://ggml.ai/whisper.cpp/ for implementation reference.
//
// 2. Investigate quantized models (Q4, Q5_1, etc.) for better
//    performance/size tradeoffs. whisper.cpp offers models like:
//    - tiny.en (Q5_1): ~31MB vs ~75MB full
//    - base (Q5_1): ~57MB vs ~142MB full
//
// The API in this module abstracts the backend, so switching would
// only require changes to this file.

import { env, pipeline } from "@huggingface/transformers";
import { MicVAD } from "@ricky0123/vad-web";

// Configure ONNX Runtime to use local WASM files (required for Chrome extensions)
// Chrome extensions block loading from CDN due to CSP restrictions
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL("wasm/");
// Disable multithreading to avoid issues in content script context
env.backends.onnx.wasm.numThreads = 1;

// Voice input state
let transcriber = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimeout = null;

// VAD state
let vadInstance = null;
let isVadMode = false;
let isVadListening = false;

// Callbacks for UI updates
let onStateChange = null;
let onProgress = null;
let onTranscription = null; // Callback for VAD mode transcriptions

// Constants
const MAX_RECORDING_DURATION = 30000; // 30 seconds
const SAMPLE_RATE = 16000; // Whisper expects 16kHz audio

/**
 * Voice input states
 */
export const VoiceState = {
  IDLE: "idle",
  LOADING_MODEL: "loading_model",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  LISTENING: "listening", // VAD mode: waiting for speech
  SPEECH_DETECTED: "speech_detected", // VAD mode: speech in progress
  ERROR: "error",
};

/**
 * Model options with sizes for both quantized and full precision
 * These are used in the settings UI to show users what to expect
 */
export const MODEL_INFO = {
  // Quantized models (smaller, faster, slightly lower quality)
  "tiny-q8": {
    name: "Tiny (Quantized)",
    size: "~41 MB",
    description: "Fastest, good for RPi/low-power devices",
    quantized: true,
  },
  "base-q8": {
    name: "Base (Quantized)",
    size: "~77 MB",
    description: "Balanced, recommended for most devices",
    quantized: true,
  },
  "small-q8": {
    name: "Small (Quantized)",
    size: "~244 MB",
    description: "Better accuracy, still reasonably fast",
    quantized: true,
  },
  // Full precision models (larger, higher quality)
  tiny: {
    name: "Tiny (Full)",
    size: "~75 MB",
    description: "Fast, full precision",
    quantized: false,
  },
  base: {
    name: "Base (Full)",
    size: "~145 MB",
    description: "Good accuracy, full precision",
    quantized: false,
  },
  small: {
    name: "Small (Full)",
    size: "~488 MB",
    description: "Best accuracy, for powerful devices",
    quantized: false,
  },
};

/**
 * Get the Whisper model ID and dtype based on settings
 * @param {string} modelKey - Model key like 'tiny-q8', 'base', etc.
 * @param {string} language - 'en' or 'multilingual'
 * @returns {{modelId: string, dtype: string}} Model ID and dtype for Hugging Face
 */
function getModelConfig(modelKey, language) {
  const isEnglishOnly = language === "en";
  const modelInfo = MODEL_INFO[modelKey] || MODEL_INFO["base-q8"];
  const isQuantized = modelInfo.quantized;

  // Extract base model name (remove -q8 suffix if present)
  const baseModel = modelKey.replace("-q8", "");

  // Model ID mapping
  const modelIds = {
    tiny: isEnglishOnly
      ? "onnx-community/whisper-tiny.en"
      : "onnx-community/whisper-tiny",
    base: isEnglishOnly
      ? "onnx-community/whisper-base.en"
      : "onnx-community/whisper-base",
    small: isEnglishOnly
      ? "onnx-community/whisper-small.en"
      : "onnx-community/whisper-small",
  };

  return {
    modelId: modelIds[baseModel] || modelIds.base,
    dtype: isQuantized ? "q8" : "fp32",
  };
}

/**
 * Check if the browser supports the required APIs
 * @returns {{supported: boolean, reason?: string}}
 */
export function checkBrowserSupport() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, reason: "Microphone API not available" };
  }
  if (
    typeof AudioContext === "undefined" &&
    typeof webkitAudioContext === "undefined"
  ) {
    return { supported: false, reason: "AudioContext not available" };
  }
  return { supported: true };
}

/**
 * Initialize the Whisper transcriber
 * @param {Object} options
 * @param {string} options.modelSize - Model key like 'tiny-q8', 'base', 'small-q8', etc.
 * @param {string} options.language - 'en' or 'multilingual'
 * @param {Function} options.onProgress - Progress callback (0-100)
 * @param {Function} options.onStateChange - State change callback
 * @returns {Promise<boolean>} Success
 */
export async function initTranscriber(options = {}) {
  const {
    modelSize = "base-q8",
    language = "multilingual",
    onProgress: progressCallback,
    onStateChange: stateCallback,
  } = options;

  onProgress = progressCallback;
  onStateChange = stateCallback;

  if (transcriber) {
    return true; // Already initialized
  }

  const support = checkBrowserSupport();
  if (!support.supported) {
    setState(VoiceState.ERROR, support.reason);
    return false;
  }

  setState(VoiceState.LOADING_MODEL);

  try {
    const { modelId, dtype } = getModelConfig(modelSize, language);

    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      dtype, // 'q8' for quantized, 'fp32' for full precision
      device: "wasm", // Use WASM for broad compatibility
      progress_callback: (progress) => {
        if (progress.status === "progress" && onProgress) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          onProgress(percent);
        }
      },
    });

    setState(VoiceState.IDLE);
    return true;
  } catch (error) {
    console.error("Failed to initialize Whisper:", error);
    setState(VoiceState.ERROR, error.message);
    return false;
  }
}

/**
 * Check if the model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
  return transcriber !== null;
}

/**
 * Start recording audio
 * @returns {Promise<boolean>} Success
 */
export async function startRecording() {
  if (isRecording) {
    return false;
  }

  if (!transcriber) {
    setState(VoiceState.ERROR, "Model not loaded");
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      for (const track of stream.getTracks()) {
        track.stop();
      }

      // Process the recorded audio
      await processAudio();
    };

    mediaRecorder.start(100); // Collect data every 100ms
    isRecording = true;
    setState(VoiceState.RECORDING);

    // Auto-stop after max duration
    recordingTimeout = setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, MAX_RECORDING_DURATION);

    return true;
  } catch (error) {
    console.error("Failed to start recording:", error);
    if (error.name === "NotAllowedError") {
      setState(VoiceState.ERROR, "Microphone permission denied");
    } else {
      setState(VoiceState.ERROR, error.message);
    }
    return false;
  }
}

/**
 * Stop recording and transcribe
 * @returns {Promise<string|null>} Transcribed text or null on error
 */
export async function stopRecording() {
  if (!isRecording || !mediaRecorder) {
    return null;
  }

  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

  isRecording = false;

  return new Promise((resolve) => {
    mediaRecorder.onstop = async () => {
      // Stop all tracks
      for (const track of mediaRecorder.stream.getTracks()) {
        track.stop();
      }

      // Process the audio
      const text = await processAudio();
      resolve(text);
    };
    mediaRecorder.stop();
  });
}

/**
 * Toggle recording state
 * @returns {Promise<string|null>} Transcribed text if stopped, null if started
 */
export async function toggleRecording() {
  if (isRecording) {
    return await stopRecording();
  } else {
    await startRecording();
    return null;
  }
}

/**
 * Process recorded audio and transcribe
 * @returns {Promise<string|null>} Transcribed text or null
 */
async function processAudio() {
  if (audioChunks.length === 0) {
    setState(VoiceState.IDLE);
    return null;
  }

  setState(VoiceState.TRANSCRIBING);

  try {
    // Create blob from chunks
    const audioBlob = new Blob(audioChunks, { type: audioChunks[0].type });

    // Convert to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode audio to PCM
    const audioContext = new (window.AudioContext || window.webkitAudioContext)(
      {
        sampleRate: SAMPLE_RATE,
      }
    );

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get mono channel data
    const audioData = audioBuffer.getChannelData(0);

    // Transcribe
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    setState(VoiceState.IDLE);

    // Clean up the transcribed text
    let text = result.text?.trim() || "";
    // Remove trailing punctuation (Whisper tends to add periods)
    text = text.replace(/[.!?]+$/, "");
    return text;
  } catch (error) {
    console.error("Transcription failed:", error);
    setState(VoiceState.ERROR, error.message);
    return null;
  }
}

/**
 * Get current recording state
 * @returns {boolean}
 */
export function getIsRecording() {
  return isRecording;
}

/**
 * Set state and notify callback
 * @param {string} state
 * @param {string} [error]
 */
function setState(state, error = null) {
  if (onStateChange) {
    onStateChange(state, error);
  }
}

/**
 * Clean up resources
 */
export function dispose() {
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
  if (vadInstance) {
    vadInstance.destroy();
    vadInstance = null;
  }
  if (transcriber) {
    transcriber = null;
  }
  isRecording = false;
  isVadListening = false;
  audioChunks = [];
}

// ============================================================
// VAD (Voice Activity Detection) Mode
// Auto-transcribes when speech is detected and pauses
// ============================================================

/**
 * Initialize VAD for auto-transcription mode
 * @param {Object} options
 * @param {Function} options.onTranscription - Callback with transcribed text
 * @param {Function} options.onStateChange - State change callback
 * @returns {Promise<boolean>} Success
 */
export async function initVAD(options = {}) {
  const { onTranscription: transcriptionCallback, onStateChange: stateCallback } =
    options;

  onTranscription = transcriptionCallback;
  if (stateCallback) {
    onStateChange = stateCallback;
  }

  if (vadInstance) {
    return true; // Already initialized
  }

  if (!transcriber) {
    setState(VoiceState.ERROR, "Whisper model must be loaded first");
    return false;
  }

  try {
    // Configure paths for Chrome extension
    const vadBasePath = chrome.runtime.getURL("vad/");
    const wasmBasePath = chrome.runtime.getURL("wasm/");

    vadInstance = await MicVAD.new({
      model: "legacy",
      baseAssetPath: vadBasePath,
      onnxWASMBasePath: wasmBasePath,
      onSpeechStart: () => {
        console.log("[VAD] Speech started");
        setState(VoiceState.SPEECH_DETECTED);
      },
      onSpeechEnd: async (audio) => {
        console.log("[VAD] Speech ended, transcribing...", audio.length, "samples");
        setState(VoiceState.TRANSCRIBING);

        try {
          // audio is Float32Array at 16kHz - exactly what Whisper needs
          const result = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
          });

          console.log("[VAD] Transcription result:", result);

          let text = result.text?.trim() || "";
          // Remove trailing punctuation
          text = text.replace(/[.!?]+$/, "");

          console.log("[VAD] Final text:", text);

          if (text && onTranscription) {
            console.log("[VAD] Calling onTranscription callback");
            onTranscription(text);
          }
        } catch (error) {
          console.error("[VAD] Transcription failed:", error);
        }

        // Back to listening if VAD is still active
        if (isVadListening) {
          setState(VoiceState.LISTENING);
        } else {
          setState(VoiceState.IDLE);
        }
      },
      onVADMisfire: () => {
        console.log("[VAD] Misfire (too short)");
      },
    });

    isVadMode = true;
    return true;
  } catch (error) {
    console.error("[VAD] Failed to initialize:", error);
    setState(VoiceState.ERROR, error.message);
    return false;
  }
}

/**
 * Start VAD listening (auto-transcription mode)
 * @returns {Promise<boolean>} Success
 */
export async function startVADListening() {
  if (!vadInstance) {
    setState(VoiceState.ERROR, "VAD not initialized");
    return false;
  }

  if (isVadListening) {
    return true; // Already listening
  }

  try {
    vadInstance.start();
    isVadListening = true;
    setState(VoiceState.LISTENING);
    console.log("[VAD] Started listening");
    return true;
  } catch (error) {
    console.error("[VAD] Failed to start:", error);
    setState(VoiceState.ERROR, error.message);
    return false;
  }
}

/**
 * Stop VAD listening
 */
export function stopVADListening() {
  if (!vadInstance || !isVadListening) {
    return;
  }

  vadInstance.pause();
  isVadListening = false;
  setState(VoiceState.IDLE);
  console.log("[VAD] Stopped listening");
}

/**
 * Toggle VAD listening state
 * @returns {Promise<boolean>} New listening state
 */
export async function toggleVADListening() {
  if (isVadListening) {
    stopVADListening();
    return false;
  } else {
    return await startVADListening();
  }
}

/**
 * Check if VAD is initialized
 * @returns {boolean}
 */
export function isVADInitialized() {
  return vadInstance !== null;
}

/**
 * Check if VAD is currently listening
 * @returns {boolean}
 */
export function isVADListening() {
  return isVadListening;
}

export default {
  VoiceState,
  checkBrowserSupport,
  initTranscriber,
  isModelLoaded,
  startRecording,
  stopRecording,
  toggleRecording,
  getIsRecording,
  dispose,
  // VAD mode
  initVAD,
  startVADListening,
  stopVADListening,
  toggleVADListening,
  isVADInitialized,
  isVADListening,
};
