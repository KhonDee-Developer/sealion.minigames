const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const gameMessage = document.getElementById("gameMessage");
const messageText = document.getElementById("messageText");
const restartBtn = document.getElementById("restartBtn");

let score = 0;
let highScore = localStorage.getItem("spaceHighScore") || 0;
highScoreEl.innerText = highScore;

let gameInterval = null;
let isGameOver = false;

// ข้อมูลยานอวกาศ (เคลื่อนที่ได้อิสระทั่วจอ)
let player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 80,
    width: 30,
    height: 35,
    speed: 5,
    dx: 0,
    dy: 0
};

let obstacles = [];
let obstacleTimer = 0;
let gameSpeed = 3;

function initGame() {
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height - 80;
    player.dx = 0;
    player.dy = 0;
    obstacles = [];
    score = 0;
    obstacleTimer = 0;
    gameSpeed = 3;
    scoreEl.innerText = score;
    isGameOver = false;
    gameMessage.classList.add("hidden");

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60);
}

function gameLoop() {
    if (isGameOver) return;
    update();
    draw();
}

function update() {
    player.x += player.dx;
    player.y += player.dy;

    // จำกัดขอบเขตไม่ให้ยานหลุดหน้าจอ
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // สร้างอุกกาบาต
    obstacleTimer++;
    if (obstacleTimer > 40 - Math.min(gameSpeed * 2, 25)) {
        let size = Math.random() * 25 + 20;
        let xPos = Math.random() * (canvas.width - size);
        obstacles.push({
            x: xPos,
            y: -50,
            width: size,
            height: size,
            speed: Math.random() * 2 + gameSpeed
        });
        obstacleTimer = 0;
    }

    // อัปเดตตำแหน่งอุกกาบาตและการชน
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += obstacles[i].speed;

        if (
            player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            endGame();
        }

        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
            scoreEl.innerText = score;

            if (score > highScore) {
                highScore = score;
                highScoreEl.innerText = highScore;
                localStorage.setItem("spaceHighScore", highScore);
            }

            if (score % 50 === 0) {
                gameSpeed += 0.5;
            }
        }
    }
}

function draw() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ดาวพื้นหลัง
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);

    // วาดตัวยาน
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // วาดอุกกาบาต
    ctx.fillStyle = "#f43f5e";
    obstacles.forEach(obs => {
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    messageText.innerText = "GAME OVER";
    gameMessage.classList.remove("hidden");
}

// ควบคุมด้วยคีย์บอร์ด (WASD / ลูกศร และรองรับภาษาไทย)
document.addEventListener("keydown", (e) => {
    const code = e.code;
    const key = e.key.toLowerCase();

    if (code === "ArrowLeft" || key === "a" || key === "ฟ") player.dx = -player.speed;
    if (code === "ArrowRight" || key === "d" || key === "ก") player.dx = player.speed;
    if (code === "ArrowUp" || key === "w" || key === "ไ") player.dy = -player.speed;
    if (code === "ArrowDown" || key === "s" || key === "ห") player.dy = player.speed;

    // รีเซ็ตเกมด้วยปุ่ม R, พ, ภ หรือ Spacebar เมื่อ Game Over
    if ((code === "KeyR" || key === "r" || key === "พ" || key === "ภ" || code === "Space") && isGameOver) {
        initGame();
    }
});

document.addEventListener("keyup", (e) => {
    const code = e.code;
    const key = e.key.toLowerCase();

    if (["ArrowLeft", "KeyA"].includes(code) || ["a", "ฟ"].includes(key) ||
        ["ArrowRight", "KeyD"].includes(code) || ["d", "ก"].includes(key)) {
        player.dx = 0;
    }
    if (["ArrowUp", "KeyW"].includes(code) || ["w", "ไ"].includes(key) ||
        ["ArrowDown", "KeyS"].includes(code) || ["s", "ห"].includes(key)) {
        player.dy = 0;
    }
});

// ควบคุมด้วยปุ่มบนมือถือ 4 ทิศทาง
const setupBtn = (id, actionStart, actionEnd) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); actionStart(); });
    btn.addEventListener("touchend", actionEnd);
    btn.addEventListener("mousedown", actionStart);
    btn.addEventListener("mouseup", actionEnd);
};

setupBtn("btnLeft", () => player.dx = -player.speed, () => player.dx = 0);
setupBtn("btnRight", () => player.dx = player.speed, () => player.dx = 0);
setupBtn("btnUp", () => player.dy = -player.speed, () => player.dy = 0);
setupBtn("btnDown", () => player.dy = player.speed, () => player.dy = 0);

restartBtn.addEventListener("click", initGame);

initGame();