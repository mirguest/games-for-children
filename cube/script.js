const COLORS = {
  U: "#f3f6ff",
  D: "#f9db4a",
  L: "#ff9c3d",
  R: "#f24d4d",
  F: "#42d46a",
  B: "#4b7dff",
};

const FACE_VECTOR = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const VECTOR_FACE = {
  "0,1,0": "U",
  "0,-1,0": "D",
  "-1,0,0": "L",
  "1,0,0": "R",
  "0,0,1": "F",
  "0,0,-1": "B",
};

const FACE_CONFIG = {
  U: { axis: "y", layer: 1, dir: 1 },
  D: { axis: "y", layer: -1, dir: -1 },
  L: { axis: "x", layer: -1, dir: 1 },
  R: { axis: "x", layer: 1, dir: -1 },
  F: { axis: "z", layer: 1, dir: 1 },
  B: { axis: "z", layer: -1, dir: -1 },
};

const MOVE_ORDER = ["U", "D", "L", "R", "F", "B"];
const HISTORY_LIMIT = 200;
const CUBELET_SIZE = 4; // rem

const cubeEl = document.querySelector("#cube");
const cubeSceneEl = document.querySelector("#cubeScene");
const statusText = document.querySelector("#statusText");
const moveCountEl = document.querySelector("#moveCount");
const moveButtonsEl = document.querySelector("#moveButtons");
const thetaRangeEl = document.querySelector("#thetaRange");
const thetaNumberEl = document.querySelector("#thetaNumber");
const phiRangeEl = document.querySelector("#phiRange");
const phiNumberEl = document.querySelector("#phiNumber");

const state = {
  cubies: [],
  history: [],
  isAnimating: false,
  pending: [],
  view: {
    theta: 38,
    phi: -30,
  },
};

let nextCubieId = 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(value) {
  return ((value % 360) + 360) % 360;
}

function keyForPos(pos) {
  return `${pos.x},${pos.y},${pos.z}`;
}

function rotateCoord(pos, axis, dir) {
  const { x, y, z } = pos;
  if (axis === "x") {
    return dir === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y };
  }
  if (axis === "y") {
    return dir === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x };
  }
  return dir === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z };
}

function rotateVector(vec, axis, dir) {
  const [x, y, z] = vec;
  const rotated =
    axis === "x"
      ? dir === 1
        ? [x, -z, y]
        : [x, z, -y]
      : axis === "y"
        ? dir === 1
          ? [z, y, -x]
          : [-z, y, x]
        : dir === 1
          ? [-y, x, z]
          : [y, -x, z];
  return rotated;
}

function createSolvedCubie(x, y, z) {
  const stickers = {};
  for (const face of MOVE_ORDER) {
    const [fx, fy, fz] = FACE_VECTOR[face];
    const onSurface =
      (fx !== 0 && x === fx) || (fy !== 0 && y === fy) || (fz !== 0 && z === fz);
    if (onSurface) stickers[face] = COLORS[face];
  }
  nextCubieId += 1;
  return { id: nextCubieId, pos: { x, y, z }, stickers };
}

function createCubeState() {
  nextCubieId = 0;
  const cubies = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        cubies.push(createSolvedCubie(x, y, z));
      }
    }
  }
  return cubies;
}

function buildMoveControls() {
  const variants = [
    ["U", "上"],
    ["D", "下"],
    ["L", "左"],
    ["R", "右"],
    ["F", "前"],
    ["B", "后"],
  ];

  moveButtonsEl.innerHTML = variants
    .map(
      ([face, label]) => `
        <button class="move-btn" data-move="${face}">
          <span>${label}</span>
          <code>${face}</code>
        </button>
      `
    )
    .join("");
}

function buildCubeDom() {
  cubeEl.innerHTML = "";
  for (const cubie of state.cubies) {
    const el = document.createElement("div");
    el.className = "cubie";
    el.dataset.id = String(cubie.id);
    el.innerHTML = `
      <div class="face u"><div class="sticker"></div></div>
      <div class="face d"><div class="sticker"></div></div>
      <div class="face l"><div class="sticker"></div></div>
      <div class="face r"><div class="sticker"></div></div>
      <div class="face f"><div class="sticker"></div></div>
      <div class="face b"><div class="sticker"></div></div>
    `;
    cubeEl.appendChild(el);
  }
}

function updateCubeOrientation() {
  cubeEl.style.transform = `rotateX(${state.view.phi}deg) rotateY(${state.view.theta}deg)`;
}

function syncViewControls() {
  thetaRangeEl.value = String(state.view.theta);
  thetaNumberEl.value = String(state.view.theta);
  phiRangeEl.value = String(state.view.phi);
  phiNumberEl.value = String(state.view.phi);
}

function setView(nextView, options = {}) {
  const theta = normalizeAngle(nextView.theta);
  const phi = clamp(nextView.phi, -85, 85);
  state.view.theta = theta;
  state.view.phi = phi;
  updateCubeOrientation();
  if (!options.skipControls) {
    syncViewControls();
  }
}

function resetView() {
  setView({ theta: 38, phi: -30 });
}

function topView() {
  setView({ theta: 0, phi: -85 });
}

function renderCube() {
  const halfStep = CUBELET_SIZE + 0.18;
  for (const cubie of state.cubies) {
    const el = cubeEl.querySelector(`[data-id="${cubie.id}"]`);
    if (!el) continue;
    el.style.transform = `translate3d(${cubie.pos.x * halfStep}rem, ${-cubie.pos.y * halfStep}rem, ${cubie.pos.z * halfStep}rem)`;

    for (const face of MOVE_ORDER) {
      const faceEl = el.querySelector(`.face.${face.toLowerCase()}`);
      const stickerEl = faceEl?.querySelector(".sticker");
      const color = cubie.stickers[face];
      if (stickerEl) {
        if (color) {
          stickerEl.style.background = color;
          faceEl.classList.remove("hidden");
        } else {
          stickerEl.style.background = "transparent";
          faceEl.classList.add("hidden");
        }
      }
    }
  }
  updateCubeOrientation();
  updateStatus();
}

function applyMove(face, count = 1, pushHistory = true) {
  const turns = ((count % 4) + 4) % 4;
  if (!turns) return;

  for (let i = 0; i < turns; i += 1) {
    rotateFaceOnce(face);
  }

  if (pushHistory) {
    state.history.push({ face, count });
    if (state.history.length > HISTORY_LIMIT) {
      state.history.shift();
    }
  }
  renderCube();
}

function rotateFaceOnce(face) {
  const { axis, layer, dir } = FACE_CONFIG[face];
  for (const cubie of state.cubies) {
    if (cubie.pos[axis] !== layer) continue;
    cubie.pos = rotateCoord(cubie.pos, axis, dir);
    const nextStickers = {};
    for (const [key, value] of Object.entries(cubie.stickers)) {
      const rotatedFace = VECTOR_FACE[rotateVector(FACE_VECTOR[key], axis, dir).join(",")];
      nextStickers[rotatedFace] = value;
    }
    cubie.stickers = nextStickers;
  }
}

function scrambleCube() {
  const moves = [];
  for (let i = 0; i < 20; i += 1) {
    const face = MOVE_ORDER[Math.floor(Math.random() * MOVE_ORDER.length)];
    const count = Math.random() > 0.5 ? 1 : 3;
    moves.push({ face, count });
  }
  enqueueMoves(moves);
}

function resetCube() {
  state.cubies = createCubeState();
  state.history = [];
  state.pending = [];
  state.isAnimating = false;
  buildCubeDom();
  renderCube();
}

function undoMove() {
  const last = state.history.pop();
  if (!last) return;
  applyMove(last.face, 4 - last.count, false);
}

function updateStatus() {
  const solved = isSolved();
  statusText.textContent = solved ? "已复原" : "进行中";
  moveCountEl.textContent = `${state.history.length} 步`;
}

function isSolved() {
  for (const cubie of state.cubies) {
    const { x, y, z } = cubie.pos;
    for (const face of MOVE_ORDER) {
      const [fx, fy, fz] = FACE_VECTOR[face];
      const shouldExist = (fx !== 0 && x === fx) || (fy !== 0 && y === fy) || (fz !== 0 && z === fz);
      const color = cubie.stickers[face];
      if (shouldExist && color !== COLORS[face]) return false;
      if (!shouldExist && color) return false;
    }
  }
  return true;
}

async function enqueueMoves(moves) {
  state.pending.push(...moves);
  if (state.isAnimating) return;

  state.isAnimating = true;
  while (state.pending.length) {
    const move = state.pending.shift();
    applyMove(move.face, move.count, true);
    await wait(120);
  }
  state.isAnimating = false;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bindEvents() {
  document.querySelector("[data-action='scramble']").addEventListener("click", scrambleCube);
  document.querySelector("[data-action='reset']").addEventListener("click", resetCube);
  document.querySelector("[data-action='undo']").addEventListener("click", undoMove);
  document.querySelector("[data-action='viewReset']").addEventListener("click", resetView);
  document.querySelector("[data-action='viewTop']").addEventListener("click", topView);

  moveButtonsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move]");
    if (!button) return;
    const face = button.dataset.move;
    applyMove(face, 1, true);
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toUpperCase();
    if (!FACE_CONFIG[key]) return;
    const count = event.shiftKey ? 3 : 1;
    applyMove(key, count, true);
  });

  let pointerState = null;

  cubeSceneEl.addEventListener("pointerdown", (event) => {
    pointerState = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startTheta: state.view.theta,
      startPhi: state.view.phi,
    };
    cubeSceneEl.setPointerCapture(event.pointerId);
  });

  cubeSceneEl.addEventListener("pointermove", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    setView({
      theta: pointerState.startTheta + dx * 0.35,
      phi: pointerState.startPhi + dy * 0.28,
    }, { skipControls: false });
  });

  const endDrag = (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    pointerState = null;
  };

  cubeSceneEl.addEventListener("pointerup", endDrag);
  cubeSceneEl.addEventListener("pointercancel", endDrag);

  const syncFromRanges = () => {
    setView({
      theta: Number(thetaRangeEl.value),
      phi: Number(phiRangeEl.value),
    });
  };

  thetaRangeEl.addEventListener("input", syncFromRanges);
  phiRangeEl.addEventListener("input", syncFromRanges);
  thetaNumberEl.addEventListener("change", () => {
    setView({
      theta: Number(thetaNumberEl.value),
      phi: Number(phiNumberEl.value),
    });
  });
  phiNumberEl.addEventListener("change", () => {
    setView({
      theta: Number(thetaNumberEl.value),
      phi: Number(phiNumberEl.value),
    });
  });
}

function init() {
  buildMoveControls();
  state.cubies = createCubeState();
  buildCubeDom();
  bindEvents();
  syncViewControls();
  renderCube();
}

init();
