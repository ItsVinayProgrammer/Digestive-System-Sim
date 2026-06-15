import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { GLTFLoader } from "three/addons/GLTFLoader.js";

const MODEL_URL = encodeURI(
  "./Digestive system- stomach, liver, gall bladder, pancreas, small and large intestine .glb",
);

const organInfo = {
  liver: {
    name: "Liver",
    kicker: "Accessory digestive gland",
    aliases: ["liver", "leaver", "leaver003"],
    facts: ["Produces bile for fat digestion.", "Detoxifies chemicals in the blood."],
    glassCapable: true,
  },
  gallbladder: {
    name: "Gallbladder",
    kicker: "Bile storage sac",
    aliases: ["gallbladder", "gall bladder", "gallbladder002", "gallbladder"],
    facts: ["Stores bile made by the liver.", "Concentrates bile before it enters the duodenum."],
    glassCapable: false,
  },
  stomach: {
    name: "Stomach",
    kicker: "Muscular digestive chamber",
    aliases: ["stomach"],
    facts: [
      "Secretes gastric juice containing HCl and pepsin.",
      "Mixes food mechanically and begins chemical digestion of proteins.",
    ],
    glassCapable: true,
  },
  pancreas: {
    name: "Pancreas",
    kicker: "Exocrine and endocrine gland",
    aliases: ["pancreas", "pancrease"],
    facts: [
      "Releases pancreatic juice into the duodenum.",
      "Pancreatic juice contains trypsin, lipase, and amylase.",
    ],
    glassCapable: false,
  },
  smallIntestine: {
    name: "Small intestine",
    kicker: "Main absorption site",
    aliases: ["smallintestine", "small008", "small009"],
    facts: [
      "Absorbs nutrients through villi and microvilli.",
      "Includes the duodenum, jejunum, and ileum.",
    ],
    glassCapable: false,
  },
  largeIntestine: {
    name: "Large intestine",
    kicker: "Water recovery tract",
    aliases: ["largeintestine", "largeinterstain003"],
    facts: ["Absorbs water and minerals.", "Forms and stores waste before elimination."],
    glassCapable: false,
  },
  esophagus: {
    name: "Esophagus",
    kicker: "Food transport tube",
    aliases: ["esophagus", "beziercurve"],
    facts: ["Moves food from the pharynx to the stomach by peristalsis."],
    glassCapable: false,
  },
};

const quizQuestions = [
  {
    prompt: "Which organ stores and concentrates bile?",
    answer: "gallbladder",
  },
  {
    prompt: "Which organ secretes gastric juice containing HCl and pepsin?",
    answer: "stomach",
  },
  {
    prompt: "Which organ produces bile and detoxifies chemicals?",
    answer: "liver",
  },
  {
    prompt: "Which organ releases pancreatic juice containing trypsin, lipase, and amylase?",
    answer: "pancreas",
  },
  {
    prompt: "Which organ absorbs most nutrients through villi?",
    answer: "smallIntestine",
  },
  {
    prompt: "Which organ absorbs water and helps form waste?",
    answer: "largeIntestine",
  },
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
const xrayToggle = document.querySelector("#xray-toggle");
const resetViewButton = document.querySelector("#reset-view");
const activeOrgan = document.querySelector("#active-organ");
const xrayState = document.querySelector("#xray-state");
const organButtons = [...document.querySelectorAll("[data-organ]")];
const organLabel = document.querySelector("#organ-label");
const labelKicker = document.querySelector("#label-kicker");
const labelTitle = document.querySelector("#label-title");
const labelFacts = document.querySelector("#label-facts");
const quizPanel = document.querySelector("#quiz-panel");
const quizCount = document.querySelector("#quiz-count");
const quizScore = document.querySelector("#quiz-score");
const quizQuestion = document.querySelector("#quiz-question");
const quizFeedback = document.querySelector("#quiz-feedback");
const restartQuiz = document.querySelector("#restart-quiz");
const exitQuiz = document.querySelector("#exit-quiz");

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

window.__SIM_READY__ = false;
window.__SIM_ERROR__ = null;
window.__SIM_API__ = null;

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
}

function updateLabelContent() {
  if (!selectedOrgan || quizActive) {
    organLabel.hidden = true;
    leaderLayer.style.display = "none";
    return;
  }

  const info = organInfo[selectedOrgan];
  labelKicker.textContent = info.kicker;
  labelTitle.textContent = info.name;
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

  if (window.innerWidth <= 760) {
    left = 10;
    top = Math.min(window.innerHeight - labelRect.height - 92, Math.max(76, y + 24));
  } else {
    const rightReserve = sidePanel.classList.contains("collapsed") ? 88 : 342;
    const maxLeft = window.innerWidth - rightReserve - labelRect.width;
    left = THREE.MathUtils.clamp(left, 16, Math.max(16, maxLeft));
    top = THREE.MathUtils.clamp(top, 16, window.innerHeight - labelRect.height - 16);
  }

  organLabel.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;

  const edgeX = left > x ? left : left + labelRect.width;
  const edgeY = top + labelRect.height * 0.46;
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

  organButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.organ === selectedOrgan);
  });
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function findIntersectedOrgan(event) {
  if (!modelRoot) {
    return null;
  }

  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const meshes = [...organGroups.values()].flatMap((group) => group.meshes);
  const intersections = raycaster.intersectObjects(meshes, false);
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

function startQuiz() {
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
  quizLocked = false;
  roundComplete = false;
  updateLabelContent();
  refreshAllVisuals();
}

function restartQuizRound() {
  score = 0;
  quizIndex = 0;
  quizLocked = false;
  roundComplete = false;
  updateQuizPanel();
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
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateLeaderLine();
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
    return;
  }

  if (quizActive) {
    handleQuizAnswer(id);
  } else {
    setSelectedOrgan(id);
  }
});

collapsePanel.addEventListener("click", () => {
  sidePanel.classList.toggle("collapsed");
  collapsePanel.setAttribute(
    "aria-label",
    sidePanel.classList.contains("collapsed") ? "Open panel" : "Collapse panel",
  );
  updateLeaderLine();
});

quizToggle.addEventListener("click", () => {
  if (quizActive) {
    stopQuiz();
  } else {
    startQuiz();
  }
});

xrayToggle.addEventListener("click", toggleXray);
resetViewButton.addEventListener("click", resetView);
restartQuiz.addEventListener("click", restartQuizRound);
exitQuiz.addEventListener("click", stopQuiz);

organButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (quizActive) {
      stopQuiz();
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
      glassOrgans: [...glassOrgans],
      mappedOrgans: [...organGroups.keys()],
      labelVisible: !organLabel.hidden,
      quizVisible: !quizPanel.hidden,
    };
  },
  getScreenAnchor(id) {
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
  },
};

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  clampOrbitTarget();
  updateLeaderLine();
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

    const requiredOrgans = [
      "liver",
      "gallbladder",
      "stomach",
      "pancreas",
      "smallIntestine",
      "largeIntestine",
    ];
    const missing = requiredOrgans.filter((id) => !organGroups.has(id));
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

canvas.style.cursor = "grab";
leaderLayer.style.display = "none";
updatePanelState();
animate();
