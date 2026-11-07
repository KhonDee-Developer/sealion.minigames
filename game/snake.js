const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const gameMessage = document.getElementById("gameMessage");
const messageText = document.getElementById("messageText");
const subMessageText = document.getElementById("subMessageText");
const restartBtn = document.getElementById("restartBtn");

const gridSize = 20;
let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let gameInterval = null;
let isGameOver = false;
let changingDirection = false; 

highScoreEl.innerText = highScore;

function initGame() {
    snake = [
        { x: 160, y: 200 },
        { x: 140, y: 200 },
        { x: 120, y: 200 }
    ];
    score = 0;
    scoreEl.innerText = score;
    dx = gridSize;
    dy = 0;
    isGameOver = false;
    gameMessage.classList.add("hidden");
    createFood();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 175);
}

function gameLoop() {
    if (isGameOver) return;
    changingDirection = false;
    clearCanvas();
    drawFood();
    moveSnake();
    drawSnake();
    checkGameOver();
}

function clearCanvas() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#4ade80" : "#22c55e";
        ctx.strokeStyle = "#020617";
        ctx.fillRect(part.x, part.y, gridSize, gridSize);
        ctx.strokeRect(part.x, part.y, gridSize, gridSize);
    });
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    const hasEatenFood = head.x === food.x && head.y === food.y;
    if (hasEatenFood) {
        score += 10;
        scoreEl.innerText = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.innerText = highScore;
            localStorage.setItem("snakeHighScore", highScore);
        }
        createFood();
    } else {
        snake.pop();
    }
}

function randomFood(min, max) {
    return Math.floor((Math.random() * (max - min) + min) / gridSize) * gridSize;
}

function createFood() {
    food.x = randomFood(0, canvas.width);
    food.y = randomFood(0, canvas.height);

    snake.forEach(part => {
        const hasEaten = part.x === food.x && part.y === food.y;
        if (hasEaten) createFood();
    });
}

function drawFood() {
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(food.x + gridSize / 2, food.y + gridSize / 2, gridSize / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();
}

function checkGameOver() {
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= canvas.width;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= canvas.height;

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall) {
        endGame();
    }

    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            endGame();
        }
    }
}

function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    messageText.innerText = "GAME OVER";
    subMessageText.innerText = "กดปุ่ม R (พ) เพื่อเล่นใหม่";
    gameMessage.classList.remove("hidden");
}

// ควบคุมทิศทางและรีเซ็ตเกมด้วยคีย์บอร์ด
document.addEventListener("keydown", changeDirection);

function changeDirection(event) {
    const code = event.code; 
    const key = event.key.toLowerCase();

    if (code === 'KeyR' || key === 'r' || key === 'พ' || key === 'ภ') {
        initGame();
        return;
    }

    if (changingDirection) return;

    const goingUp = dy === -gridSize;
    const goingDown = dy === gridSize;
    const goingRight = dx === gridSize;
    const goingLeft = dx === -gridSize;

    if ((code === 'KeyA' || key === 'a' || key === 'ฟ' || code === 'ArrowLeft') && !goingRight) {
        dx = -gridSize;
        dy = 0;
        changingDirection = true;
    }
    if ((code === 'KeyW' || key === 'w' || key === 'ไ' || code === 'ArrowUp') && !goingDown) {
        dx = 0;
        dy = -gridSize;
        changingDirection = true;
    }
    if ((code === 'KeyD' || key === 'd' || key === 'ก' || code === 'ArrowRight') && !goingLeft) {
        dx = gridSize;
        dy = 0;
        changingDirection = true;
    }
    if ((code === 'KeyS' || key === 's' || key === 'ห' || code === 'ArrowDown') && !goingUp) {
        dx = 0;
        dy = gridSize;
        changingDirection = true;
    }
}

restartBtn.addEventListener("click", initGame);

// --- ระบบควบคุมสำหรับมือถือ (Mobile / Touch Controls) ---

document.getElementById("btnUp").addEventListener("touchstart", (e) => { e.preventDefault(); handleMobileMove('UP'); });
document.getElementById("btnDown").addEventListener("touchstart", (e) => { e.preventDefault(); handleMobileMove('DOWN'); });
document.getElementById("btnLeft").addEventListener("touchstart", (e) => { e.preventDefault(); handleMobileMove('LEFT'); });
document.getElementById("btnRight").addEventListener("touchstart", (e) => { e.preventDefault(); handleMobileMove('RIGHT'); });

document.getElementById("btnUp").addEventListener("click", () => handleMobileMove('UP'));
document.getElementById("btnDown").addEventListener("click", () => handleMobileMove('DOWN'));
document.getElementById("btnLeft").addEventListener("click", () => handleMobileMove('LEFT'));
document.getElementById("btnRight").addEventListener("click", () => handleMobileMove('RIGHT'));

function handleMobileMove(dir) {
    if (changingDirection || isGameOver) return;

    const goingUp = dy === -gridSize;
    const goingDown = dy === gridSize;
    const goingRight = dx === gridSize;
    const goingLeft = dx === -gridSize;

    if (dir === 'LEFT' && !goingRight) { dx = -gridSize; dy = 0; changingDirection = true; }
    if (dir === 'UP' && !goingDown) { dx = 0; dy = -gridSize; changingDirection = true; }
    if (dir === 'RIGHT' && !goingLeft) { dx = gridSize; dy = 0; changingDirection = true; }
    if (dir === 'DOWN' && !goingUp) { dx = 0; dy = gridSize; changingDirection = true; }
}

// ระบบปัดหน้าจอ (Swipe Controls) บน Canvas
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
    if (!touchStartX || !touchStartY || changingDirection || isGameOver) return;

    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;

    let diffX = touchEndX - touchStartX;
    let diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
            handleMobileMove(diffX > 0 ? 'RIGHT' : 'LEFT');
        }
    } else {
        if (Math.abs(diffY) > 30) {
            handleMobileMove(diffY > 0 ? 'DOWN' : 'UP');
        }
    }

    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });

// เริ่มเกมทันทีเมื่อเปิดหน้าเว็บ
initGame();