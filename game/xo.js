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
    
    statusText.innerHTML = `ตาของ: <span class="player-x">ผู้เล่น X</span>`;
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
        const winnerName = currentMode === 'bot' && player === "O" ? "คอมพิวเตอร์ (O)" : `ผู้เล่น ${player}`;
        endGame(`${winnerName} ชนะแล้ว! 🎉`);
        return true;
    }

    if (!boardState.includes("")) {
        endGame("เสมอกัน! 🤝");
        return true;
    }
    return false;
}

function updateStatusText() {
    const playerClass = currentPlayer === "X" ? "player-x" : "player-o";
    const playerName = currentMode === 'bot' && currentPlayer === "O" ? "คอมพิวเตอร์ (O)" : `ผู้เล่น ${currentPlayer}`;
    statusText.innerHTML = `ตาของ: <span class="${playerClass}">${playerName}</span>`;
}

function endGame(message) {
    isGameActive = false;
    messageText.innerText = message;
    gameMessage.classList.remove('hidden');
}

// --- ระบบออนไลน์ 8 หลัก ---
async function createOnlineRoom() {
    const user = localStorage.getItem("currentUser") || "Host";
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
    
    const user = localStorage.getItem("currentUser") || "Guest";
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
            alert(result.message);
        }
    } catch (e) {
        alert("เชื่อมต่อห้องไม่สำเร็จ");
    }
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        if (!currentRoomId) return;

        try {
            const res = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify({ action: "getRoomStatus", roomId: currentRoomId })
            });
            const data = await res.json();

            if (data.status === "success") {
                // ถ้า Host รออยู่แล้วมีคนเข้าห้องแล้ว ให้สลับเข้าหน้าจอเกม
                if (data.roomStatus === "playing" && onlineLobby.classList.contains('hidden') === false) {
                    onlineLobby.classList.add('hidden');
                    gameArea.classList.remove('hidden');
                }
                
                boardState = data.boardState;
                currentPlayer = data.currentTurn;
                
                boardState.forEach((val, idx) => {
                    const cell = document.querySelector(`[data-index='${idx}']`);
                    cell.innerText = val;
                    cell.className = "cell " + val.toLowerCase();
                });

                updateStatusText();

                if (data.roomStatus === "finished") {
                    endGame("เกมจบแล้ว!");
                }
            }
        } catch (e) { console.error(e); }
    }, 1500);
}

async function handleOnlineMove(index) {
    if (currentPlayer !== myRole) {
        alert("ยังไม่ใช่ตาของคุณ!");
        return;
    }

    boardState[index] = myRole;
    
    let isFinished = false;
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            isFinished = true;
            break;
        }
    }
    if (!boardState.includes("")) isFinished = true;

    const nextTurn = myRole === "X" ? "O" : "X";

    await fetch(GAS_URL, {
        method: "POST",
        body: JSON.หน้า || JSON.stringify({
            action: "makeMove",
            roomId: currentRoomId,
            boardState: boardState,
            currentTurn: nextTurn,
            isFinished: isFinished
        })
    });
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

// ฟังก์ชันสำหรับจำลองการเข้าเล่นห้องที่ตัวเองสร้าง (กรณีเทสคนเดียว)
async function simulateJoinSelf() {
    if (!currentRoomId) return;
    
    // บังคับเปลี่ยนสถานะห้องใน Google Sheets ให้เป็น playing
    try {
        await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "joinRoom",
                roomId: currentRoomId,
                playerEmail: "TestPlayer2@gmail.com"
            })
        });
        
        onlineLobby.classList.add('hidden');
        gameArea.classList.remove('hidden');
        myRole = "X"; // ให้เราเป็นผู้เล่น X
        alert("จำลองเข้าห้องสำเร็จ! เริ่มเกมได้เลย");
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการจำลองเข้าห้อง");
    }
}