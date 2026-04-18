const COLOR_BANK = [
  { name: "红色", hex: "#ff4d4d" },
  { name: "黄色", hex: "#ffd84d" },
  { name: "蓝色", hex: "#4d7bff" },
  { name: "绿色", hex: "#33c26f" },
  { name: "橙色", hex: "#ff9f43" },
  { name: "紫色", hex: "#9b5de5" },
  { name: "粉色", hex: "#ff7ab6" },
  { name: "棕色", hex: "#8b5e34" },
];

const MIX_BASE = [
  { name: "红色", hex: "#ff4d4d" },
  { name: "黄色", hex: "#ffd84d" },
  { name: "蓝色", hex: "#4d7bff" },
];

const MIX_RULES = {
  "红色+红色": { name: "红色", hex: "#ff4d4d" },
  "黄色+黄色": { name: "黄色", hex: "#ffd84d" },
  "蓝色+蓝色": { name: "蓝色", hex: "#4d7bff" },
  "红色+黄色": { name: "橙色", hex: "#ff9f43" },
  "黄色+红色": { name: "橙色", hex: "#ff9f43" },
  "黄色+蓝色": { name: "绿色", hex: "#33c26f" },
  "蓝色+黄色": { name: "绿色", hex: "#33c26f" },
  "红色+蓝色": { name: "紫色", hex: "#9b5de5" },
  "蓝色+红色": { name: "紫色", hex: "#9b5de5" },
};

const recognizeSwatch = document.querySelector("#recognizeSwatch");
const recognizeQuestion = document.querySelector("#recognizeQuestion");
const recognizeOptions = document.querySelector("#recognizeOptions");
const recognizeFeedback = document.querySelector("#recognizeFeedback");
const recognizeScoreEl = document.querySelector("#recognizeScore");
const recognizeNext = document.querySelector("#recognizeNext");

const mixTargetSwatch = document.querySelector("#mixTargetSwatch");
const mixTargetName = document.querySelector("#mixTargetName");
const mixOptions = document.querySelector("#mixOptions");
const mixFeedback = document.querySelector("#mixFeedback");
const mixScoreEl = document.querySelector("#mixScore");
const mixCheck = document.querySelector("#mixCheck");
const mixReset = document.querySelector("#mixReset");

const freeColorA = document.querySelector("#freeColorA");
const freeColorB = document.querySelector("#freeColorB");
const freeSwatchA = document.querySelector("#freeSwatchA");
const freeSwatchB = document.querySelector("#freeSwatchB");
const freeSwatchMix = document.querySelector("#freeSwatchMix");
const freeMixCode = document.querySelector("#freeMixCode");

const state = {
  recognize: {
    target: null,
    options: [],
    score: 0,
  },
  mix: {
    target: null,
    selected: [],
    score: 0,
  },
};

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffled(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a, b) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return rgbToHex({
    r: Math.round((c1.r + c2.r) / 2),
    g: Math.round((c1.g + c2.g) / 2),
    b: Math.round((c1.b + c2.b) / 2),
  });
}

function setFeedback(element, text, type) {
  element.textContent = text;
  element.classList.remove("ok", "error");
  if (type) element.classList.add(type);
}

function nextRecognizeQuestion() {
  const target = randomPick(COLOR_BANK);
  const wrong = shuffled(COLOR_BANK.filter((c) => c.name !== target.name)).slice(0, 3);
  const options = shuffled([target, ...wrong]);

  state.recognize.target = target;
  state.recognize.options = options;

  recognizeSwatch.style.background = target.hex;
  recognizeQuestion.textContent = "这个颜色叫什么名字？";
  recognizeOptions.innerHTML = options
    .map(
      (item) =>
        `<button class="option-btn" data-name="${item.name}" type="button">${item.name}</button>`
    )
    .join("");

  setFeedback(recognizeFeedback, "", null);
}

function handleRecognizeChoice(name) {
  const correct = state.recognize.target && name === state.recognize.target.name;
  if (correct) {
    state.recognize.score += 1;
    recognizeScoreEl.textContent = String(state.recognize.score);
    setFeedback(recognizeFeedback, "答对了，真棒！", "ok");
  } else {
    setFeedback(
      recognizeFeedback,
      `再试试，这个是${state.recognize.target.name}。`,
      "error"
    );
  }
}

function buildMixTargets() {
  const unique = new Map();
  Object.entries(MIX_RULES).forEach(([key, value]) => {
    const [left, right] = key.split("+");
    if (left === right) return;
    unique.set(value.name, value);
  });
  return [...unique.values()];
}

const MIX_TARGETS = buildMixTargets();

function findMixAnswers(targetName) {
  const baseOrder = new Map(MIX_BASE.map((color, index) => [color.name, index]));
  const unique = new Map();

  Object.entries(MIX_RULES).forEach(([key, value]) => {
    if (value.name !== targetName) return;

    const [left, right] = key.split("+");
    if (left === right) return;
    const pair = [left, right].sort(
      (a, b) => (baseOrder.get(a) ?? 999) - (baseOrder.get(b) ?? 999)
    );
    unique.set(pair.join("+"), pair);
  });

  return [...unique.values()].map(([left, right]) => `${left} + ${right}`);
}

function nextMixQuestion() {
  state.mix.target = randomPick(MIX_TARGETS);
  state.mix.selected = [];

  mixTargetSwatch.style.background = state.mix.target.hex;
  mixTargetName.textContent = state.mix.target.name;

  mixOptions.innerHTML = MIX_BASE.map(
    (color) => `
      <button class="mix-btn" data-name="${color.name}" type="button">
        <span class="dot" style="background:${color.hex}"></span>
        <span>${color.name}</span>
      </button>
    `
  ).join("");

  setFeedback(mixFeedback, "", null);
}

function toggleMixSelection(name) {
  const idx = state.mix.selected.indexOf(name);
  if (idx >= 0) {
    state.mix.selected.splice(idx, 1);
  } else if (state.mix.selected.length < 2) {
    state.mix.selected.push(name);
  } else {
    state.mix.selected.shift();
    state.mix.selected.push(name);
  }

  mixOptions.querySelectorAll(".mix-btn").forEach((btn) => {
    const active = state.mix.selected.includes(btn.dataset.name);
    btn.classList.toggle("active", active);
  });
}

function checkMixAnswer() {
  if (state.mix.selected.length !== 2) {
    setFeedback(mixFeedback, "先选择两种颜色哦。", "error");
    return;
  }

  const key = `${state.mix.selected[0]}+${state.mix.selected[1]}`;
  const result = MIX_RULES[key];

  if (result && result.name === state.mix.target.name) {
    state.mix.score += 1;
    mixScoreEl.textContent = String(state.mix.score);
    setFeedback(
      mixFeedback,
      `答对了！${state.mix.selected[0]} + ${state.mix.selected[1]} = ${result.name}`,
      "ok"
    );
  } else {
    const answers = findMixAnswers(state.mix.target.name);
    const answerText = answers.length ? answers.join(" 或 ") : "暂无答案";
    setFeedback(
      mixFeedback,
      `这次不对。正确答案：${answerText} = ${state.mix.target.name}`,
      "error"
    );
  }
}

function renderFreeMix() {
  const a = freeColorA.value;
  const b = freeColorB.value;
  const mixed = mixHex(a, b);

  freeSwatchA.style.background = a;
  freeSwatchB.style.background = b;
  freeSwatchMix.style.background = mixed;
  freeMixCode.textContent = `${a.toUpperCase()} + ${b.toUpperCase()} = ${mixed.toUpperCase()}`;
}

function bindEvents() {
  recognizeOptions.addEventListener("click", (event) => {
    const button = event.target.closest(".option-btn");
    if (!button) return;
    handleRecognizeChoice(button.dataset.name);
  });

  recognizeNext.addEventListener("click", nextRecognizeQuestion);

  mixOptions.addEventListener("click", (event) => {
    const button = event.target.closest(".mix-btn");
    if (!button) return;
    toggleMixSelection(button.dataset.name);
  });

  mixCheck.addEventListener("click", checkMixAnswer);
  mixReset.addEventListener("click", nextMixQuestion);

  freeColorA.addEventListener("input", renderFreeMix);
  freeColorB.addEventListener("input", renderFreeMix);
}

function init() {
  bindEvents();
  nextRecognizeQuestion();
  nextMixQuestion();
  renderFreeMix();
}

init();
