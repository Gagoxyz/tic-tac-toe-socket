const socket = io();

const aliasInput = document.getElementById('aliasInput');
const startBtn = document.getElementById('startBtn');
const gameArea = document.getElementById('game');
const statusDiv = document.getElementById('status');
const board = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const restartBtn = document.getElementById('restartBtn');

let mySymbol = '';
let opponentSymbol = '';
let myTurn = false;
let socketId;
let rematchRequested = false;

socket.on('connect', () => {
    socketId = socket.id;
});

startBtn.addEventListener('click', () => {
    const alias = aliasInput.value.trim();
    if (!alias) return;

    localStorage.setItem('alias', alias);
    socket.emit('setUsername', alias);
    document.getElementById('login').classList.add('hidden');
    gameArea.classList.remove('hidden');
});

socket.on('waitingForPlayer', () => {
    statusDiv.textContent = 'Esperando a otro jugador...';
    loader.classList.remove('hidden');
});

socket.on('startGame', ({ players, firstTurn }) => {
    loader.classList.add('hidden');
    const alias = localStorage.getItem('alias');
    const opponent = players.find(p => p !== alias);
    statusDiv.textContent = `¡Conectado contra ${opponent}!`;

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

    if (result === 'draw') {
        statusDiv.textContent = 'Empate 🤝';
    } else if (result === mySymbol) {
        statusDiv.textContent = '¡Has ganado! 🎉';
    } else {
        statusDiv.textContent = 'Has perdido 😢';
    }

    cells.forEach(cell => cell.classList.add('disabled'));
    restartBtn.classList.remove('hidden');
    socket.emit('gameOver', { result });
}

socket.on('gameEnded', ({ result }) => {
    myTurn = false;

    if (result === 'draw') {
        statusDiv.textContent = 'Empate 🤝';
    } else if (result === opponentSymbol) {
        statusDiv.textContent = 'Has perdido 😢';
    } else {
        statusDiv.textContent = '¡Has ganado! 🎉';
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