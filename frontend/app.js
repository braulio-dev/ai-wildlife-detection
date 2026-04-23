const SPECIES = [
  { key: "empty", label: "Empty", group: "none" },
  { key: "coyote", label: "Coyote", group: "mammal" },
  {
    key: "reptile or amphibian",
    label: "Reptile / Amphibian",
    group: "herp",
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
  { key: "human", label: "Human", group: "human" },
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
  human: { bg: "rgba(251,146,60,0.12)", border: "#fb923c", text: "#fdba74" },
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
  speciesCount: $("species-count"),
  speciesGrid: $("species-grid"),
  dropdown: $("dropdown"),
  dropdownTrigger: $("dropdown-trigger"),
  dropdownText: $("dropdown-trigger-text"),
  dropdownArrow: $("dropdown-arrow"),
  dropdownTags: $("dropdown-tags"),
  dropdownMenu: $("dropdown-menu"),
  logScroll: $("log-scroll"),
};
let ws = null;
let stream = null;
let captureTimer = null;
let fpsTimer = null;
let frameCount = 0;
let isStreaming = false;
let alertCategories = [];
let dropdownOpen = false;
let currentPrediction = null;
function addLog(type, msg) {
  const logScroll = dom.logScroll;
  const empty = logScroll.querySelector(".log-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "log-row";
  row.innerHTML = `
  <span class="log-dot log-dot--${type}"></span>
  <span class="log-time">${new Date().toLocaleTimeString()}</span>
  <span class="log-msg">${msg}</span>
  `;
  logScroll.prepend(row);
  while (logScroll.children.length > 60) {
    logScroll.removeChild(logScroll.lastChild);
  }
}
function setWsStatus(status) {
  dom.wsDot.style.background = WS_COLORS[status] || WS_COLORS.disconnected;
  dom.wsLabel.textContent = status;
}
function updatePrediction(det) {
  const meta = SPECIES_MAP[det.animal] || {
    label: det.animal,
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
  if (det.animal !== "empty") {
    dom.videoPredLabel.classList.remove("hidden");
    dom.videoPredLabel.style.borderColor = gc.border;
    dom.videoPredLabel.style.background = gc.bg;
    dom.videoPredName.textContent = meta.label;
    dom.videoPredName.style.color = gc.text;
    dom.videoPredConf.textContent = fmtConf(det.confidence);
  } else {
    dom.videoPredLabel.classList.add("hidden");
  }
  if (det.animal !== "empty") {
    dom.ambientGlow.style.background = `radial-gradient(ellipse at 50% 30%, ${gc.border}18 0%, transparent 70%)`;
  } else {
    dom.ambientGlow.style.background = "none";
  }
  updateSpeciesHighlight(det.animal);
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
  dom.ambientGlow.style.background = "none";
  updateSpeciesHighlight(null);
}
function buildSpeciesGrid() {
  dom.speciesCount.textContent = SPECIES.length;
  dom.speciesGrid.innerHTML = "";
  SPECIES.forEach((sp) => {
    const chip = document.createElement("div");
    chip.className = "species-chip";
    chip.dataset.key = sp.key;
    chip.innerHTML = `
  <span class="species-chip-name">${sp.label}</span>
  `;
    dom.speciesGrid.appendChild(chip);
  });
}

function updateSpeciesHighlight(activeKey) {
  dom.speciesGrid.querySelectorAll(".species-chip").forEach((chip) => {
    const key = chip.dataset.key;
    const sp = SPECIES_MAP[key];
    const gc = GROUP_COLORS[sp.group];
    if (key === activeKey) {
      chip.classList.add("species-chip--active");
      chip.style.background = gc.bg;
      chip.style.borderColor = gc.border;
    } else {
      chip.classList.remove("species-chip--active");
      chip.style.background = "";
      chip.style.borderColor = "";
    }
  });
}
function buildDropdownMenu() {
  dom.dropdownMenu.innerHTML = "";
  SPECIES.filter((sp) => sp.key !== "empty").forEach((sp) => {
    const opt = document.createElement("div");
    opt.className = "dropdown-option";
    opt.dataset.key = sp.key;
    opt.innerHTML = `
  <div class="dropdown-check"></div>
  <span class="dropdown-option-label">${sp.label}</span>
  `;
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAlertCategory(sp.key);
    });
    dom.dropdownMenu.appendChild(opt);
  });
  syncDropdownUI();
}

function toggleDropdown() {
  dropdownOpen = !dropdownOpen;
  dom.dropdownMenu.classList.toggle("hidden", !dropdownOpen);
  dom.dropdownArrow.classList.toggle("dropdown-arrow--open", dropdownOpen);
}

function closeDropdown() {
  dropdownOpen = false;
  dom.dropdownMenu.classList.add("hidden");
  dom.dropdownArrow.classList.remove("dropdown-arrow--open");
}

function toggleAlertCategory(key) {
  const idx = alertCategories.indexOf(key);
  if (idx >= 0) {
    alertCategories.splice(idx, 1);
  } else {
    alertCategories.push(key);
  }
  syncDropdownUI();
  sendAlertCategories();
}

function syncDropdownUI() {
  dom.dropdownText.textContent =
    alertCategories.length === 0
      ? "Select species…"
      : `${alertCategories.length} species selected`;
  dom.dropdownTags.innerHTML = "";
  alertCategories.forEach((key) => {
    const sp = SPECIES_MAP[key];
    const tag = document.createElement("span");
    tag.className = "dropdown-tag";
    tag.innerHTML = `
  <span>${sp.label}</span>
  <button class="dropdown-tag-remove">✕</button>
  `;
    tag.querySelector(".dropdown-tag-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAlertCategory(key);
    });
    dom.dropdownTags.appendChild(tag);
  });
  dom.dropdownMenu.querySelectorAll(".dropdown-option").forEach((opt) => {
    const key = opt.dataset.key;
    const check = opt.querySelector(".dropdown-check");
    const selected = alertCategories.includes(key);
    opt.classList.toggle("dropdown-option--selected", selected);
    check.classList.toggle("dropdown-check--active", selected);
    check.textContent = selected ? "✓" : "";
  });
}

function sendAlertCategories() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ categories: alertCategories }));
    addLog(
      "info",
      `Alert categories: ${alertCategories.length > 0 ? alertCategories.join(", ") : "none"}`,
    );
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
    addLog("error", `Camera access denied: ${err.message}`);
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
    addLog("success", "Camera started");
  } catch (err) {
    addLog("error", `Camera error: ${err.message}`);
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
  addLog("info", `Connecting to ${url}…`);

  ws = new WebSocket(url);

  ws.onopen = () => {
    setWsStatus("connected");
    addLog("success", "WebSocket connected");
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
        addLog("alert", data.alert.message);
      }
    } catch (e) {
      addLog("error", `Bad message: ${e.message}`);
    }
  };

  ws.onerror = () => {
    setWsStatus("error");
    addLog("error", "WebSocket error");
  };

  ws.onclose = () => {
    setWsStatus("disconnected");
    addLog("info", "WebSocket closed");
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

    dom.canvas.width = 288;
    dom.canvas.height = 288;
    ctx.drawImage(dom.video, 0, 0, 288, 288);

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

  addLog("info", "Detection started");
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
  addLog("info", "Detection stopped");
}
dom.btnStart.addEventListener("click", handleStart);
dom.btnStop.addEventListener("click", handleStop);

dom.settingsBtn.addEventListener("click", () => {
  dom.settingsDrawer.classList.toggle("hidden");
});

dom.dropdownTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDropdown();
});

document.addEventListener("click", (e) => {
  if (!dom.dropdown.contains(e.target)) {
    closeDropdown();
  }
});
buildSpeciesGrid();
buildDropdownMenu();
enumerateCameras();
