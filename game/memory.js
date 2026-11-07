const GAS_URL = "https://script.google.com/macros/s/AKfycby6RdhuQEgsOHefgHCh7cd4esWe8_bmLMU4HD9TkMEHIavf4R6CaivdyMZQ0ZwOROuOFg/exec";

const modeSelection = document.getElementById('modeSelection');
const onlineLobby = document.getElementById('onlineLobby');
const gameArea = document.getElementById('gameArea');
const roomIdInput = document.getElementById('roomIdInput');
const roomInfoBox = document.getElementById('roomInfoBox');
const displayRoomId = document.getElementById('displayRoomId');
const roomStatusText = document.getElementById('roomStatusText');

const cardGrid = document.getElementById('cardGrid');
const turnIndicator = document.getElementById('turnIndicator');
const scoreBoardContainer = document.getElementById('scoreBoardContainer');
const gameMessage = document.getElementById('gameMessage');
const winnerText = document.getElementById('winnerText');
const finalScoreText = document.getElementById('finalScoreText');
const bestRecordText = document.getElementById('bestRecordText');
const bestRecordBanner = document.getElementById('bestRecordBanner');

let currentMode = ""; 
let currentRoomId = null;
let myRole = null; 
let pollInterval = null;
let isSyncing = false;

let gameCardsState = [];
let currentTurn = 1;
let scores = { 1: 0, 2: 0 };
let icons = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
let playerXName = "Host";
let playerOName = "Guest";

// ตัวแปรเล่นคนเดียว
let singleFlipCount = 0;
let singleTimer = 0;
let singleTimerInterval = null;

// รองรับการกดปุ่ม 'R' หรือ 'r' บนคีย์บอร์ดเพื่อเริ่มใหม่
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        // เช็คว่าอยู่ในหน้าจอเล่นเกม หรือหน้าต่างจบเกมแสดงอยู่หรือไม่
        if (!gameArea.classList.contains('hidden')) {
            restartGame();
        }
    }
});

function selectMode(mode) {
    currentMode = mode;
    modeSelection.classList.add('hidden');

    if (mode === 'single') {
        gameArea.classList.remove('hidden');
        turnIndicator.classList.add('hidden');
        bestRecordBanner.classList.remove('hidden');
        initSinglePlayerGame();
    } else if (mode === 'online') {
        onlineLobby.classList.remove('hidden');
    }
}

function backToMenu() {
    if (pollInterval) clearInterval(pollInterval);
    if (singleTimerInterval) clearInterval(singleTimerInterval);
    
    gameMessage.classList.add('hidden');
    gameArea.classList.add('hidden');
    onlineLobby.classList.add('hidden');
    modeSelection.classList.remove('hidden');
    roomInfoBox.classList.add('hidden');
    currentRoomId = null;
}

// ฟังก์ชันสำหรับเริ่มเกมใหม่
function restartGame() {
    gameMessage.classList.add('hidden'); // ซ่อนหน้าต่างจบเกม (ถ้ามี)
    if (singleTimerInterval) clearInterval(singleTimerInterval);

    if (currentMode === 'single') {
        initSinglePlayerGame();
    } else if (currentMode === 'online') {
        alert("โหมดออนไลน์: กรุณาสร้างห้องใหม่หรือติดต่อเพื่อนเพื่อเริ่มเกมใหม่ร่วมกัน");
        backToMenu();
    }
}

// --- ฟังก์ชันอัปเดตสถิติ ---
function updateLiveBestRecordDisplay() {
    const bestFlips = localStorage.getItem('memoryBestFlips');
    const bestTime = localStorage.getItem('memoryBestTime');

    if (bestFlips && bestTime) {
        bestRecordText.innerText = `เปิด ${bestFlips} ครั้ง (${bestTime} วิ)`;
    } else {
        bestRecordText.innerText = "ยังไม่มีสถิติ";
    }
}

function checkAndUpdateBestRecord(time, flips) {
    const bestFlips = localStorage.getItem('memoryBestFlips');
    const bestTime = localStorage.getItem('memoryBestTime');
    
    let isNewRecord = false;

    if (!bestFlips || flips < parseInt(bestFlips) || (flips === parseInt(bestFlips) && time < parseInt(bestTime))) {
        localStorage.setItem('memoryBestFlips', flips);
        localStorage.setItem('memoryBestTime', time);
        isNewRecord = true;
    }

    return isNewRecord;
}

// --- โหมดเล่นคนเดียว ---
function initSinglePlayerGame() {
    updateLiveBestRecordDisplay();

    let cardsData = [...icons, ...icons];
    cardsData.sort(() => Math.random() - 0.5);

    cardGrid.innerHTML = '';
    singleFlipCount = 0;
    singleTimer = 0;
    let flippedCards = [];
    let matchedPairs = 0;
    let isLock = false;
    let isStarted = false;

    scoreBoardContainer.innerHTML = `<span>เปิด: <strong id="flipCount">0</strong> ครั้ง</span> | <span>เวลา: <strong id="timer">0</strong> วินาที</span>`;
    const flipCountEl = document.getElementById('flipCount');
    const timerEl = document.getElementById('timer');

    if (singleTimerInterval) clearInterval(singleTimerInterval);

    cardsData.forEach((icon, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.icon = icon;

        card.innerHTML = `
            <div class="card-face card-front">❓</div>
            <div class="card-face card-back">${icon}</div>
        `;

        card.addEventListener('click', () => {
            if (isLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;

            if (!isStarted) {
                isStarted = true;
                singleTimerInterval = setInterval(() => {
                    singleTimer++;
                    timerEl.innerText = singleTimer;
                }, 1000);
            }

            card.classList.add('flipped');
            flippedCards.push(card);

            if (flippedCards.length === 2) {
                singleFlipCount++;
                flipCountEl.innerText = singleFlipCount;
                const [c1, c2] = flippedCards;

                if (c1.dataset.icon === c2.dataset.icon) {
                    c1.classList.add('matched');
                    c2.classList.add('matched');
                    flippedCards = [];
                    matchedPairs++;

                    if (matchedPairs === icons.length) {
                        clearInterval(singleTimerInterval);
                        
                        const isNewRecord = checkAndUpdateBestRecord(singleTimer, singleFlipCount);
                        
                        if (isNewRecord) {
                            winnerText.innerText = "🏆 สถิติใหม่! ยินดีด้วย";
                        } else {
                            winnerText.innerText = "🎉 ยินดีด้วย! ชนะแล้ว";
                        }

                        finalScoreText.innerText = `เปิดทั้งหมด ${singleFlipCount} ครั้ง ในเวลา ${singleTimer} วินาที`;
                        setTimeout(() => gameMessage.classList.remove('hidden'), 500);
                    }
                } else {
                    isLock = true;
                    setTimeout(() => {
                        c1.classList.remove('flipped');
                        c2.classList.remove('flipped');
                        flippedCards = [];
                        isLock = false;
                    }, 900);
                }
            }
        });

        cardGrid.appendChild(card);
    });
}

// --- โหมดออนไลน์ ---
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
            myRole = "1";
            displayRoomId.innerText = currentRoomId;
            roomStatusText.innerText = "⏳ รอผู้เล่นคนที่ 2 กรอกรหัสเข้ามา...";
            startPolling();
        } else {
            alert(result.message);
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
    playerOName = user;

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "joinRoom", roomId: roomId, playerEmail: user })
        });
        const result = await res.json();
        if (result.status === "success") {
            currentRoomId = roomId;
            myRole = "2";
            onlineLobby.classList.add('hidden');
            gameArea.classList.remove('hidden');
            bestRecordBanner.classList.add('hidden');
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
        if (!currentRoomId || isSyncing) return;

        isSyncing = true;
        try {
            const res = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify({ action: "getRoomStatus", roomId: currentRoomId })
            });
            const data = await res.json();

            if (data.status === "success") {
                playerXName = data.playerX;
                playerOName = data.playerO || "รอผู้เล่น...";
                
                turnIndicator.classList.remove('hidden');
                scoreBoardContainer.innerHTML = `<span id="p1Label">${playerXName}: <strong id="p1Score">${data.scores[1]}</strong> คู่</span> | <span id="p2Label">${playerOName}: <strong id="p2Score">${data.scores[2]}</strong> คู่</span>`;

                if (data.roomStatus === "playing" && onlineLobby.classList.contains('hidden') === false) {
                    onlineLobby.classList.add('hidden');
                    gameArea.classList.remove('hidden');
                    bestRecordBanner.classList.add('hidden');
                    initOnlineBoard(data.cards);
                }

                if (data.roomStatus === "playing") {
                    currentTurn = parseInt(data.currentTurn);
                    scores = data.scores;
                    document.getElementById('p1Score').innerText = scores[1];
                    document.getElementById('p2Score').innerText = scores[2];
                    updateTurnDisplay();
                    updateBoardState(data.cards);
                }

                if (data.roomStatus === "finished" || data.winner) {
                    endGameUI(data.winner);
                }
            }
        } catch (e) {
            console.error("Polling error:", e);
        } finally {
            isSyncing = false;
        }
    }, 1500);
}

function initOnlineBoard(cardsArray) {
    if (cardGrid.children.length > 0) return;
    cardGrid.innerHTML = '';
    gameCardsState = cardsArray.map((icon, index) => ({
        id: index,
        icon: icon,
        flipped: false,
        matched: false
    }));

    gameCardsState.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.dataset.index = index;
        cardEl.innerHTML = `
            <div class="card-face card-front">❓</div>
            <div class="card-face card-back">${card.icon}</div>
        `;
        cardEl.addEventListener('click', () => handleOnlineCardClick(index));
        cardGrid.appendChild(cardEl);
    });
}

function updateBoardState(serverCards) {
    serverCards.forEach((srvCard, index) => {
        const cardEl = cardGrid.children[index];
        if (!cardEl) return;

        if (srvCard.flipped && !cardEl.classList.contains('flipped')) {
            cardEl.classList.add('flipped');
        } else if (!srvCard.flipped && cardEl.classList.contains('flipped')) {
            cardEl.classList.remove('flipped');
        }

        if (srvCard.matched && !cardEl.classList.contains('matched')) {
            cardEl.classList.add('matched');
        }
    });
}

async function handleOnlineCardClick(index) {
    if (currentTurn.toString() !== myRole) {
        alert("ยังไม่ใช่ตาของคุณ!");
        return;
    }

    let flippedCount = gameCardsState.filter(c => c.flipped && !c.matched).length;
    if (flippedCount >= 2 || gameCardsState[index].flipped || gameCardsState[index].matched) return;

    gameCardsState[index].flipped = true;
    updateBoardStateLocally();

    let activeFlipped = gameCardsState.filter(c => c.flipped && !c.matched);

    if (activeFlipped.length === 2) {
        if (activeFlipped[0].icon === activeFlipped[1].icon) {
            activeFlipped[0].matched = true;
            activeFlipped[1].matched = true;
            scores[myRole]++;
            
            let isFinished = gameCardsState.every(c => c.matched);
            let winner = "";
            if (isFinished) {
                if (scores[1] > scores[2]) winner = playerXName;
                else if (scores[2] > scores[1]) winner = playerOName;
                else winner = "เสมอ";
            }

            await syncToServer(gameCardsState, currentTurn, scores, isFinished ? "finished" : "playing", winner);
        } else {
            setTimeout(async () => {
                activeFlipped[0].flipped = false;
                activeFlipped[1].flipped = false;
                currentTurn = currentTurn === 1 ? 2 : 1;
                await syncToServer(gameCardsState, currentTurn, scores, "playing", "");
            }, 1000);
        }
    } else {
        await syncToServer(gameCardsState, currentTurn, scores, "playing", "");
    }
}

function updateBoardStateLocally() {
    gameCardsState.forEach((card, index) => {
        const cardEl = cardGrid.children[index];
        if (card.flipped) cardEl.classList.add('flipped');
        else cardEl.classList.remove('flipped');
        if (card.matched) cardEl.classList.add('matched');
    });
}

async function syncToServer(cards, turn, roomScores, status, winner) {
    try {
        await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "updateGameState",
                roomId: currentRoomId,
                cards: cards,
                currentTurn: turn,
                scores: roomScores,
                roomStatus: status,
                winner: winner
            })
        });
    } catch (e) {
        console.error("Sync error:", e);
    }
}

function updateTurnDisplay() {
    if (currentTurn.toString() === myRole) {
        turnIndicator.innerText = "🎯 ตาของคุณ!";
        turnIndicator.className = "turn-indicator p1-turn";
    } else {
        turnIndicator.innerText = `⏳ ตาของฝ่ายตรงข้าม...`;
        turnIndicator.className = "turn-indicator p2-turn";
    }
}

function endGameUI(winner) {
    clearInterval(pollInterval);
    if (winner === "เสมอ") {
        winnerText.innerText = "🤝 เสมอกัน!";
    } else {
        winnerText.innerText = `🎉 ${winner} ชนะแล้ว!`;
    }
    finalScoreText.innerText = `คะแนน: ${playerXName} (${scores[1]}) - ${playerOName} (${scores[2]})`;
    gameMessage.classList.remove('hidden');
}

// รองรับการกดปุ่ม 'R', 'r' หรือ 'พ' บนคีย์บอร์ดเพื่อเริ่มใหม่
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R' || e.key === 'พ' || e.key === 'P') {
        if (!gameArea.classList.contains('hidden')) {
            restartGame();
        }
    }
});