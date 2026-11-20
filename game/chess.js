var board = null;
var game = new Chess();
var statusEl = document.getElementById('statusText');
var gameMessage = document.getElementById('gameMessage');
var winnerText = document.getElementById('winnerText');
var finalScoreText = document.getElementById('finalScoreText');
var moveHistoryEl = document.getElementById('moveHistory');

var selectedSquare = null;

// --- ระบบเสียง ---
let audioCtx = null;

function playAudioFromUrl(url) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
            .then(decodedAudio => {
                let source = audioCtx.createBufferSource();
                source.buffer = decodedAudio;

                let gainNode = audioCtx.createGain();
                gainNode.gain.value = 3.0;

                source.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                source.start(0);
            })
            .catch(() => {
                let fallbackAudio = new Audio(url);
                fallbackAudio.volume = 1.0;
                fallbackAudio.play().catch(() => {});
            });
    } catch (e) {
        let fallbackAudio = new Audio(url);
        fallbackAudio.volume = 1.0;
        fallbackAudio.play().catch(() => {});
    }
}

const soundMoveUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move.mp3';
const soundCaptureUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3';
const soundCheckUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/check.mp3';
const soundGameEndUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3';

// รูปภาพตัวหมากรุก SVG มาตรฐานสากลจาก Wikimedia
const pieceImages = {
    wP: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    wR: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    wN: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    wB: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    wQ: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    wK: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    bP: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    bR: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    bN: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    bB: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    bQ: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    bK: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
};

// ลบไฮไลต์ทั้งหมด
function removeGreySquares() {
    $('#board .square-55d63').removeClass('highlight-square');
}

// ใส่ไฮไลต์ช่องเดินได้
function greySquare(square) {
    var $square = $('#board .square-' + square);
    $square.addClass('highlight-square');
}

function showLegalMovesForSquare(square) {
    greySquare(square);
    var moves = game.moves({ square: square, verbose: true });
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
}

// ไฮไลต์ช่องคิงเมื่อโดนรุก
function highlightCheck() {
    $('#board .square-55d63').removeClass('in-check-square');
    if (game.in_check()) {
        var turn = game.turn();
        var boardState = game.board();
        var files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var piece = boardState[r][c];
                if (piece && piece.type === 'k' && piece.color === turn) {
                    var kingSquare = files[c] + (8 - r);
                    $('#board .square-' + kingSquare).addClass('in-check-square');
                }
            }
        }
    }
}

// อัปเดตตารางประวัติการเดินหมาก
function updateMoveHistory() {
    var history = game.history();
    var html = '';
    for (var i = 0; i < history.length; i += 2) {
        var moveNum = (i / 2) + 1;
        var whiteMove = history[i] || '';
        var blackMove = history[i + 1] || '';
        html += `<div class="move-row">
            <span class="move-num">${moveNum}.</span>
            <span>${whiteMove}</span>
            <span>${blackMove}</span>
        </div>`;
    }
    moveHistoryEl.innerHTML = html;
    moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

// เล่นเสียงตามสถานการณ์ของเกม
function playSound(moveResult) {
    if (game.in_checkmate() || game.in_draw()) {
        playAudioFromUrl(soundGameEndUrl);
    } else if (game.in_check()) {
        playAudioFromUrl(soundCheckUrl);
    } else if (moveResult && moveResult.captured) {
        playAudioFromUrl(soundCaptureUrl);
    } else {
        playAudioFromUrl(soundMoveUrl);
    }
}

// อัปเดตสถานะเกม
function updateStatus() {
    var status = '';
    var moveColor = (game.turn() === 'b')
        ? '<span class="player-black">ผู้เล่นสีดำ</span>'
        : '<span class="player-white">ผู้เล่นสีขาว</span>';

    if (game.in_checkmate()) {
        status = 'รุกฆาต! จบเกม';
        let winner = (game.turn() === 'b') ? 'ผู้เล่นสีขาว' : 'ผู้เล่นสีดำ';
        winnerText.innerText = `🎉 ${winner} ชนะแล้ว!`;
        finalScoreText.innerText = 'ทำการรุกฆาต (Checkmate) สำเร็จ';
        gameMessage.classList.remove('hidden');
    } else if (game.in_draw()) {
        status = 'เกมเสมอ (Draw)';
        winnerText.innerText = `🤝 เสมอกัน!`;
        finalScoreText.innerText = 'กระดานเสมอกันตามกฎสากล';
        gameMessage.classList.remove('hidden');
    } else {
        status = 'ตาของ: ' + moveColor;
        if (game.in_check()) {
            status += ' <span style="color: #fda4af; font-weight: 700;">(⚠️ โดนรุก!)</span>';
        }
    }
    statusEl.innerHTML = status;
    highlightCheck();
    updateMoveHistory();
}

// --- ระบบคลิกเดิน (Click-to-Move) ---
function handleSquareClick(square) {
    if (game.game_over()) return;

    if (!selectedSquare) {
        var piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
            showLegalMovesForSquare(square);
        }
    } else {
        var move = game.move({
            from: selectedSquare,
            to: square,
            promotion: 'q'
        });

        let prevSelected = selectedSquare;
        removeGreySquares();
        selectedSquare = null;

        if (move === null) {
            var piece = game.get(square);
            if (piece && piece.color === game.turn() && prevSelected !== square) {
                selectedSquare = square;
                showLegalMovesForSquare(square);
            }
            return;
        }

        board.position(game.fen());
        playSound(move);
        updateStatus();
    }
}

// เริ่มลากตัวหมาก (Drag & Drop)
function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
    selectedSquare = source;
    removeGreySquares();
    showLegalMovesForSquare(source);
}

// วางตัวหมากจากการลาก
function onDrop(source, target) {
    removeGreySquares();
    selectedSquare = null;

    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    playSound(move);
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: function(piece) {
        return pieceImages[piece];
    }
};

board = Chessboard('board', config);

$(document).ready(function() {
    $(document).on('click', '#board .square-55d63', function(e) {
        e.stopPropagation();
        var classes = $(this).attr('class').split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('square-') === 0 && classes[i] !== 'square-55d63') {
                var square = classes[i].replace('square-', '');
                handleSquareClick(square);
                break;
            }
        }
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#board').length) {
            selectedSquare = null;
            removeGreySquares();
        }
    });
});

updateStatus();

function resetGame() {
    game.reset();
    board.start();
    removeGreySquares();
    selectedSquare = null;
    $('#board .square-55d63').removeClass('in-check-square');
    gameMessage.classList.add('hidden');
    updateStatus();
}

$(window).resize(function() {
    if (board) board.resize();
});