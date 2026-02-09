/* ================== BASIC ================== */
const size = 8;
const board = document.getElementById("board");
const blocksDiv = document.getElementById("blocks");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const starsEl = document.getElementById("stars");

const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");

const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");

const musicBtn = document.getElementById("musicBtn");

/* AUDIO */
const bgMusic = document.getElementById("bgMusic");
const blastSound = document.getElementById("blastSound");
const clickSound = document.getElementById("clickSound");

let musicOn = true;

/* STATE */
let grid = new Array(size * size).fill(0);
let score = 0;
let level = 1;
let stars = 0;
let paused = false;

/* COLORS */
const COLORS = ["red", "yellow", "purple"];

/* SHAPES */
const SHAPES = [
  [[1]],
  [[1,1]],
  [[1,1,1]],
  [[1,1],[1,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1,1]]
];

/* ================== BOARD ================== */
board.innerHTML = "";
for (let i = 0; i < size * size; i++) {
  const c = document.createElement("div");
  c.className = "cell";
  board.appendChild(c);
}

/* ================== BLOCKS ================== */
function createBlocks() {
  blocksDiv.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const shape =
      SHAPES[Math.floor(Math.random() * Math.min(level + 2, SHAPES.length))];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const block = document.createElement("div");
    block.className = `block ${color}`;
    block.dataset.shape = JSON.stringify(shape);
    block.dataset.color = color;
    block.style.gridTemplateColumns =
      `repeat(${shape[0].length}, 44px)`;

    shape.flat().forEach(v => {
      const d = document.createElement("div");
      if (!v) d.style.visibility = "hidden";
      block.appendChild(d);
    });

    blocksDiv.appendChild(block);
  }
}
createBlocks();

/* ================== SOUND ================== */
function playClick() {
  if (!musicOn) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(()=>{});
}

function playBlast() {
  if (!musicOn) return;
  blastSound.currentTime = 0;
  blastSound.play().catch(()=>{});
}

/* ================== DRAG ================== */
let dragged = null, ox = 0, oy = 0;

blocksDiv.addEventListener("touchstart", e => {
  if (paused) return;
  dragged = e.target.closest(".block");
  if (!dragged) return;

  playClick();

  const r = dragged.getBoundingClientRect();
  ox = e.touches[0].clientX - r.left;
  oy = e.touches[0].clientY - r.top;
  dragged.style.position = "fixed";
});

addEventListener("touchmove", e => {
  if (!dragged || paused) return;
  e.preventDefault();
  dragged.style.left = e.touches[0].clientX - ox + "px";
  dragged.style.top = e.touches[0].clientY - oy + "px";
}, { passive:false });

addEventListener("touchend", e => {
  if (!dragged || paused) return;

  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.changedTouches[0].clientX - rect.left) / (rect.width / size));
  const y = Math.floor((e.changedTouches[0].clientY - rect.top) / (rect.height / size));

  const shape = JSON.parse(dragged.dataset.shape);
  const color = dragged.dataset.color;

  if (canPlace(x, y, shape)) {
    place(x, y, shape, color);
    dragged.remove();
    score += 10;
    updateUI();
    checkClusterBlast();
    if (blocksDiv.children.length === 0) createBlocks();
  }
  dragged = null;
});

/* ================== LOGIC ================== */
function canPlace(x, y, s) {
  for (let r = 0; r < s.length; r++)
    for (let c = 0; c < s[r].length; c++)
      if (s[r][c]) {
        const nx = x + c, ny = y + r;
        if (
          nx < 0 || ny < 0 ||
          nx >= size || ny >= size ||
          grid[ny * size + nx]
        ) return false;
      }
  return true;
}

function place(x, y, s, color) {
  s.forEach((r, ry) => r.forEach((v, cx) => {
    if (v) {
      const i = (y + ry) * size + (x + cx);
      grid[i] = color;
      board.children[i].className = `cell filled ${color}`;
    }
  }));
}

/* ================== AUTO BLAST (8+) ================== */
function checkClusterBlast() {
  const visited = new Array(size * size).fill(false);

  for (let i = 0; i < size * size; i++) {
    if (grid[i] && !visited[i]) {
      const cluster = [];
      floodFill(i, grid[i], visited, cluster);

      if (cluster.length >= 8) {
        cluster.forEach(blastCell);
        score += cluster.length * 20;
        playBlast();
        screenShake();
      }
    }
  }
}

function floodFill(start, color, visited, cluster) {
  const stack = [start];
  visited[start] = true;

  while (stack.length) {
    const i = stack.pop();
    cluster.push(i);
    const x = i % size, y = Math.floor(i / size);

    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
        const ni = ny * size + nx;
        if (grid[ni] === color && !visited[ni]) {
          visited[ni] = true;
          stack.push(ni);
        }
      }
    });
  }
}

function blastCell(i) {
  grid[i] = 0;
  board.children[i].className = "cell";
}

/* ================== EFFECT ================== */
function screenShake() {
  board.classList.add("shake");
  setTimeout(() => board.classList.remove("shake"), 250);
}

/* ================== UI ================== */
function updateUI() {
  level = Math.floor(score / 500) + 1;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  starsEl.textContent = stars;
}

/* ================== CONTROLS ================== */
startBtn.onclick = () => {
  startScreen.style.display = "none";
  if (musicOn) {
    bgMusic.volume = 0.4;
    bgMusic.play().catch(()=>{});
  }
};

pauseBtn.onclick = () => {
  paused = true;
  pauseOverlay.style.display = "flex";
};

resumeBtn.onclick = () => {
  paused = false;
  pauseOverlay.style.display = "none";
};

musicBtn.onclick = () => {
  musicOn = !musicOn;
  if (musicOn) {
    bgMusic.play().catch(()=>{});
    musicBtn.textContent = "🔊";
  } else {
    bgMusic.pause();
    musicBtn.textContent = "🔇";
  }
};

const restartBtn = document.getElementById("restartBtn");

restartBtn.onclick = () => {
  playClick();

  // reset state
  grid = new Array(size * size).fill(0);
  score = 0;
  level = 1;
  stars = 0;
  paused = false;

  // clear board UI
  for(let i=0;i<size*size;i++){
    board.children[i].className = "cell";
  }

  // recreate blocks
  createBlocks();
  updateUI();

  // hide overlays
  pauseOverlay.style.display = "none";
};