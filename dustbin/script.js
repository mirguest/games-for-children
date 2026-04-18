const scoreEl = document.getElementById("score");
const timeLeftEl = document.getElementById("timeLeft");
const itemCard = document.getElementById("itemCard");
const itemIcon = document.getElementById("itemIcon");
const itemName = document.getElementById("itemName");
const itemCategory = document.getElementById("itemCategory");
const messageEl = document.getElementById("message");
const overlay = document.getElementById("overlay");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");
const controlBtn = document.getElementById("controlBtn");
const mistakesList = document.getElementById("mistakesList");
const bins = Array.from(document.querySelectorAll(".bin"));
const playground = document.querySelector(".playground");

const GAME_DURATION = 120;
const FALL_DURATION = 4200;
const NEXT_ROUND_DELAY = 500;

const categoryLabel = {
  recyclable: "可回收物",
  kitchen: "厨余垃圾",
  hazardous: "有害垃圾",
  other: "其他垃圾",
};

const categoryColor = {
  recyclable: "var(--recyclable)",
  kitchen: "var(--kitchen)",
  hazardous: "var(--hazardous)",
  other: "var(--other)",
};

const items = [
  { name: "饮料瓶", icon: "🧃", category: "recyclable" },
  { name: "旧报纸", icon: "📰", category: "recyclable" },
  { name: "易拉罐", icon: "🥫", category: "recyclable" },
  { name: "香蕉皮", icon: "🍌", category: "kitchen" },
  { name: "苹果核", icon: "🍎", category: "kitchen" },
  { name: "剩饭", icon: "🍚", category: "kitchen" },
  { name: "电池", icon: "🔋", category: "hazardous" },
  { name: "灯泡", icon: "💡", category: "hazardous" },
  { name: "过期药片", icon: "💊", category: "hazardous" },
  { name: "纸巾", icon: "🧻", category: "other" },
  { name: "口罩", icon: "😷", category: "other" },
  { name: "碎陶瓷", icon: "🏺", category: "other" },
];

const keyToCategory = {
  Digit1: "recyclable",
  Numpad1: "recyclable",
  Digit2: "kitchen",
  Numpad2: "kitchen",
  Digit3: "hazardous",
  Numpad3: "hazardous",
  Digit4: "other",
  Numpad4: "other",
};

const state = {
  score: 0,
  timeLeft: GAME_DURATION,
  activeItem: null,
  activeTargetY: 0,
  activeLeft: 0,
  spawnTime: 0,
  locked: false,
  running: false,
  ended: false,
  rafId: 0,
  timerId: 0,
  roundDelayId: 0,
  mistakes: [],
};

function setMessage(text, kind = "info") {
  messageEl.textContent = text;
  messageEl.classList.remove("good", "bad", "info");
  messageEl.classList.add(kind);
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  timeLeftEl.textContent = `${state.timeLeft}s`;
}

function resetToIdle() {
  state.score = 0;
  state.timeLeft = GAME_DURATION;
  state.activeItem = null;
  state.locked = false;
  state.running = false;
  state.ended = false;

  overlay.hidden = true;
  updateHud();
  setMessage("准备开始", "info");
  placeItem(0, -90);
  controlBtn.textContent = "开始游戏";
  controlBtn.classList.remove("running");
}

function randomItem() {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function getPlaygroundMetrics() {
  const rect = playground.getBoundingClientRect();
  const cardRect = itemCard.getBoundingClientRect();
  const binRow = document.querySelector(".bin-row").getBoundingClientRect();
  const itemCardTop = 110;
  const safeMargin = 30;
  const maxTargetY = rect.height - itemCardTop - cardRect.height - binRow.height - safeMargin;
  const targetY = Math.max(60, Math.min(maxTargetY, 250));
  const minLeft = 20;
  const maxLeft = Math.max(minLeft, rect.width - cardRect.width - 20);
  return { rect, cardRect, targetY, minLeft, maxLeft };
}

function placeItem(left, y) {
  itemCard.style.left = `${left}px`;
  itemCard.style.transform = `translate(-50%, ${y}px)`;
}

function spawnItem() {
  if (state.ended) return;

  const item = randomItem();
  const { minLeft, maxLeft, targetY } = getPlaygroundMetrics();
  const left = minLeft + Math.random() * (maxLeft - minLeft);

  state.activeItem = item;
  state.activeTargetY = targetY;
  state.activeLeft = left;
  state.spawnTime = performance.now();
  state.locked = false;

  itemIcon.textContent = item.icon;
  itemName.textContent = item.name;
  itemCategory.textContent = `属于：${categoryLabel[item.category]}`;
  itemCategory.style.color = categoryColor[item.category];

  setMessage("选择正确的垃圾桶", "info");
  placeItem(left, -90);

  cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(animateItem);
}

function animateItem(now) {
  if (state.ended || !state.activeItem) return;

  const progress = Math.min(1, (now - state.spawnTime) / FALL_DURATION);
  const y = -90 + (state.activeTargetY + 90) * progress;
  placeItem(state.activeLeft, y);

  if (progress >= 1 && !state.locked) {
    resolveRound(false, "没接住，继续下一题");
    return;
  }

  state.rafId = requestAnimationFrame(animateItem);
}

function resolveRound(isCorrect, feedback, chosenCategory = null) {
  if (state.ended || state.locked) return;

  state.locked = true;
  cancelAnimationFrame(state.rafId);

  if (isCorrect) {
    state.score += 1;
    updateHud();
    setMessage(feedback, "good");
  } else {
    setMessage(feedback, "bad");
    state.mistakes.push({
      item: state.activeItem,
      chosen: chosenCategory,
      correct: state.activeItem.category,
    });
  }

  state.roundDelayId = window.setTimeout(() => {
    spawnItem();
  }, NEXT_ROUND_DELAY);
}

function handleBinClick(event) {
  if (state.ended || state.locked || !state.activeItem) return;

  const chosen = event.currentTarget.dataset.category;
  const correct = chosen === state.activeItem.category;
  resolveRound(
    correct,
    correct
      ? `答对了！${categoryLabel[chosen]} +1 分`
      : `不对哦，这个应该放进${categoryLabel[state.activeItem.category]}`,
    chosen
  );
}

function handleKeyDown(event) {
  if (state.ended || state.locked || !state.activeItem) return;

  const chosen = keyToCategory[event.code];
  if (!chosen) return;

  event.preventDefault();

  const correct = chosen === state.activeItem.category;
  resolveRound(
    correct,
    correct
      ? `答对了！${categoryLabel[chosen]} +1 分`
      : `不对哦，这个应该放进${categoryLabel[state.activeItem.category]}`,
    chosen
  );
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = window.setInterval(() => {
    if (state.ended) return;

    state.timeLeft -= 1;
    updateHud();

    if (state.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function startGame() {
  clearInterval(state.timerId);
  clearTimeout(state.roundDelayId);
  cancelAnimationFrame(state.rafId);

  state.score = 0;
  state.timeLeft = GAME_DURATION;
  state.activeItem = null;
  state.locked = false;
  state.running = true;
  state.ended = false;
  state.mistakes = [];

  overlay.hidden = true;
  updateHud();
  setMessage("准备开始", "info");
  controlBtn.textContent = "终止游戏";
  controlBtn.classList.add("running");
  startTimer();
  spawnItem();
}

function endGame() {
  state.ended = true;
  state.running = false;
  state.locked = true;
  cancelAnimationFrame(state.rafId);
  clearInterval(state.timerId);
  clearTimeout(state.roundDelayId);

  finalScoreEl.textContent = String(state.score);

  // 渲染错误列表
  mistakesList.innerHTML = "";
  if (state.mistakes.length === 0) {
    const li = document.createElement("li");
    li.className = "mistake-item perfect";
    li.textContent = "全部答对，太棒了！🎉";
    mistakesList.appendChild(li);
  } else {
    state.mistakes.forEach((mistake) => {
      const li = document.createElement("li");
      li.className = "mistake-item";

      const itemPart = document.createElement("div");
      itemPart.className = "mistake-item-content";
      itemPart.innerHTML = `
        <span class="mistake-icon">${mistake.item.icon}</span>
        <span class="mistake-name">${mistake.item.name}</span>
      `;

      const chosenPart = document.createElement("div");
      chosenPart.className = "mistake-chosen";
      if (mistake.chosen === null) {
        chosenPart.innerHTML = `<span class="label">时间到了</span>`;
      } else {
        chosenPart.innerHTML = `<span class="label">你选了：</span><span class="category wrong">${categoryLabel[mistake.chosen]}</span>`;
      }

      const correctPart = document.createElement("div");
      correctPart.className = "mistake-correct";
      correctPart.innerHTML = `<span class="label">正确答案：</span><span class="category correct">${categoryLabel[mistake.correct]}</span>`;

      li.appendChild(itemPart);
      li.appendChild(chosenPart);
      li.appendChild(correctPart);
      mistakesList.appendChild(li);
    });
  }

  overlay.hidden = false;
  setMessage("时间到，游戏结束", "info");
  controlBtn.textContent = "再玩一次";
  controlBtn.classList.remove("running");
}

function handleControlBtn() {
  if (state.ended) {
    startGame();
  } else if (state.running) {
    endGame();
  } else {
    startGame();
  }
}

bins.forEach((bin) => bin.addEventListener("click", handleBinClick));
restartBtn.addEventListener("click", startGame);
controlBtn.addEventListener("click", handleControlBtn);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("resize", () => {
  if (!state.activeItem || state.ended) return;
  const { targetY, maxLeft } = getPlaygroundMetrics();
  state.activeTargetY = targetY;
  state.activeLeft = Math.min(state.activeLeft, maxLeft);
});

resetToIdle();
