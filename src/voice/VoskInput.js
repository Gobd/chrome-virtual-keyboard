// Vosk Voice Input Module
// Uses vosk-browser for streaming speech-to-text
// Requires --disable-web-security flag to allow unsafe-eval

import { Model } from "vosk-browser";

// Voice input state
let model = null;
let recognizer = null;
let isLoadingModel = false;
let audioContext = null;
let mediaStream = null;
let mediaStreamSource = null;
let processor = null;
let isRecording = false;

// Callbacks
let onStateChange = null;
let onPartialResult = null;
let onFinalResult = null;

// Constants
const SAMPLE_RATE = 16000;

/**
 * Simple linear interpolation resampler
 * @param {Float32Array} samples - Input samples
 * @param {number} inputRate - Input sample rate
 * @param {number} outputRate - Output sample rate
 * @returns {Float32Array} Resampled audio
 */
function resample(samples, inputRate, outputRate) {
  if (inputRate === outputRate) {
    return samples;
  }

  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const t = srcIndex - srcIndexFloor;

    // Linear interpolation
    output[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t;
  }

  return output;
}

// Model URLs from alphacephei.com
const MODEL_URLS = {
  "en-small": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
  "de-small": "https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip",
  "fr-small": "https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip",
  "es-small": "https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip",
  "it-small": "https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip",
  "pt-small": "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip",
  "ru-small": "https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip",
  "zh-small": "https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip",
};

/**
 * Voice input states
 */
export const VoiceState = {
  IDLE: "idle",
  LOADING_MODEL: "loading_model",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  ERROR: "error",
};

/**
 * Check if Vosk is available
 * @returns {boolean}
 */
export function isVoskAvailable() {
  return true;
}

/**
 * Set state and notify callback
 * @param {string} state
 * @param {string} [error]
 */
function setState(state, error = null) {
  console.log("[Vosk] setState:", state, error || "");
  if (onStateChange) {
    onStateChange(state, error);
  } else {
    console.warn("[Vosk] setState called but no onStateChange callback registered");
  }
}

/**
 * Fetch model in main thread to avoid worker CORS issues
 * @param {string} url - Model URL
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Blob URL
 */
async function fetchModelAsBlob(url, onProgress) {
  console.log("[Vosk] Fetching model in main thread:", url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (total && onProgress) {
      onProgress({ loaded, total, progress: loaded / total });
    }
  }

  const blob = new Blob(chunks, { type: "application/zip" });
  const blobUrl = URL.createObjectURL(blob);
  console.log("[Vosk] Model fetched, created blob URL:", blobUrl);
  return blobUrl;
}

/**
 * Initialize the Vosk model
 * @param {Object} options
 * @param {string} options.modelKey - Model key like 'en-small'
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onStateChange - State change callback
 * @param {Function} options.onPartialResult - Partial result callback
 * @param {Function} options.onFinalResult - Final result callback
 * @returns {Promise<boolean>} Success
 */
export async function initTranscriber(options = {}) {
  const {
    modelKey = "en-small",
    onProgress: progressCallback,
    onStateChange: stateCallback,
    onPartialResult: partialCallback,
    onFinalResult: finalCallback,
  } = options;

  // Always update callbacks (even if model already loaded)
  onStateChange = stateCallback;
  onPartialResult = partialCallback;
  onFinalResult = finalCallback;

  if (model) {
    console.log("[Vosk] Model already loaded, updating callbacks only");
    setState(VoiceState.IDLE);
    return true; // Already initialized
  }

  if (isLoadingModel) {
    console.log("[Vosk] Model already loading, please wait");
    return false;
  }

  isLoadingModel = true;

  const modelUrl = MODEL_URLS[modelKey];
  if (!modelUrl) {
    setState(VoiceState.ERROR, `Unknown model: ${modelKey}`);
    return false;
  }

  try {
    setState(VoiceState.LOADING_MODEL);
    console.log("[Vosk] Loading model:", modelUrl);

    // Fetch in main thread to avoid worker CORS issues
    const blobUrl = await fetchModelAsBlob(modelUrl, progressCallback);

    console.log("[Vosk] Creating Model directly with blob URL...");

    // Create Model directly - bypasses createModel's broken Promise in Firefox
    // The Model constructor starts loading immediately
    const voskModel = new Model(blobUrl);

    // Poll model.ready until true (set internally when model loads)
    const maxWaitMs = 90000;
    const pollIntervalMs = 500;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (voskModel.ready) {
        console.log("[Vosk] Model ready! (via model.ready property)");
        model = voskModel;
        break;
      }
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 5 === 0 && elapsed > 0) {
        console.log(`[Vosk] Waiting for model.ready... ${elapsed}s`);
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    if (!model) {
      voskModel.terminate();
      URL.revokeObjectURL(blobUrl);
      throw new Error("Model loading timed out - model.ready never became true");
    }

    // Keep blob URL alive while model is in use (don't revoke yet)

    console.log("[Vosk] Model loaded successfully, model object:", typeof model);
    isLoadingModel = false;
    setState(VoiceState.IDLE);
    return true;
  } catch (error) {
    console.error("[Vosk] Failed to load model:", error);
    isLoadingModel = false;
    setState(VoiceState.ERROR, error.message);
    return false;
  }
}

/**
 * Check if model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
  return model !== null;
}

/**
 * Start recording and streaming recognition
 * @returns {Promise<boolean>} Success
 */
export async function startRecording() {
  if (isRecording) {
    return false;
  }

  if (!model) {
    setState(VoiceState.ERROR, "Model not loaded");
    return false;
  }

  try {
    // Create recognizer using model's KaldiRecognizer class
    const KaldiRecognizer = model.KaldiRecognizer;
    recognizer = new KaldiRecognizer(SAMPLE_RATE);
    console.log("[Vosk] Created KaldiRecognizer");

    // Firefox EventTarget is broken for vosk-browser classes
    // Intercept dispatchEvent and handle events directly
    const originalDispatch = recognizer.dispatchEvent.bind(recognizer);
    recognizer.dispatchEvent = (event) => {
      const message = event.detail;
      console.log("[Vosk] Event:", event.type, message);

      if (event.type === "result") {
        const text = message?.result?.text || message?.text || "";
        if (text) {
          console.log("[Vosk] Final:", text);
          if (onFinalResult) onFinalResult(text);
        }
      } else if (event.type === "partialresult") {
        const text = message?.result?.partial || message?.partial || "";
        console.log("[Vosk] Partial:", text);
        if (onPartialResult) onPartialResult(text);
      }

      return originalDispatch(event);
    };

    // Get microphone stream (let browser choose sample rate)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    mediaStream = stream;

    // Create audio context at default sample rate (matches mic)
    audioContext = new AudioContext();
    const inputSampleRate = audioContext.sampleRate;
    console.log("[Vosk] Audio context sample rate:", inputSampleRate);

    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Create processor node to capture audio data
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    let audioChunkCount = 0;
    processor.onaudioprocess = (event) => {
      if (isRecording && recognizer) {
        const inputSamples = event.inputBuffer.getChannelData(0);

        // Resample from input rate to Vosk's 16kHz if needed
        let samples;
        if (inputSampleRate !== SAMPLE_RATE) {
          samples = resample(inputSamples, inputSampleRate, SAMPLE_RATE);
        } else {
          samples = inputSamples;
        }

        audioChunkCount++;
        if (audioChunkCount <= 3 || audioChunkCount % 50 === 0) {
          console.log(`[Vosk] Audio chunk #${audioChunkCount}, samples: ${samples.length}, first: ${samples[0]?.toFixed(4)}`);
        }

        // Use acceptWaveformFloat for raw Float32Array data
        recognizer.acceptWaveformFloat(samples, SAMPLE_RATE);
      }
    };

    mediaStreamSource.connect(processor);
    processor.connect(audioContext.destination);

    isRecording = true;
    setState(VoiceState.RECORDING);
    console.log("[Vosk] Recording started");

    return true;
  } catch (error) {
    console.error("[Vosk] Failed to start recording:", error);
    if (error.name === "NotAllowedError") {
      setState(VoiceState.ERROR, "Microphone permission denied");
    } else {
      setState(VoiceState.ERROR, error.message);
    }
    return false;
  }
}

/**
 * Stop recording
 * @returns {Promise<string|null>} Final text (may be empty for streaming)
 */
export async function stopRecording() {
  if (!isRecording) {
    return null;
  }

  isRecording = false;

  // Stop media stream
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }

  // Disconnect processor
  if (processor) {
    processor.disconnect();
    processor = null;
  }

  if (mediaStreamSource) {
    mediaStreamSource.disconnect();
    mediaStreamSource = null;
  }

  // Close audio context
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }

  // Request final result before cleanup
  if (recognizer) {
    console.log("[Vosk] Requesting final result...");
    recognizer.retrieveFinalResult();

    // Wait a bit for the final result event to fire
    await new Promise((r) => setTimeout(r, 200));

    recognizer.remove();
    recognizer = null;
  }

  setState(VoiceState.IDLE);
  console.log("[Vosk] Recording stopped");

  return null; // Vosk streams results via callbacks
}

/**
 * Toggle recording
 * @returns {Promise<string|null>}
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
 * Check if currently recording
 * @returns {boolean}
 */
export function getIsRecording() {
  return isRecording;
}

/**
 * Clean up resources
 */
export function dispose() {
  if (isRecording) {
    stopRecording();
  }

  if (model) {
    model.terminate();
    model = null;
  }
}

export default {
  VoiceState,
  isVoskAvailable,
  initTranscriber,
  isModelLoaded,
  startRecording,
  stopRecording,
  toggleRecording,
  getIsRecording,
  dispose,
};
