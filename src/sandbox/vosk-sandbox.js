// Vosk Sandbox Worker
// Runs inside a sandboxed iframe where eval() is allowed
// Communicates with the extension via postMessage

// Override IndexedDB BEFORE loading vosk-browser
// (sandbox has null origin, can't use IDB - this makes IDBFS fail gracefully)
const fakeIDBRequest = () => {
  const request = {
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    error: new DOMException("IndexedDB disabled in sandbox", "SecurityError"),
    result: null,
    readyState: "done",
  };
  setTimeout(() => {
    if (request.onerror) request.onerror({ target: request });
  }, 0);
  return request;
};

try {
  Object.defineProperty(window, "indexedDB", {
    value: {
      open: fakeIDBRequest,
      deleteDatabase: fakeIDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    },
    writable: false,
    configurable: false,
  });
} catch (e) {
}

// Dynamic import to ensure mock is in place first
const { createModel, KaldiRecognizer } = await import("vosk-browser");

// State
let model = null;
let recognizer = null;
const SAMPLE_RATE = 16000;

// Send message to parent
function send(message) {
  window.parent.postMessage(message, "*");
}

// Handle messages from parent
window.addEventListener("message", async (event) => {
  const { type, ...data } = event.data;

  switch (type) {
    case "init":
      await handleInit(data);
      break;
    case "start":
      handleStart();
      break;
    case "audio":
      handleAudio(data);
      break;
    case "stop":
      handleStop();
      break;
    case "dispose":
      handleDispose();
      break;
  }
});

async function handleInit({ modelData }) {
  if (model) {
    send({ type: "ready" });
    return;
  }

  send({ type: "stateChange", state: "loading_model" });

  try {

    if (!modelData || !modelData.byteLength) {
      throw new Error("No model data received");
    }

    // Create blob URL from the model data (already fetched by main context)
    const blob = new Blob([modelData], { type: "application/zip" });
    const blobUrl = URL.createObjectURL(blob);


    // Add timeout to detect if it's hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Model loading timeout after 120s")), 120000);
    });

    const modelPromise = createModel(blobUrl);

    modelPromise.then(() => {
    }).catch((err) => {
    });

    model = await Promise.race([
      modelPromise,
      timeoutPromise
    ]);


    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);

    send({ type: "stateChange", state: "idle" });
    send({ type: "ready" });
  } catch (error) {
    console.error("[Vosk Sandbox] Failed to load model:", error);
    console.error("[Vosk Sandbox] Error stack:", error.stack);
    send({ type: "stateChange", state: "error", error: error.message });
    send({ type: "error", message: error.message });
  }
}

function handleStart() {
  if (!model) {
    send({ type: "error", message: "Model not loaded" });
    return;
  }

  try {
    recognizer = new KaldiRecognizer(model, SAMPLE_RATE);

    recognizer.on("result", (message) => {
      const text = message.result?.text || "";
      if (text) {
        send({ type: "result", text });
      }
    });

    recognizer.on("partialresult", (message) => {
      const text = message.result?.partial || "";
      send({ type: "partial", text });
    });

    send({ type: "stateChange", state: "recording" });
    send({ type: "started" });
  } catch (error) {
    console.error("[Vosk Sandbox] Failed to start:", error);
    send({ type: "error", message: error.message });
  }
}

function handleAudio({ samples }) {
  if (recognizer && samples) {
    // Convert back to Float32Array if needed
    const audioData = samples instanceof Float32Array
      ? samples
      : new Float32Array(samples);
    recognizer.acceptWaveform(audioData);
  }
}

function handleStop() {
  if (recognizer) {
    recognizer.remove();
    recognizer = null;
  }
  send({ type: "stateChange", state: "idle" });
  send({ type: "stopped" });
}

function handleDispose() {
  if (recognizer) {
    recognizer.remove();
    recognizer = null;
  }
  if (model) {
    model.terminate();
    model = null;
  }
}

// Signal that sandbox is ready
send({ type: "sandbox-ready" });
