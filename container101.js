const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');

let painting = false;

// Undo/Redo stacks
let undoStack = [];
let redoStack = [];

// Fill mode flag
let isFilling = false;

// ---- Helper Functions ----
function saveState() {
  undoStack.push(canvas.toDataURL());
  redoStack = []; // clear redo stack
  if (undoStack.length > 50) undoStack.shift(); // optional limit
}

function restoreState(stackFrom, stackTo) {
  if (stackFrom.length === 0) return;
  stackTo.push(canvas.toDataURL());

  const img = new Image();
  img.src = stackFrom.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function getBrushColor() {
  return document.getElementById('colorPicker').value;
}

function getBrushSize() {
  return document.getElementById('brushSize').value;
}

// ---- Drawing ----
function startPosition(e) {
  if (isFilling) return; // Don't draw in fill mode
  painting = true;
  saveState();
  draw(e);
}

function endPosition() {
  painting = false;
  ctx.beginPath();
}

function draw(e) {
  if (!painting || isFilling) return;

  const brushColor = getBrushColor();
  const brushSize = getBrushSize();

  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.strokeStyle = brushColor;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// ---- Fill Tool ----
const fillBtn = document.getElementById('fillBtn');

fillBtn.addEventListener('click', () => {
  isFilling = !isFilling;

  // Toggle fill button appearance
  if (isFilling) {
    fillBtn.style.backgroundColor = 'limegreen';
    fillBtn.style.color = 'white';
  } else {
    fillBtn.style.backgroundColor = '';
    fillBtn.style.color = '';
  }
});

canvas.addEventListener('click', (e) => {
  if (!isFilling) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);

  const fillColor = hexToRgba(getBrushColor());
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const targetColor = getPixelColor(data, x, y, canvas.width);

  if (!colorsMatch(targetColor, fillColor)) {
    saveState(); // Save before filling
    floodFill(data, x, y, fillColor, targetColor, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
  }

  // Turn off fill mode and reset button style
  isFilling = false;
  fillBtn.style.backgroundColor = '';
  fillBtn.style.color = '';
});

// ---- Canvas Events ----
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseleave', endPosition);

// ---- Clear Button ----
document.getElementById('clearBtn').addEventListener('click', function () {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
});

// ---- Undo/Redo Shortcuts ----
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    restoreState(undoStack, redoStack);
  } else if (e.ctrlKey && e.key === 'y') {
    e.preventDefault();
    restoreState(redoStack, undoStack);
  }
});

// ---- Fill Utilities ----
function hexToRgba(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [
    (bigint >> 16) & 255, // R
    (bigint >> 8) & 255,  // G
    bigint & 255,         // B
    255                   // A
  ];
}

function getPixelColor(data, x, y, width) {
  const index = (y * width + x) * 4;
  return data.slice(index, index + 4);
}

function setPixelColor(data, x, y, width, color) {
  const index = (y * width + x) * 4;
  for (let i = 0; i < 4; i++) {
    data[index + i] = color[i];
  }
}

function colorsMatch(a, b) {
  return a[0] === b[0] &&
         a[1] === b[1] &&
         a[2] === b[2] &&
         a[3] === b[3];
}

function floodFill(data, x, y, fillColor, targetColor, width, height) {
  const stack = [[x, y]];

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();

    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

    const currentColor = getPixelColor(data, cx, cy, width);
    if (!colorsMatch(currentColor, targetColor)) continue;

    setPixelColor(data, cx, cy, width, fillColor);

    stack.push([cx + 1, cy]);
    stack.push([cx - 1, cy]);
    stack.push([cx, cy + 1]);
    stack.push([cx, cy - 1]);
  }
}
