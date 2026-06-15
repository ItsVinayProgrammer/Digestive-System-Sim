import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { GLTFLoader } from "three/addons/GLTFLoader.js";

const MODEL_URL = encodeURI(
  "./Digestive system- stomach, liver, gall bladder, pancreas, small and large intestine .glb",
);

const organInfo = {
  liver: {
    name: "Liver",
    kicker: "Largest gland",
    aliases: ["liver", "leaver", "leaver003"],
    audioSrc: "./assets/audio/liver.wav",
    description: "Largest gland. Secretes bile juice for the emulsification of fats.",
    facts: ["Largest gland.", "Secretes bile juice for the emulsification of fats."],
    glassCapable: true,
  },
  gallbladder: {
    name: "Gallbladder",
    kicker: "Bile storage sac",
    aliases: ["gallbladder", "gall bladder", "gallbladder002", "gallbladder"],
    audioSrc: "./assets/audio/gallbladder.wav",
    description: "Stores bile juice temporarily.",
    facts: ["Stores bile juice temporarily."],
    glassCapable: false,
  },
  stomach: {
    name: "Stomach",
    kicker: "Muscular digestive chamber",
    aliases: ["stomach"],
    audioSrc: "./assets/audio/stomach.wav",
    description:
      "Muscular wall churns food. Secretes gastric juice (hydrochloric acid, pepsin, mucus) to digest proteins.",
    facts: [
      "Muscular wall churns food.",
      "Secretes gastric juice (hydrochloric acid, pepsin, mucus) to digest proteins.",
    ],
    glassCapable: true,
  },
  pancreas: {
    name: "Pancreas",
    kicker: "Digestive gland",
    aliases: ["pancreas", "pancrease"],
    audioSrc: "./assets/audio/pancreas.wav",
    description:
      "Secretes pancreatic juice containing enzymes for the complete digestion of carbohydrates, proteins, and fats.",
    facts: [
      "Secretes pancreatic juice containing enzymes for the complete digestion of carbohydrates, proteins, and fats.",
    ],
    glassCapable: false,
  },
  smallIntestine: {
    name: "Small intestine",
    kicker: "Complete digestion and absorption",
    aliases: ["smallintestine", "small008", "small009"],
    audioSrc: "./assets/audio/smallIntestine.wav",
    description:
      "Site of complete digestion. Villi increase surface area for maximum absorption of nutrients into the blood.",
    facts: [
      "Site of complete digestion.",
      "Villi increase surface area for maximum absorption of nutrients into the blood.",
    ],
    glassCapable: false,
  },
  largeIntestine: {
    name: "Large intestine",
    kicker: "Water absorption",
    aliases: ["largeintestine", "largeinterstain003"],
    audioSrc: "./assets/audio/largeIntestine.wav",
    description: "Absorbs excess water from undigested food and forms solid waste.",
    facts: ["Absorbs excess water from undigested food.", "Forms solid waste."],
    glassCapable: false,
  },
  esophagus: {
    name: "Esophagus",
    kicker: "Food transport tube",
    aliases: ["esophagus", "beziercurve"],
    description: "Moves food from the mouth to the stomach.",
    facts: ["Moves food from the pharynx to the stomach by peristalsis."],
    glassCapable: false,
  },
};

const quizQuestions = [
  {
    prompt: "Click the organ that stores bile juice temporarily.",
    answer: "gallbladder",
  },
  {
    prompt: "Click the organ that churns food and secretes gastric juice.",
    answer: "stomach",
  },
  {
    prompt: "Click the largest gland that secretes bile juice.",
    answer: "liver",
  },
  {
    prompt: "Click the organ that secretes pancreatic juice.",
    answer: "pancreas",
  },
  {
    prompt: "Click the organ where complete digestion happens and villi absorb nutrients.",
    answer: "smallIntestine",
  },
  {
    prompt: "Click the organ that absorbs excess water and forms solid waste.",
    answer: "largeIntestine",
  },
];

const playableOrganIds = [
  "liver",
  "gallbladder",
  "stomach",
  "pancreas",
  "smallIntestine",
  "largeIntestine",
];

const canvas = document.querySelector("#scene-canvas");
const leaderLayer = document.querySelector("#leader-layer");
const leaderLine = document.querySelector("#leader-line");
const leaderDot = document.querySelector("#leader-dot");
const loadingState = document.querySelector("#loading-state");
const errorBanner = document.querySelector("#error-banner");
const sidePanel = document.querySelector("#side-panel");
const collapsePanel = document.querySelector("#collapse-panel");
const quizToggle = document.querySelector("#quiz-toggle");
const labelGameToggle = document.querySelector("#label-game-toggle");
const xrayToggle = document.querySelector("#xray-toggle");
const resetViewButton = document.querySelector("#reset-view");
const activeOrgan = document.querySelector("#active-organ");
const xrayState = document.querySelector("#xray-state");
const organButtons = [...document.querySelectorAll("[data-organ]")];
const speakButtons = [...document.querySelectorAll("[data-speak-organ]")];
const organLabel = document.querySelector("#organ-label");
const labelKicker = document.querySelector("#label-kicker");
const labelTitle = document.querySelector("#label-title");
const labelSpeak = document.querySelector("#label-speak");
const labelFacts = document.querySelector("#label-facts");
const quizPanel = document.querySelector("#quiz-panel");
const quizCount = document.querySelector("#quiz-count");
const quizScore = document.querySelector("#quiz-score");
const quizQuestion = document.querySelector("#quiz-question");
const quizFeedback = document.querySelector("#quiz-feedback");
const restartQuiz = document.querySelector("#restart-quiz");
const exitQuiz = document.querySelector("#exit-quiz");
const scorecard = document.querySelector("#scorecard");
const scorecardTitle = document.querySelector("#scorecard-title");
const scorecardMessage = document.querySelector("#scorecard-message");
const retryQuiz = document.querySelector("#retry-quiz");
const closeScorecard = document.querySelector("#close-scorecard");
const labelGamePanel = document.querySelector("#label-game-panel");
const labelGameStatus = document.querySelector("#label-game-status");
const tagTray = document.querySelector("#tag-tray");
const resetLabelGame = document.querySelector("#reset-label-game");
const placedLabelLayer = document.querySelector("#placed-label-layer");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d0c);
scene.fog = new THREE.Fog(0x090d0c, 12, 42);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 200);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.06;
controls.maxPolarAngle = Math.PI - 0.06;

const hemiLight = new THREE.HemisphereLight(0xb9fff4, 0x2e1c16, 1.28);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x78e8d8, 1.2);
rimLight.position.set(-5, 2, -4);
scene.add(rimLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const organGroups = new Map();
const glassOrgans = new Set();
const feedbackTimers = new Map();
const labelGameState = new Map();
const viewHome = {
  position: new THREE.Vector3(0, 0, 8),
  target: new THREE.Vector3(),
};

let modelRoot = null;
let modelCenter = new THREE.Vector3();
let modelRadius = 2;
let hoveredOrgan = null;
let selectedOrgan = null;
let quizActive = false;
let quizIndex = 0;
let score = 0;
let quizLocked = false;
let roundComplete = false;
let labelGameActive = false;
let activeDrag = null;
let lastLabelGameFeedback = "";
let currentAudio = null;
let currentSpeechUtterance = null;
let audioSequence = 0;
let lastAudioMode = "";
let lastAudioError = "";

window.__SIM_READY__ = false;
window.__SIM_ERROR__ = null;
window.__SIM_API__ = null;
window.__SIM_LAST_SPOKEN__ = "";

const normalAlias = new Map();
for (const [id, info] of Object.entries(organInfo)) {
  for (const alias of info.aliases) {
    normalAlias.set(normalizeName(alias), id);
  }
}

function normalizeName(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function identifyOrgan(value = "") {
  return normalAlias.get(normalizeName(value)) ?? null;
}

function getSpeechText(id) {
  const info = organInfo[id];
  return info ? `${info.name}. ${info.description}` : "";
}

async function speakOrgan(id) {
  const info = organInfo[id];
  const text = getSpeechText(id);
  if (!info || !text) {
    return false;
  }

  stopCurrentAudio();
  window.__SIM_LAST_SPOKEN__ = text;
  lastAudioMode = "starting";
  lastAudioError = "";

  const token = audioSequence;
  const audioSource = await resolveAudioSource(id, text);
  if (audioSource) {
    try {
      await playHtmlAudio(audioSource, token);
      lastAudioMode = "html5";
      return true;
    } catch (error) {
      lastAudioError = `HTML5 audio failed: ${error.message}`;
    }
  }

  try {
    await playSpeechFallback(text, token);
    lastAudioMode = "speech";
    return true;
  } catch (error) {
    lastAudioMode = "failed";
    lastAudioError = `Speech fallback failed: ${error.message}`;
    return false;
  }
}

function stopCurrentAudio() {
  audioSequence += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentSpeechUtterance = null;
}

async function resolveAudioSource(id, text) {
  const info = organInfo[id];
  const provider = window.DigestiveAudioProvider;

  if (provider && typeof provider.getTrack === "function") {
    try {
      const provided = await provider.getTrack({ id, text, organ: info });
      if (typeof provided === "string") {
        return provided;
      }
      if (provided?.url) {
        return provided.url;
      }
      if (provided instanceof HTMLAudioElement) {
        return provided.currentSrc || provided.src;
      }
    } catch (error) {
      lastAudioError = `External audio provider failed: ${error.message}`;
    }
  }

  return info.audioSrc;
}

function playHtmlAudio(src, token) {
  return new Promise((resolve, reject) => {
    if (token !== audioSequence) {
      reject(new Error("Audio request was replaced."));
      return;
    }

    const audio = new Audio(src);
    let settled = false;
    currentAudio = audio;
    audio.preload = "auto";

    const settle = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      callback(value);
    };

    audio.addEventListener(
      "playing",
      () => {
        settle(resolve, true);
      },
      { once: true },
    );
    audio.addEventListener(
      "ended",
      () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        settle(reject, new Error("Audio asset could not be loaded."));
      },
      { once: true },
    );

    const playPromise = audio.play();
    if (playPromise?.then) {
      playPromise.then(() => settle(resolve, true)).catch((error) => settle(reject, error));
    } else {
      window.setTimeout(() => settle(resolve, true), 0);
    }
  });
}

function playSpeechFallback(text, token) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      reject(new Error("Speech synthesis is unavailable."));
      return;
    }
    if (token !== audioSequence) {
      reject(new Error("Speech request was replaced."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    currentSpeechUtterance = utterance;
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const settle = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      callback(value);
    };

    utterance.onstart = () => settle(resolve, true);
    utterance.onerror = (event) => settle(reject, new Error(event.error || "Speech failed."));
    utterance.onend = () => {
      if (currentSpeechUtterance === utterance) {
        currentSpeechUtterance = null;
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    window.setTimeout(() => {
      if (!settled && window.speechSynthesis.speaking) {
        settle(resolve, true);
      } else if (!settled) {
        reject(new Error("Speech did not start."));
      }
    }, 900);
  });
}

function ensureGroup(id) {
  if (!organGroups.has(id)) {
    organGroups.set(id, {
      id,
      meshes: [],
      root: null,
      anchor: new THREE.Vector3(),
      feedback: null,
    });
  }
  return organGroups.get(id);
}

function cloneMaterials(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const clones = materials.map((material) => material.clone());
  mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
  mesh.userData.materialBases = clones.map((material) => ({
    color: material.color?.clone() ?? new THREE.Color(0xffffff),
    emissive: material.emissive?.clone() ?? null,
    emissiveIntensity: material.emissiveIntensity ?? 0,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    side: material.side,
    roughness: material.roughness,
    metalness: material.metalness,
  }));
}

function assignMeshToOrgan(mesh, id) {
  const group = ensureGroup(id);
  if (!group.meshes.includes(mesh)) {
    mesh.userData.organId = id;
    cloneMaterials(mesh);
    group.meshes.push(mesh);
  }
}

function assignOrgans(root) {
  root.traverse((node) => {
    const id = identifyOrgan(node.name);
    if (!id) {
      return;
    }

    const group = ensureGroup(id);
    group.root = node;
    node.traverse((child) => {
      if (child.isMesh) {
        assignMeshToOrgan(child, id);
      }
    });
  });

  root.traverse((node) => {
    if (!node.isMesh || node.userData.organId) {
      return;
    }

    const materialNames = Array.isArray(node.material)
      ? node.material.map((material) => material.name).join(" ")
      : node.material?.name;
    const id = identifyOrgan(`${node.name} ${materialNames ?? ""}`);
    if (id) {
      assignMeshToOrgan(node, id);
    }
  });
}

function cacheOrganAnchors() {
  for (const group of organGroups.values()) {
    const box = new THREE.Box3();
    for (const mesh of group.meshes) {
      box.expandByObject(mesh);
    }

    if (!box.isEmpty()) {
      box.getCenter(group.anchor);
    }
  }
}

function fitCameraToModel() {
  const box = new THREE.Box3().setFromObject(modelRoot);
  box.getCenter(modelCenter);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  modelRadius = Math.max(sphere.radius, 0.8);

  const distance = modelRadius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const startPosition = new THREE.Vector3(
    modelCenter.x + modelRadius * 0.42,
    modelCenter.y + modelRadius * 0.08,
    modelCenter.z + distance * 0.9,
  );

  camera.near = Math.max(0.01, modelRadius / 120);
  camera.far = modelRadius * 70;
  camera.position.copy(startPosition);
  camera.updateProjectionMatrix();

  controls.target.copy(modelCenter);
  controls.minDistance = modelRadius * 1.18;
  controls.maxDistance = modelRadius * 6.2;
  controls.update();

  viewHome.position.copy(camera.position);
  viewHome.target.copy(controls.target);

}

function clampOrbitTarget() {
  const offset = controls.target.clone().sub(modelCenter);
  const limit = modelRadius * 0.42;
  if (offset.length() <= limit) {
    return;
  }

  const nextTarget = modelCenter.clone().add(offset.setLength(limit));
  const delta = nextTarget.clone().sub(controls.target);
  controls.target.copy(nextTarget);
  camera.position.add(delta);
}

function getMaterialList(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function applyOrganVisuals(id) {
  const group = organGroups.get(id);
  if (!group) {
    return;
  }

  const isGlass = glassOrgans.has(id);
  const isHovered = hoveredOrgan === id;
  const isSelected = selectedOrgan === id;
  const feedback = group.feedback;

  for (const mesh of group.meshes) {
    getMaterialList(mesh).forEach((material, index) => {
      const base = mesh.userData.materialBases[index];
      material.color.copy(base.color);
      material.opacity = base.opacity;
      material.transparent = base.transparent;
      material.depthWrite = base.depthWrite;
      material.side = base.side;

      if (typeof base.roughness === "number") {
        material.roughness = base.roughness;
      }
      if (typeof base.metalness === "number") {
        material.metalness = base.metalness;
      }
      if (material.emissive && base.emissive) {
        material.emissive.copy(base.emissive);
        material.emissiveIntensity = base.emissiveIntensity;
      }

      if (isGlass) {
        material.transparent = true;
        material.opacity = 0.26;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
        material.color.lerp(new THREE.Color(0x9ff5ef), 0.24);
        if (typeof material.roughness === "number") {
          material.roughness = 0.18;
        }
        if (typeof material.metalness === "number") {
          material.metalness = 0.02;
        }
      }

      let glow = null;
      if (feedback === "correct") {
        glow = new THREE.Color(0x5af38a);
      } else if (feedback === "incorrect") {
        glow = new THREE.Color(0xff6f79);
      } else if (isSelected) {
        glow = new THREE.Color(0x56d6c5);
      } else if (isHovered) {
        glow = new THREE.Color(0xf2b84b);
      }

      if (glow) {
        if (material.emissive) {
          material.emissive.copy(glow);
          material.emissiveIntensity = feedback ? 0.78 : 0.42;
        } else {
          material.color.lerp(glow, feedback ? 0.4 : 0.22);
        }
      }

      material.needsUpdate = true;
    });
    mesh.renderOrder = isGlass ? 2 : 0;
  }
}

function refreshAllVisuals() {
  for (const id of organGroups.keys()) {
    applyOrganVisuals(id);
  }
  updatePanelState();
}

function setGlass(id, enabled) {
  const info = organInfo[id];
  if (!info?.glassCapable) {
    return;
  }

  if (enabled) {
    glassOrgans.add(id);
  } else {
    glassOrgans.delete(id);
  }
  applyOrganVisuals(id);
  updatePanelState();
}

function toggleXray() {
  const shouldEnable = !(glassOrgans.has("liver") && glassOrgans.has("stomach"));
  setGlass("liver", shouldEnable);
  setGlass("stomach", shouldEnable);
}

function setHoveredOrgan(id) {
  if (hoveredOrgan === id) {
    return;
  }
  const previous = hoveredOrgan;
  hoveredOrgan = id;
  if (previous) {
    applyOrganVisuals(previous);
  }
  if (hoveredOrgan) {
    applyOrganVisuals(hoveredOrgan);
  }
  canvas.style.cursor = hoveredOrgan ? "pointer" : "grab";
}

function setSelectedOrgan(id, { fromMenu = false } = {}) {
  const previous = selectedOrgan;
  selectedOrgan = id;

  if (previous) {
    applyOrganVisuals(previous);
  }
  if (selectedOrgan) {
    applyOrganVisuals(selectedOrgan);
  }

  if (id && organInfo[id]?.glassCapable && !fromMenu) {
    setGlass(id, !glassOrgans.has(id));
  }

  updateLabelContent();
  updatePanelState();
  collapsePanelForMobile();
}

function collapsePanelForMobile() {
  if (window.innerWidth > 760 || sidePanel.classList.contains("collapsed")) {
    return;
  }

  sidePanel.classList.add("collapsed");
  syncPanelToggleLabel();
}

function syncPanelToggleLabel() {
  collapsePanel.setAttribute(
    "aria-label",
    sidePanel.classList.contains("collapsed") ? "Open menu" : "Collapse panel",
  );
}

function clearAllTransparency() {
  const changed = [...glassOrgans];
  glassOrgans.clear();
  changed.forEach((id) => applyOrganVisuals(id));
  updatePanelState();
}

function dismissActiveLabel({ resetTransparency = false } = {}) {
  const previous = selectedOrgan;
  selectedOrgan = null;
  organLabel.hidden = true;
  leaderLayer.style.display = "none";
  leaderLayer.style.opacity = "0";

  if (previous) {
    applyOrganVisuals(previous);
  }
  if (resetTransparency) {
    clearAllTransparency();
  }

  updatePanelState();
}

function updateLabelContent() {
  if (!selectedOrgan || quizActive || labelGameActive) {
    organLabel.hidden = true;
    leaderLayer.style.display = "none";
    return;
  }

  const info = organInfo[selectedOrgan];
  labelKicker.textContent = info.kicker;
  labelTitle.textContent = info.name;
  labelSpeak.dataset.speakOrgan = selectedOrgan;
  labelSpeak.setAttribute("aria-label", `Listen to ${info.name}`);
  labelFacts.replaceChildren(
    ...info.facts.map((fact) => {
      const item = document.createElement("li");
      item.textContent = fact;
      return item;
    }),
  );
  organLabel.hidden = false;
  leaderLayer.style.display = "block";
  updateLeaderLine();
}

function updateLeaderLine() {
  if (!selectedOrgan || organLabel.hidden) {
    return;
  }

  const group = organGroups.get(selectedOrgan);
  if (!group) {
    return;
  }

  const projected = group.anchor.clone().project(camera);
  const behindCamera = projected.z < -1 || projected.z > 1;
  if (behindCamera) {
    leaderLayer.style.opacity = "0";
    return;
  }

  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  const labelRect = organLabel.getBoundingClientRect();
  const gap = 28;

  let left = x < window.innerWidth * 0.54 ? x + gap : x - labelRect.width - gap;
  let top = y - labelRect.height * 0.5;
  let edgeX;
  let edgeY;

  if (window.innerWidth <= 760) {
    left = 10;
    top = Math.max(10, window.innerHeight - labelRect.height - 10);
    edgeX = THREE.MathUtils.clamp(x, left + 28, left + labelRect.width - 28);
    edgeY = top;
  } else {
    const rightReserve = sidePanel.classList.contains("collapsed") ? 88 : 342;
    const maxLeft = window.innerWidth - rightReserve - labelRect.width;
    left = THREE.MathUtils.clamp(left, 16, Math.max(16, maxLeft));
    top = THREE.MathUtils.clamp(top, 16, window.innerHeight - labelRect.height - 16);
    edgeX = left > x ? left : left + labelRect.width;
    edgeY = top + labelRect.height * 0.46;
  }

  organLabel.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;

  leaderLine.setAttribute("x1", x.toFixed(1));
  leaderLine.setAttribute("y1", y.toFixed(1));
  leaderLine.setAttribute("x2", edgeX.toFixed(1));
  leaderLine.setAttribute("y2", edgeY.toFixed(1));
  leaderDot.setAttribute("cx", x.toFixed(1));
  leaderDot.setAttribute("cy", y.toFixed(1));
  leaderLayer.style.opacity = "1";
}

function updatePanelState() {
  const info = selectedOrgan ? organInfo[selectedOrgan] : null;
  activeOrgan.textContent = info ? info.name : "No organ selected";

  const hasXray = glassOrgans.has("liver") || glassOrgans.has("stomach");
  xrayState.textContent = hasXray ? "X-Ray active" : "Solid view";
  xrayToggle.setAttribute("aria-pressed", String(glassOrgans.has("liver") && glassOrgans.has("stomach")));
  quizToggle.setAttribute("aria-pressed", String(quizActive));
  labelGameToggle.setAttribute("aria-pressed", String(labelGameActive));

  organButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.organ === selectedOrgan);
  });
}

function setPointerFromEvent(event) {
  setPointerFromClient(event.clientX, event.clientY);
}

function setPointerFromClient(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
}

function getIntersectedOrganIdsAt(clientX, clientY) {
  if (!modelRoot) {
    return [];
  }

  setPointerFromClient(clientX, clientY);
  raycaster.setFromCamera(pointer, camera);
  const meshes = [...organGroups.values()].flatMap((group) => group.meshes);
  const intersections = raycaster.intersectObjects(meshes, false);
  return intersections
    .map((hit) => hit.object.userData.organId)
    .filter((id, index, ids) => id && ids.indexOf(id) === index);
}

function getOrganScreenPoint(id) {
  const group = organGroups.get(id);
  if (!group) {
    return null;
  }

  const projected = group.anchor.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * window.innerWidth,
    y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    z: projected.z,
  };
}

function isPointNearOrganAnchor(id, clientX, clientY) {
  const point = getOrganScreenPoint(id);
  if (!point || point.z < -1 || point.z > 1) {
    return false;
  }

  const threshold = window.innerWidth <= 760 ? 78 : 92;
  return Math.hypot(clientX - point.x, clientY - point.y) <= threshold;
}

function findIntersectedOrgan(event) {
  if (!modelRoot) {
    return null;
  }

  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const meshes = [...organGroups.values()].flatMap((group) => group.meshes);
  const intersections = raycaster.intersectObjects(meshes, false);
  const hitIds = intersections
    .map((hit) => hit.object.userData.organId)
    .filter((id, index, ids) => id && ids.indexOf(id) === index);

  if (quizActive && !roundComplete) {
    const answer = quizQuestions[quizIndex]?.answer;
    if (
      answer &&
      (hitIds.includes(answer) || isPointNearOrganAnchor(answer, event.clientX, event.clientY))
    ) {
      return answer;
    }
  }

  const clickThroughHit = intersections.find((hit) => {
    const id = hit.object.userData.organId;
    return id && !glassOrgans.has(id);
  });
  return (
    clickThroughHit?.object.userData.organId ??
    intersections.find((hit) => hit.object.userData.organId)?.object.userData.organId ??
    null
  );
}

function flashOrgan(id, state, duration = 850) {
  const group = organGroups.get(id);
  if (!group) {
    return;
  }

  clearTimeout(feedbackTimers.get(id));
  group.feedback = state;
  applyOrganVisuals(id);
  feedbackTimers.set(
    id,
    window.setTimeout(() => {
      group.feedback = null;
      applyOrganVisuals(id);
    }, duration),
  );
}

function getPlacedLabelIds() {
  return [...labelGameState.entries()].filter(([, state]) => state.placed).map(([id]) => id);
}

function updateLabelGameStatus(message = "") {
  const placedCount = getPlacedLabelIds().length;
  const fallback =
    placedCount === playableOrganIds.length
      ? "All labels are correctly placed."
      : `${placedCount}/${playableOrganIds.length} labels placed.`;
  labelGameStatus.textContent = message || fallback;
  lastLabelGameFeedback = labelGameStatus.textContent;
}

function createLabelTag(id) {
  const tag = document.createElement("button");
  tag.type = "button";
  tag.className = "drag-tag";
  tag.dataset.labelOrgan = id;
  tag.textContent = organInfo[id].name;
  tag.addEventListener("pointerdown", startTagDrag);
  return tag;
}

function buildLabelGameTags() {
  tagTray.replaceChildren();
  placedLabelLayer.replaceChildren();
  labelGameState.clear();

  for (const id of playableOrganIds) {
    const tag = createLabelTag(id);
    labelGameState.set(id, {
      placed: false,
      element: tag,
    });
    tagTray.append(tag);
  }

  updateLabelGameStatus("Drag each tag onto the matching organ.");
}

function startLabelGame() {
  if (labelGameActive) {
    return;
  }

  if (quizActive) {
    stopQuiz();
  }

  hideScorecard();
  labelGameActive = true;
  selectedOrgan = null;
  organLabel.hidden = true;
  leaderLayer.style.display = "none";
  labelGamePanel.hidden = false;
  buildLabelGameTags();
  setGlass("liver", true);
  setGlass("stomach", true);
  refreshAllVisuals();
}

function stopLabelGame() {
  if (!labelGameActive) {
    return;
  }

  cleanupActiveDrag();
  labelGameActive = false;
  labelGamePanel.hidden = true;
  placedLabelLayer.replaceChildren();
  tagTray.replaceChildren();
  labelGameState.clear();
  lastLabelGameFeedback = "";
  refreshAllVisuals();
  updateLabelContent();
}

function resetLabelGameRound() {
  if (!labelGameActive) {
    startLabelGame();
    return;
  }

  cleanupActiveDrag();
  buildLabelGameTags();
  refreshAllVisuals();
}

function startTagDrag(event) {
  if (!labelGameActive) {
    return;
  }

  const tag = event.currentTarget;
  const organId = tag.dataset.labelOrgan;
  const state = labelGameState.get(organId);
  if (!organId || state?.placed) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const rect = tag.getBoundingClientRect();
  activeDrag = {
    element: tag,
    organId,
    pointerId: event.pointerId,
    homeParent: tag.parentElement,
    homeNext: tag.nextSibling,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  tag.classList.remove("is-wrong");
  tag.classList.add("is-dragging");
  tag.style.width = `${rect.width}px`;
  tag.style.height = `${rect.height}px`;
  document.body.append(tag);
  moveDraggedTag(event);
  tag.setPointerCapture(event.pointerId);
  tag.addEventListener("pointermove", moveDraggedTag);
  tag.addEventListener("pointerup", finishTagDrag);
  tag.addEventListener("pointercancel", cancelTagDrag);
}

function moveDraggedTag(event) {
  if (!activeDrag) {
    return;
  }

  const { element, offsetX, offsetY } = activeDrag;
  element.style.left = `${event.clientX - offsetX}px`;
  element.style.top = `${event.clientY - offsetY}px`;
}

function finishTagDrag(event) {
  if (!activeDrag) {
    return;
  }

  const drag = activeDrag;
  removeDragListeners(drag);
  const drop = evaluateLabelDrop(drag.organId, event.clientX, event.clientY);
  activeDrag = null;

  if (drop.correct) {
    placeLabel(drag.organId, drag.element);
    return;
  }

  const wrongTarget = drop.hitIds.find((id) => id !== drag.organId);
  if (wrongTarget) {
    flashOrgan(wrongTarget, "incorrect", 700);
  }
  returnTagToTray(drag, true);
  updateLabelGameStatus(`Try again: ${organInfo[drag.organId].name} belongs on its own organ.`);
}

function cancelTagDrag() {
  if (!activeDrag) {
    return;
  }

  const drag = activeDrag;
  removeDragListeners(drag);
  activeDrag = null;
  returnTagToTray(drag, false);
}

function cleanupActiveDrag() {
  if (!activeDrag) {
    return;
  }

  const drag = activeDrag;
  removeDragListeners(drag);
  activeDrag = null;
  returnTagToTray(drag, false);
}

function removeDragListeners(drag) {
  const { element, pointerId } = drag;
  try {
    element.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }
  element.removeEventListener("pointermove", moveDraggedTag);
  element.removeEventListener("pointerup", finishTagDrag);
  element.removeEventListener("pointercancel", cancelTagDrag);
}

function evaluateLabelDrop(expectedId, clientX, clientY) {
  const hitIds = getIntersectedOrganIdsAt(clientX, clientY);
  const targetPoint = getOrganScreenPoint(expectedId);
  const anchorDistance = targetPoint
    ? Math.hypot(clientX - targetPoint.x, clientY - targetPoint.y)
    : Number.POSITIVE_INFINITY;
  const anchorThreshold = window.innerWidth <= 760 ? 82 : 94;

  return {
    correct: hitIds.includes(expectedId) || anchorDistance <= anchorThreshold,
    hitIds,
  };
}

function returnTagToTray(drag, bounced) {
  const { element, homeParent, homeNext } = drag;
  element.classList.remove("is-dragging");
  if (bounced) {
    element.classList.add("is-wrong");
  }
  element.style.left = "";
  element.style.top = "";
  element.style.width = "";
  element.style.height = "";

  if (homeNext?.isConnected && homeNext.parentElement === homeParent) {
    homeParent.insertBefore(element, homeNext);
  } else {
    homeParent.append(element);
  }

  if (bounced) {
    window.setTimeout(() => {
      element.classList.remove("is-wrong");
    }, 520);
  }
}

function placeLabel(id, tag) {
  const state = labelGameState.get(id);
  if (!state) {
    return;
  }

  state.placed = true;
  state.element = tag;
  tag.className = "drag-tag is-placed";
  tag.disabled = true;
  tag.style.left = "";
  tag.style.top = "";
  tag.style.width = "";
  tag.style.height = "";
  placedLabelLayer.append(tag);
  flashOrgan(id, "correct", 760);
  updatePlacedLabelPositions();
  const placedCount = getPlacedLabelIds().length;
  updateLabelGameStatus(
    placedCount === playableOrganIds.length
      ? "All labels are correctly placed."
      : `${organInfo[id].name} snapped into place.`,
  );
}

function updatePlacedLabelPositions() {
  if (!labelGameActive) {
    return;
  }

  for (const [id, state] of labelGameState.entries()) {
    if (!state.placed) {
      continue;
    }

    const point = getOrganScreenPoint(id);
    if (!point || point.z < -1 || point.z > 1) {
      state.element.style.opacity = "0";
      continue;
    }

    state.element.style.opacity = "1";
    state.element.style.left = `${THREE.MathUtils.clamp(point.x, 18, window.innerWidth - 18)}px`;
    state.element.style.top = `${THREE.MathUtils.clamp(point.y, 18, window.innerHeight - 18)}px`;
  }
}

function showScorecard() {
  scorecardTitle.textContent = `${score}/${quizQuestions.length} Correct!`;
  scorecardMessage.textContent =
    score === quizQuestions.length
      ? "Excellent recall. Every organ was identified correctly."
      : "Retry the quiz to strengthen the organs that need one more look.";
  scorecard.hidden = false;
  quizPanel.hidden = true;
}

function hideScorecard() {
  scorecard.hidden = true;
}

function startQuiz() {
  if (labelGameActive) {
    stopLabelGame();
  }

  hideScorecard();
  quizActive = true;
  quizPanel.hidden = false;
  organLabel.hidden = true;
  leaderLayer.style.display = "none";
  selectedOrgan = null;
  score = 0;
  quizIndex = 0;
  roundComplete = false;
  quizLocked = false;
  setGlass("liver", true);
  setGlass("stomach", true);
  updateQuizPanel();
  refreshAllVisuals();
}

function stopQuiz() {
  quizActive = false;
  quizPanel.hidden = true;
  hideScorecard();
  quizLocked = false;
  roundComplete = false;
  updateLabelContent();
  refreshAllVisuals();
}

function restartQuizRound() {
  if (labelGameActive) {
    stopLabelGame();
  }

  hideScorecard();
  quizActive = true;
  quizPanel.hidden = false;
  organLabel.hidden = true;
  leaderLayer.style.display = "none";
  score = 0;
  quizIndex = 0;
  quizLocked = false;
  roundComplete = false;
  updateQuizPanel();
  refreshAllVisuals();
}

function updateQuizPanel() {
  quizFeedback.className = "";

  if (roundComplete) {
    quizCount.textContent = "Round complete";
    quizScore.textContent = `Score ${score}/${quizQuestions.length}`;
    quizQuestion.textContent = "Quiz round complete.";
    quizFeedback.textContent = "Review any missed organs, then restart the round.";
    return;
  }

  const question = quizQuestions[quizIndex];
  quizCount.textContent = `Question ${quizIndex + 1}/${quizQuestions.length}`;
  quizScore.textContent = `Score ${score}`;
  quizQuestion.textContent = question.prompt;
  quizFeedback.textContent = "Click the matching organ in the 3D model.";
}

function handleQuizAnswer(id) {
  if (!quizActive || quizLocked || roundComplete || !id) {
    return;
  }

  const question = quizQuestions[quizIndex];
  const isCorrect = id === question.answer;
  quizLocked = true;

  if (isCorrect) {
    score += 1;
    quizFeedback.textContent = "Correct.";
    quizFeedback.className = "correct";
    flashOrgan(id, "correct", 900);
  } else {
    quizFeedback.textContent = `Not quite. The answer is ${organInfo[question.answer].name}.`;
    quizFeedback.className = "incorrect";
    flashOrgan(id, "incorrect", 900);
    flashOrgan(question.answer, "correct", 900);
  }

  window.setTimeout(() => {
    quizIndex += 1;
    quizLocked = false;
    if (quizIndex >= quizQuestions.length) {
      roundComplete = true;
      updateQuizPanel();
      showScorecard();
      refreshAllVisuals();
      return;
    }
    updateQuizPanel();
  }, 1150);
}

function resetView() {
  if (!modelRoot) {
    return;
  }
  camera.position.copy(viewHome.position);
  controls.target.copy(viewHome.target);
  controls.update();
  updateLeaderLine();
  updatePlacedLabelPositions();
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateLeaderLine();
  updatePlacedLabelPositions();
}

function showError(message) {
  window.__SIM_ERROR__ = message;
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

canvas.addEventListener("pointermove", (event) => {
  setHoveredOrgan(findIntersectedOrgan(event));
});

canvas.addEventListener("pointerleave", () => {
  setHoveredOrgan(null);
});

canvas.addEventListener("pointerdown", () => {
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointerup", (event) => {
  canvas.style.cursor = hoveredOrgan ? "pointer" : "grab";
  const id = findIntersectedOrgan(event);
  if (!id) {
    if (!quizActive && !labelGameActive) {
      dismissActiveLabel();
    }
    return;
  }

  if (quizActive) {
    handleQuizAnswer(id);
  } else if (labelGameActive) {
    return;
  } else {
    setSelectedOrgan(id);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  stopCurrentAudio();
  dismissActiveLabel({ resetTransparency: true });
});

collapsePanel.addEventListener("click", () => {
  sidePanel.classList.toggle("collapsed");
  syncPanelToggleLabel();
  updateLeaderLine();
});

quizToggle.addEventListener("click", () => {
  if (quizActive) {
    stopQuiz();
  } else {
    startQuiz();
  }
});

labelGameToggle.addEventListener("click", () => {
  if (labelGameActive) {
    stopLabelGame();
  } else {
    startLabelGame();
  }
});

xrayToggle.addEventListener("click", toggleXray);
resetViewButton.addEventListener("click", resetView);
restartQuiz.addEventListener("click", restartQuizRound);
exitQuiz.addEventListener("click", stopQuiz);
retryQuiz.addEventListener("click", restartQuizRound);
closeScorecard.addEventListener("click", stopQuiz);
resetLabelGame.addEventListener("click", resetLabelGameRound);

speakButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    speakOrgan(button.dataset.speakOrgan);
  });
});

labelSpeak.addEventListener("click", (event) => {
  event.stopPropagation();
  speakOrgan(labelSpeak.dataset.speakOrgan);
});

organButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (quizActive) {
      stopQuiz();
    }
    if (labelGameActive) {
      stopLabelGame();
    }
    setSelectedOrgan(button.dataset.organ, { fromMenu: true });
  });
});

window.addEventListener("resize", handleResize);

window.__SIM_API__ = {
  selectOrgan(id) {
    setSelectedOrgan(id, { fromMenu: true });
  },
  toggleXray,
  startQuiz,
  stopQuiz,
  restartQuizRound,
  startLabelGame,
  stopLabelGame,
  resetLabelGameRound,
  speakOrgan,
  answerQuiz(id) {
    handleQuizAnswer(id);
  },
  getState() {
    return {
      ready: window.__SIM_READY__,
      error: window.__SIM_ERROR__,
      selectedOrgan,
      hoveredOrgan,
      quizActive,
      quizIndex,
      score,
      quizLocked,
      roundComplete,
      scorecardVisible: !scorecard.hidden,
      labelGameActive,
      labelGameVisible: !labelGamePanel.hidden,
      placedLabels: getPlacedLabelIds(),
      labelGameFeedback: lastLabelGameFeedback,
      lastSpoken: window.__SIM_LAST_SPOKEN__,
      lastAudioMode,
      lastAudioError,
      currentAudioSrc: currentAudio?.currentSrc || currentAudio?.src || "",
      glassOrgans: [...glassOrgans],
      mappedOrgans: [...organGroups.keys()],
      labelVisible: !organLabel.hidden,
      quizVisible: !quizPanel.hidden,
    };
  },
  getScreenAnchor(id) {
    return getOrganScreenPoint(id);
  },
  rotateCameraForTest(radians = 0.18) {
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    camera.position.copy(controls.target.clone().add(offset));
    controls.update();
    updateLeaderLine();
  },
  getTagRect(id) {
    const tag = document.querySelector(`[data-label-organ="${id}"]`);
    if (!tag) {
      return null;
    }

    const rect = tag.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      centerX: rect.x + rect.width / 2,
      centerY: rect.y + rect.height / 2,
    };
  },
};

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  clampOrbitTarget();
  updateLeaderLine();
  updatePlacedLabelPositions();
  renderer.render(scene, camera);
}

const loader = new GLTFLoader();
loader.load(
  MODEL_URL,
  (gltf) => {
    modelRoot = gltf.scene;
    modelRoot.traverse((node) => {
      if (node.isMesh) {
        node.frustumCulled = false;
      }
    });

    assignOrgans(modelRoot);
    scene.add(modelRoot);

    const initialBox = new THREE.Box3().setFromObject(modelRoot);
    const initialCenter = new THREE.Vector3();
    initialBox.getCenter(initialCenter);
    modelRoot.position.sub(initialCenter);
    modelRoot.updateMatrixWorld(true);

    cacheOrganAnchors();
    fitCameraToModel();
    loadingState.hidden = true;

    const missing = playableOrganIds.filter((id) => !organGroups.has(id));
    if (missing.length) {
      showError(`Some organs were not mapped from the GLB: ${missing.join(", ")}.`);
    }

    refreshAllVisuals();
    window.__SIM_READY__ = true;
  },
  (event) => {
    if (!event.total) {
      return;
    }
    const percent = Math.round((event.loaded / event.total) * 100);
    loadingState.lastElementChild.textContent = `Loading anatomy model ${percent}%`;
  },
  () => {
    loadingState.hidden = true;
    showError("The anatomy model could not be loaded. Start a local server and open index.html from that server.");
  },
);

if (window.innerWidth <= 760) {
  sidePanel.classList.add("collapsed");
}

syncPanelToggleLabel();
canvas.style.cursor = "grab";
leaderLayer.style.display = "none";
updatePanelState();
animate();
