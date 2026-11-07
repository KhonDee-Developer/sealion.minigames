const GAS_URL = "https://script.google.com/macros/s/AKfycbzn7_xXMOwWvlDP4yLVX7gvVzyimGUmIL4b_wdJmkUerGLULwhAOboZio26CkIb42b5yQ/exec"; // <-- เปลี่ยนเป็น URL ของคุณ

const modeSelection = document.getElementById('modeSelection');
const onlineLobby = document.getElementById('onlineLobby');
const gameArea = document.getElementById('gameArea');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const gameMessage = document.getElementById('gameMessage');
const messageText = document.getElementById('messageText');
const restartBtn = document.getElementById('restartBtn');
const roomIdInput = document.getElementById('roomIdInput');
const roomInfoBox = document.getElementById('roomInfoBox');
const displayRoomId = document.getElementById('displayRoomId');
const roomStatusText = document.getElementById('roomStatusText');

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

let boardState = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let isGameActive = true;
let currentMode = ""; // 'bot', 'local', 'online'
let currentRoomId = null;
let myRole = "X";
let pollInterval = null;

let playerXName = "ผู้เล่น X";
let playerOName = "ผู้เล่น O";

// --- ระบบคะแนนสำหรับโหมด Local (เล่น 2 คนในเครื่อง) ---
let localScores = { X: 0, O: 0, draws: 0 };

// --- ระบบสถิติสำหรับโหมด Bot / Online ---
let stats = JSON.parse(localStorage.getItem('xoStats')) || { wins: 0, losses: 0, draws: 0 };

function updateStatsDisplay() {
    let statsBox = document.getElementById('statsBox');
    if (!statsBox) {
        statsBox = document.createElement('div');
        statsBox.id = 'statsBox';
        statsBox.className = 'score-board';
        statsBox.style.margin = '10px 0';
        statsBox.style.display = 'flex';
        statsBox.style.justifyContent = 'space-around';
        gameArea.insertBefore(statsBox, statusText);
    }

    if (currentMode === 'local') {
        // แสดงคะแนนผู้เล่น X และ O สำหรับเล่นในเครื่องเดียวกัน
        statsBox.innerHTML = `
            <span>❌ ผู้เล่น X: <strong style="color: #38bdf8;">${localScores.X}</strong></span> | 
            <span>⭕ ผู้เล่น O: <strong style="color: #f43f5e;">${localScores.O}</strong></span> | 
            <span>🤝 เสมอ: <strong style="color: #94a3b8;">${localScores.draws}</strong></span>
        `;
    } else {
        // แสดงสถิติ ชนะ/แพ้/เสมอ สำหรับโหมด Bot หรือ Online
        statsBox.innerHTML = `
            <span>🏆 ชนะ: <strong style="color: #4ade80;">${stats.wins}</strong></span> | 
            <span>❌ แพ้: <strong style="color: #f43f5e;">${stats.losses}</strong></span> | 
            <span>🤝 เสมอ: <strong style="color: #38bdf8;">${stats.draws}</strong></span>
        `;
    }
}

function selectMode(mode) {
    currentMode = mode;
    modeSelection.classList.add('hidden');

    if (mode === 'online') {
        onlineLobby.classList.remove('hidden');
    } else {
        onlineLobby.classList.add('hidden');
        gameArea.classList.remove('hidden');
        initGame();
    }
}

function backToMenu() {
    if (pollInterval) clearInterval(pollInterval);
    gameMessage.classList.add('hidden');
    gameArea.classList.add('hidden');
    onlineLobby.classList.add('hidden');
    modeSelection.classList.remove('hidden');
    roomInfoBox.classList.add('hidden');
    currentRoomId = null;
}

function initGame() {
    boardState = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    isGameActive = true;
    playerXName = "ผู้เล่น X";
    playerOName = "ผู้เล่น O";
    
    updateStatusText();
    updateStatsDisplay();
    gameMessage.classList.add('hidden');

    cells.forEach(cell => {
        cell.innerText = "";
        cell.classList.remove('x', 'o');
    });
}

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        const index = cell.getAttribute('data-index');

        if (boardState[index] !== "" || !isGameActive) return;

        if (currentMode === 'online') {
            handleOnlineMove(index);
        } else {
            handleLocalOrBotMove(index);
        }
    });
});

function handleLocalOrBotMove(index) {
    boardState[index] = currentPlayer;
    const cell = document.querySelector(`[data-index='${index}']`);
    cell.innerText = currentPlayer;
    cell.classList.add(currentPlayer.toLowerCase());

    if (checkWinOrDraw(currentPlayer)) return;

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatusText();

    if (currentMode === 'bot' && currentPlayer === "O" && isGameActive) {
        isGameActive = false;
        statusText.innerHTML = `คอมพิวเตอร์กำลังคิด... <span class="player-o">O</span>`;
        setTimeout(() => {
            botMove();
        }, 600);
    }
}

function botMove() {
    const emptyCells = [];
    boardState.forEach((val, idx) => {
        if (val === "") emptyCells.push(idx);
    });

    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        boardState[randomIndex] = "O";
        const cell = document.querySelector(`[data-index='${randomIndex}']`);
        cell.innerText = "O";
        cell.classList.add('o');

        if (checkWinOrDraw("O")) return;

        currentPlayer = "X";
        isGameActive = true;
        updateStatusText();
    }
}

function checkWinOrDraw(player) {
    let roundWon = false;
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        let winnerName = "";
        if (currentMode === 'local') {
            winnerName = `ผู้เล่น ${player}`;
            if (player === "X") localScores.X++;
            else localScores.O++;
            updateStatsDisplay();
        } else if (currentMode === 'bot') {
            winnerName = player === "O" ? "คอมพิวเตอร์ (O)" : `ผู้เล่น ${player}`;
            if (player === "X") { stats.wins++; } else { stats.losses++; }
            localStorage.setItem('xoStats', JSON.stringify(stats));
            updateStatsDisplay();
        } else if (currentMode === 'online') {
            winnerName = player === "X" ? playerXName : playerOName;
            if (player === myRole) { stats.wins++; } else { stats.losses++; }
            localStorage.setItem('xoStats', JSON.stringify(stats));
            updateStatsDisplay();
        }
        endGame(`${winnerName} ชนะแล้ว! 🎉`);
        return true;
    }

    if (!boardState.includes("")) {
        if (currentMode === 'local') {
            localScores.draws++;
        } else {
            stats.draws++;
            localStorage.setItem('xoStats', JSON.stringify(stats));
        }
        updateStatsDisplay();
        endGame("เสมอกัน! 🤝");
        return true;
    }
    return false;
}

function updateStatusText() {
    const playerClass = currentPlayer === "X" ? "player-x" : "player-o";
    let displayName = "";

    if (currentMode === 'bot') {
        displayName = currentPlayer === "O" ? "คอมพิวเตอร์ (O)" : `ผู้เล่น ${currentPlayer}`;
    } else if (currentMode === 'online') {
        const activeName = currentPlayer === "X" ? playerXName : playerOName;
        displayName = `${activeName} (${currentPlayer})`;
    } else {
        displayName = `ผู้เล่น ${currentPlayer}`;
    }

    statusText.innerHTML = `ตาของ: <span class="${playerClass}">${displayName}</span>`;
}

function endGame(message) {
    isGameActive = false;
    messageText.innerText = message;
    gameMessage.classList.remove('hidden');
}

// --- ระบบออนไลน์ ---
async function createOnlineRoom() {
    const user = localStorage.getItem("currentUser") || "Host";
    playerXName = user;
    roomStatusText.innerText = "⏳ กำลังสร้างห้อง...";
    roomInfoBox.classList.remove('hidden');
    
    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "createRoom", playerEmail: user })
        });
        const result = await res.json();
        if (result.status === "success") {
            currentRoomId = result.roomId;
            myRole = "X";
            displayRoomId.innerText = currentRoomId;
            roomStatusText.innerText = "⏳ รอเพื่อนกรอกรหัสเข้าร่วมห้อง...";
            startPolling();
        } else {
            alert(result.message || "ไม่สามารถสร้างห้องได้");
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการสร้างห้อง");
    }
}

async function joinOnlineRoom() {
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (roomId.length !== 8) {
        alert("กรุณากรอกรหัสห้องให้ครบ 8 หลัก");
        return;
    }
    
    if (currentRoomId && currentRoomId === roomId) {
        alert("คุณไม่สามารถเข้าร่วมห้องที่ตัวเองสร้างได้ครับ!");
        return;
    }
    
    const user = localStorage.getItem("currentUser") || "Guest";
    playerOName = user;
    
    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "joinRoom", roomId: roomId, playerEmail: user })
        });
        const result = await res.json();
        if (result.status === "success") {
            currentRoomId = roomId;
            myRole = "O";
            onlineLobby.classList.add('hidden');
            gameArea.classList.remove('hidden');
            startPolling();
        } else {
            alert(result.message || "เข้าร่วมห้องไม่สำเร็จ");
        }
    } catch (e) {
        alert("เชื่อมต่อห้องไม่สำเร็จ");
    }
}

let isSyncing = false;

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        if (!currentRoomId || isSyncing) return;

        isSyncing = true;
        try {
            const res = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify({ action: "getRoomStatus", roomId: currentRoomId })
            });
            const data = await res.json();

            if (data.status === "success") {
                if (data.roomStatus === "playing" && onlineLobby.classList.contains('hidden') === false) {
                    onlineLobby.classList.add('hidden');
                    gameArea.classList.remove('hidden');
                }
                
                if (data.playerX) playerXName = data.playerX;
                if (data.playerO) playerOName = data.playerO;

                boardState = data.boardState;
                currentPlayer = data.currentTurn;
                
                boardState.forEach((val, idx) => {
                    const cell = document.querySelector(`[data-index='${idx}']`);
                    if (cell.innerText !== val) {
                        cell.innerText = val;
                        cell.className = "cell " + (val ? val.toLowerCase() : "");
                    }
                });

                updateStatusText();

                if (data.roomStatus === "finished" || data.isFinished) {
                    const winner = data.winner || (currentPlayer === "X" ? "O" : "X");
                    const winnerName = winner === "X" ? playerXName : playerOName;
                    endGame(`${winnerName} ชนะแล้ว! 🎉`);
                }
            }
        } catch (e) { 
            console.error("Polling error:", e); 
        } finally {
            isSyncing = false;
        }
    }, 2000);
}

async function handleOnlineMove(index) {
    if (currentPlayer !== myRole) {
        alert("ยังไม่ใช่ตาของคุณ!");
        return;
    }

    if (boardState[index] !== "") return;

    boardState[index] = myRole;
    const cell = document.querySelector(`[data-index='${index}']`);
    cell.innerText = myRole;
    cell.className = "cell " + myRole.toLowerCase();

    let isFinished = false;
    let winnerSymbol = null;
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            isFinished = true;
            winnerSymbol = boardState[a];
            break;
        }
    }
    if (!boardState.includes("")) isFinished = true;

    const nextTurn = myRole === "X" ? "O" : "X";
    currentPlayer = nextTurn;
    updateStatusText();

    try {
        await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "makeMove",
                roomId: currentRoomId,
                boardState: boardState,
                currentTurn: nextTurn,
                isFinished: isFinished,
                winner: winnerSymbol
            })
        });
        
        if (isFinished) {
            if (winnerSymbol === myRole) { stats.wins++; } 
            else if (winnerSymbol) { stats.losses++; } 
            else { stats.draws++; }
            localStorage.setItem('xoStats', JSON.stringify(stats));
            updateStatsDisplay();

            const winnerName = winnerSymbol ? (winnerSymbol === "X" ? playerXName : playerOName) : "ไม่มี";
            const msg = winnerSymbol ? `${winnerName} ชนะแล้ว! 🎉` : "เสมอกัน! 🤝";
            endGame(msg);
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการส่งข้อมูลการเดิน");
    }
}

// ปุ่มรีเซ็ตสำหรับโหมดเล่นคนเดียว/เครื่องเดียวกัน
document.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyR' || e.key.toLowerCase() === 'r' || e.key === 'พ' || e.key === 'ภ') && currentMode !== 'online') {
        initGame();
    }
});

restartBtn.addEventListener('click', () => {
    gameMessage.classList.add('hidden');
    if (currentMode !== 'online') initGame();
});

async function simulateJoinSelf() {
    if (!currentRoomId) return;
    
    try {
        await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "joinRoom",
                roomId: currentRoomId,
                playerEmail: "TestPlayer2@gmail.com"
            })
        });
        
        playerOName = "TestPlayer2@gmail.com";
        onlineLobby.classList.add('hidden');
        gameArea.classList.remove('hidden');
        myRole = "X";
        alert("จำลองเข้าห้องสำเร็จ! เริ่มเกมได้เลย");
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการจำลองเข้าห้อง");
    }
}