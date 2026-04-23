const SPECIES = [
  { key: "empty", label: "Empty", group: "none" },
  { key: "coyote", label: "Coyote", group: "mammal" },
  {
    key: "reptile or amphibian",
    label: "Reptile / Amphibian",
    group: "herp",
  },
  {
    key: "california ground squirrel",
    label: "California Ground Squirrel",
    group: "mammal",
  },
  {
    key: "western spotted skunk",
    label: "Western Spotted Skunk",
    group: "mammal",
  },
  { key: "american robin", label: "American Robin", group: "bird" },
  {
    key: "leporidae family",
    label: "Leporidae (Rabbit)",
    group: "mammal",
  },
  { key: "invertebrate", label: "Invertebrate", group: "invert" },
  {
    key: "northern raccoon",
    label: "Northern Raccoon",
    group: "mammal",
  },
  { key: "striped skunk", label: "Striped Skunk", group: "mammal" },
  { key: "domestic dog", label: "Domestic Dog", group: "mammal" },
  { key: "small mammal", label: "Small Mammal", group: "mammal" },
  { key: "gray fox", label: "Gray Fox", group: "mammal" },
  { key: "other bird", label: "Other Bird", group: "bird" },
];

const SPECIES_MAP = {};
SPECIES.forEach((s) => {
  SPECIES_MAP[s.key] = s;
});

const GROUP_COLORS = {
  none: { bg: "rgba(100,116,139,0.15)", border: "#64748b", text: "#94a3b8" },
  mammal: { bg: "rgba(37,99,235,0.12)", border: "#3b82f6", text: "#60a5fa" },
  bird: { bg: "rgba(56,189,248,0.12)", border: "#38bdf8", text: "#7dd3fc" },
  herp: { bg: "rgba(45,212,191,0.12)", border: "#2dd4bf", text: "#5eead4" },
  invert: { bg: "rgba(167,139,250,0.12)", border: "#a78bfa", text: "#c4b5fd" },
};

const WS_COLORS = {
  disconnected: "#64748b",
  connecting: "#eab308",
  connected: "#3b82f6",
  error: "#ef4444",
};

const fmtConf = (v) => `${(v * 100).toFixed(1)}%`;
const $ = (id) => document.getElementById(id);

const dom = {
  ambientGlow: $("ambient-glow"),
  alertContainer: $("alert-container"),
  wsDot: $("ws-dot"),
  wsLabel: $("ws-label"),
  settingsBtn: $("settings-btn"),
  settingsDrawer: $("settings-drawer"),
  inputWsUrl: $("input-ws-url"),
  inputInterval: $("input-interval"),
  inputCamera: $("input-camera"),
  video: $("video"),
  canvas: $("canvas"),
  videoOverlay: $("video-overlay"),
  fpsDisplay: $("fps-display"),
  videoPredLabel: $("video-pred-label"),
  videoPredName: $("video-pred-name"),
  videoPredConf: $("video-pred-conf"),
  placeholder: $("placeholder"),
  btnStart: $("btn-start"),
  btnStop: $("btn-stop"),
  predCard: $("pred-card"),
  predName: $("pred-name"),
  confBarOuter: $("conf-bar-outer"),
  confBarInner: $("conf-bar-inner"),
  confLabel: $("conf-label"),
  alertGrid: $("alert-grid"),
};

let ws = null;
let stream = null;
let captureTimer = null;
let fpsTimer = null;
let frameCount = 0;
let isStreaming = false;
let alertCategories = SPECIES.filter((sp) => sp.key !== "empty").map((sp) => sp.key);
let currentPrediction = null;
let predictionHistory = [];
function setWsStatus(status) {
  if (dom.wsDot) {
    dom.wsDot.style.background = WS_COLORS[status] || WS_COLORS.disconnected;
  }

  if (dom.wsLabel) {
    dom.wsLabel.textContent = status;
  }
}

function updatePrediction(det) {
  predictionHistory.push(det.animal);
  if (predictionHistory.length > 6) predictionHistory.shift();

  const stableAnimal = [...predictionHistory]
    .sort(
      (a, b) =>
        predictionHistory.filter((v) => v === a).length -
        predictionHistory.filter((v) => v === b).length,
    )
    .pop();

  const meta = SPECIES_MAP[stableAnimal] || {
    label: stableAnimal,
    group: "none",
  };
  const gc = GROUP_COLORS[meta.group] || GROUP_COLORS.none;

  currentPrediction = { ...det, ...meta, gc };
  dom.predName.textContent = meta.label;
  dom.predName.className = "pred-name";
  dom.predName.style.color = gc.text;

  dom.confBarOuter.classList.remove("hidden");

  dom.confBarInner.style.width = `${det.confidence * 100}%`;
  dom.confBarInner.style.background = gc.border;

  dom.confLabel.classList.remove("hidden");
  dom.confLabel.textContent = `Confidence: ${fmtConf(det.confidence)}`;
  dom.predCard.style.borderColor = gc.border;

  if (stableAnimal !== "empty") {
    dom.videoPredLabel.classList.remove("hidden");
    dom.videoPredLabel.style.borderColor = gc.border;
    dom.videoPredLabel.style.background = gc.bg;
    dom.videoPredName.textContent = meta.label;
    dom.videoPredName.style.color = gc.text;
    dom.videoPredConf.textContent = fmtConf(det.confidence);

  } else {
    dom.videoPredLabel.classList.add("hidden");
  }

  updateAlertGrid(stableAnimal);
}

function clearPrediction() {
  currentPrediction = null;
  dom.predName.textContent = "Waiting for detection…";
  dom.predName.className = "pred-waiting";
  dom.predName.style.color = "";
  dom.confBarOuter.classList.add("hidden");
  dom.confLabel.classList.add("hidden");
  dom.predCard.style.borderColor = "";
  dom.videoPredLabel.classList.add("hidden");
  updateAlertGrid(null);
}

function buildAlertGrid() {
  dom.alertGrid.innerHTML = "";
  SPECIES.forEach((sp) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "species-chip";
    chip.dataset.key = sp.key;
    chip.innerHTML = `
  <span class="species-chip-name">${sp.label}</span>
  `;

    if (sp.key === "empty") {
      chip.disabled = true;
      chip.classList.add("species-chip--disabled");
    } else {
      chip.addEventListener("click", () => {
        toggleAlertCategory(sp.key);
      });
    }

    dom.alertGrid.appendChild(chip);
  });
  updateAlertGrid(null);
}

function updateAlertGrid(activeKey) {
  dom.alertGrid.querySelectorAll(".species-chip").forEach((chip) => {
    const key = chip.dataset.key;
    const sp = SPECIES_MAP[key];
    const isSelected = alertCategories.includes(key);
    const isActive = key === activeKey;

    chip.classList.toggle("species-chip--active", isActive);
    chip.classList.toggle("species-chip--selected", isSelected);
    chip.classList.toggle("species-chip--unselected", !isSelected && key !== "empty");

    if (key === "empty") {
      chip.style.background = "";
      chip.style.borderColor = "";
      chip.style.color = "";
    } else if (isSelected) {
      chip.style.background = "rgba(34, 197, 94, 0.16)";
      chip.style.borderColor = "#22c55e";
      chip.style.color = "#bbf7d0";
    } else {
      chip.style.background = "rgba(239, 68, 68, 0.14)";
      chip.style.borderColor = "#ef4444";
      chip.style.color = "#fecaca";
    }
  });
}

function toggleAlertCategory(key) {
  const idx = alertCategories.indexOf(key);
  if (idx >= 0) {
    alertCategories.splice(idx, 1);
  } else {
    alertCategories.push(key);
  }
  updateAlertGrid(currentPrediction?.animal ?? null);
  sendAlertCategories();
}

function sendAlertCategories() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ categories: alertCategories }));
  }
}
function showAlertToast(alertData) {
  const meta = SPECIES_MAP[alertData.animal];
  const toast = document.createElement("div");
  toast.className = "alert-toast";
  toast.innerHTML = `
  <span class="alert-toast-dot"></span>
  <div class="alert-toast-body">
  <span class="alert-toast-title">${alertData.animal.charAt(0).toUpperCase() + alertData.animal.slice(1)} detected</span>
  <span class="alert-toast-msg">${fmtConf(alertData.confidence)} confidence</span>
  </div>
  <button class="alert-toast-close">✕</button>
  `;

  const dismiss = () => {
    toast.classList.add("alert-toast--exiting");
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector(".alert-toast-close").addEventListener("click", dismiss);
  dom.alertContainer.prepend(toast);
  setTimeout(dismiss, 6000);
  while (dom.alertContainer.children.length > 5) {
    dom.alertContainer.removeChild(dom.alertContainer.lastChild);
  }
}
async function enumerateCameras() {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    tempStream.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === "videoinput");

    dom.inputCamera.innerHTML = "";
    videoInputs.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${d.deviceId.slice(0, 8)}`;
      dom.inputCamera.appendChild(opt);
    });
  } catch (err) {
    console.error("Camera access denied:", err);
  }
}

async function startCamera() {
  try {
    const deviceId = dom.inputCamera.value;
    const constraints = {
      video: deviceId
        ? {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    dom.video.srcObject = stream;
    await dom.video.play();
  } catch (err) {
    console.error("Camera error:", err);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  dom.video.srcObject = null;
}
function connectWs() {
  const url = dom.inputWsUrl.value;
  if (ws && ws.readyState <= 1) return;

  setWsStatus("connecting");

  ws = new WebSocket(url);

  ws.onopen = () => {
    setWsStatus("connected");
    if (alertCategories.length > 0) {
      ws.send(JSON.stringify({ categories: alertCategories }));
    }
  };

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      if (data.detection) {
        updatePrediction(data.detection);
        frameCount++;
      }

      if (data.alert) {
        showAlertToast(data.alert);
      }
    } catch (e) {
      console.error("Bad message:", e);
    }
  };

  ws.onerror = () => {
    setWsStatus("error");
  };

  ws.onclose = () => {
    setWsStatus("disconnected");
  };
}

function disconnectWs() {
  if (ws) {
    ws.close();
    ws = null;
  }
  setWsStatus("disconnected");
}
function startCapture() {
  const interval = parseInt(dom.inputInterval.value, 10) || 500;
  const ctx = dom.canvas.getContext("2d");

  frameCount = 0;
  fpsTimer = setInterval(() => {
    dom.fpsDisplay.textContent = `${frameCount} pred/s`;
    frameCount = 0;
  }, 1000);

  captureTimer = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (dom.video.readyState < 2) return;

    dom.canvas.width = dom.video.videoWidth;
    dom.canvas.height = dom.video.videoHeight;
    ctx.drawImage(dom.video, 0, 0);

    const dataUrl = dom.canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    ws.send(JSON.stringify({ image: base64 }));
  }, interval);
}

function stopCapture() {
  clearInterval(captureTimer);
  clearInterval(fpsTimer);
  captureTimer = null;
  fpsTimer = null;
  dom.fpsDisplay.textContent = "0 pred/s";
}
async function handleStart() {
  await startCamera();
  connectWs();
  startCapture();
  isStreaming = true;

  dom.btnStart.classList.add("hidden");
  dom.btnStop.classList.remove("hidden");
  dom.placeholder.classList.add("hidden");
  dom.videoOverlay.classList.remove("hidden");
}

function handleStop() {
  stopCapture();
  disconnectWs();
  stopCamera();
  isStreaming = false;

  dom.btnStop.classList.add("hidden");
  dom.btnStart.classList.remove("hidden");
  dom.placeholder.classList.remove("hidden");
  dom.videoOverlay.classList.add("hidden");

  clearPrediction();
}
dom.btnStart.addEventListener("click", handleStart);
dom.btnStop.addEventListener("click", handleStop);

dom.settingsBtn.addEventListener("click", () => {
  dom.settingsDrawer.classList.toggle("hidden");
});

buildAlertGrid();
enumerateCameras();
