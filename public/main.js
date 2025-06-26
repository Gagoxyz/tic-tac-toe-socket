const socket = io();

const aliasInput = document.getElementById('aliasInput');
const startBtn = document.getElementById('startBtn');
const gameArea = document.getElementById('game');
const statusDiv = document.getElementById('status');
const board = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const restartBtn = document.getElementById('restartBtn');
const playerInfo = document.getElementById('playerInfo');
const yourNameSpan = document.getElementById('yourName');
const opponentNameSpan = document.getElementById('opponentName');
const yourWinsSpan = document.getElementById('yourWins');
const gameInfo = document.querySelector('.gameInfo');

let mySymbol = '';
let opponentSymbol = '';
let myTurn = false;
let socketId;
let rematchRequested = false;
let username = '';
let opponent = '';
let wins = 0;

socket.on('connect', () => {
    socketId = socket.id;
    localStorage.clear();
});

startBtn.addEventListener('click', () => {
    const alias = aliasInput.value.trim();
    if (!alias) return;

    localStorage.setItem('alias', alias);
    socket.emit('setUsername', alias);
    document.getElementById('login').classList.add('hidden');
    gameArea.classList.remove('hidden');

    if (gameInfo) gameInfo.style.display = 'none';
});

aliasInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        startBtn.click();
    }
});

socket.on('waitingForPlayer', () => {
    statusDiv.textContent = 'Esperando a otro jugador...';
    loader.classList.remove('hidden');
});

let aliasColors = {};

socket.on('startGame', ({ yourAlias, opponentAlias, firstTurn, playerColors }) => {
    loader.classList.add('hidden');

    username = yourAlias;
    opponent = opponentAlias;
    aliasColors = playerColors;

    statusDiv.textContent = `¡Conectado contra ${opponent}!`;

    yourNameSpan.textContent = username;
    opponentNameSpan.textContent = opponent;

    const savedWins = localStorage.getItem(`${username}_wins`);
    wins = savedWins ? parseInt(savedWins) : 0;
    yourWinsSpan.textContent = wins;

    playerInfo.classList.remove('hidden');

    myTurn = socketId === firstTurn;
    mySymbol = myTurn ? 'X' : 'O';
    opponentSymbol = myTurn ? 'O' : 'X';

    updateTurnStatus();
});

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (!myTurn || cell.textContent !== '') return;

        const index = cell.dataset.index;
        cell.textContent = mySymbol;
        cell.classList.add('disabled');

        socket.emit('playMove', { index });
        myTurn = false;

        const result = checkGameOver();
        if (result) handleGameOver(result);
        updateTurnStatus();
    });
});

socket.on('opponentMove', ({ index }) => {
    const cell = cells[index];
    cell.textContent = opponentSymbol;
    cell.classList.add('disabled');
    myTurn = true;

    const result = checkGameOver();
    if (result) handleGameOver(result);
    updateTurnStatus();
});

function updateTurnStatus() {
    if (myTurn) {
        statusDiv.textContent = 'Tu turno';
    } else {
        statusDiv.textContent = 'Turno del oponente';
    }
}

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkGameOver() {
    const values = Array.from(cells).map(c => c.textContent);

    for (const [a, b, c] of winningCombinations) {
        if (values[a] && values[a] === values[b] && values[a] === values[c]) {
            return values[a];
        }
    }

    if (values.every(v => v !== '')) return 'draw';
    return null;
}

function handleGameOver(result) {
    myTurn = false;

    let winnerId = null;
    if (result !== 'draw') {
        winnerId = (result === mySymbol) ? socketId : null;
    }

    if (result === 'draw') {
        statusDiv.textContent = 'Empate 🤝';
    } else if (result === mySymbol) {
        statusDiv.textContent = '¡Has ganado! 🎉';
    } else {
        statusDiv.textContent = 'Has perdido 😢';
    }

    cells.forEach(cell => cell.classList.add('disabled'));
    restartBtn.classList.remove('hidden');

    socket.emit('gameOver', { result, winnerId });
}

socket.on('gameEnded', ({ result, victories: allVictories }) => {
    myTurn = false;

    if (result === 'draw') {
        statusDiv.textContent = 'Empate 🤝';
    } else if (result === opponentSymbol) {
        statusDiv.textContent = 'Has perdido 😢';
    } else {
        statusDiv.textContent = '¡Has ganado! 🎉';
    }

    const newWins = allVictories?.[username];
    if (newWins != null) {
        wins = newWins;
        localStorage.setItem(`${username}_wins`, wins);
        yourWinsSpan.textContent = wins;
    }

    const opponentWinsEl = document.getElementById('opponentWins');
    if (opponentWinsEl && allVictories?.[opponent] != null) {
        opponentWinsEl.textContent = allVictories[opponent];
    }

    cells.forEach(cell => cell.classList.add('disabled'));
    restartBtn.classList.remove('hidden');
});

restartBtn.addEventListener('click', () => {
    restartBtn.disabled = true;
    restartBtn.textContent = 'Esperando al oponente...';
    socket.emit('requestRematch');
});

socket.on('startRematch', ({ firstTurn }) => {
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('disabled');
    });

    restartBtn.classList.add('hidden');
    restartBtn.disabled = false;
    restartBtn.textContent = 'Volver a jugar 🔁';

    myTurn = socketId === firstTurn;
    mySymbol = myTurn ? 'X' : 'O';
    opponentSymbol = myTurn ? 'O' : 'X';

    updateTurnStatus();
});

const toggleChatBtn = document.getElementById('toggleChatBtn');
const chatBox = document.getElementById('chatBox');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

// Mostrar el botón una vez inicia la partida
socket.on('startGame', () => {
    toggleChatBtn.classList.remove('hidden');
});

toggleChatBtn.addEventListener('click', () => {
    chatBox.classList.toggle('hidden');
});

// Enviar mensaje
sendChatBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { message });
        chatInput.value = '';
    }
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendChatBtn.click();
    }
});

socket.on('chatMessage', ({ from, message }) => {
    appendMessage(from, message);
});

function appendMessage(from, message) {
    const p = document.createElement('p');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${from}: `;
    nameSpan.style.color = aliasColors[from] || 'white';
    nameSpan.style.fontWeight = 'bold';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    msgSpan.style.color = 'white';

    p.appendChild(nameSpan);
    p.appendChild(msgSpan);

    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}