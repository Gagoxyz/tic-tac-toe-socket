const socket = io();

const form = document.getElementById('usernameForm');
const input = document.getElementById('usernameInput');
const statusDiv = document.getElementById('status');
const gameArea = document.getElementById('gameArea');
const formContainer = document.getElementById('formContainer');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = input.value.trim();
    if (!username) return;

    socket.emit('setUsername', username);
    localStorage.setItem('alias', username);

    formContainer.classList.add('hidden');
    statusDiv.classList.remove('hidden');
    statusDiv.textContent = 'Esperando a otro jugador...';
});

socket.on('waitingForPlayer', () => {
    statusDiv.textContent = 'Esperando a otro jugador...';
});

socket.on('startGame', ({ players, firstTurn }) => {
    const alias = localStorage.getItem('alias');
    const opponent = players.find((p) => p !== alias);

    statusDiv.textContent = `¡Conectado contra ${opponent}!`;

    gameArea.classList.remove('hidden');
    // Aquí luego inicializaremos el tablero de juego
});

let currentTurn;
let myTurn = false;
let mySymbol = 'X';
let opponentSymbol = 'O';

const cells = document.querySelectorAll('.cell');

// Inicializa el juego
socket.on('startGame', ({ players, firstTurn }) => {
    const alias = localStorage.getItem('alias');
    const opponent = players.find((p) => p !== alias);

    statusDiv.textContent = `¡Conectado contra ${opponent}!`;

    gameArea.classList.remove('hidden');

    // Determina símbolo
    myTurn = socket.id === firstTurn;
    mySymbol = myTurn ? 'X' : 'O';
    opponentSymbol = myTurn ? 'O' : 'X';

    updateTurnStatus();
});

// Clic en celda
cells.forEach((cell) => {
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

// Recibir movimiento del oponente
socket.on('opponentMove', ({ index }) => {
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell && cell.textContent === '') {
        cell.textContent = opponentSymbol;
        cell.classList.add('disabled');
    }

    myTurn = true;

    const result = checkGameOver();
    if (result) handleGameOver(result);

    updateTurnStatus();
});

// Actualiza estado de turno
function updateTurnStatus() {
    statusDiv.textContent = myTurn ? 'Tu turno' : 'Turno del oponente';
}

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6]             // diagonales
];

function checkGameOver() {
    const cellValues = Array.from(cells).map(cell => cell.textContent);

    // Verificar victoria
    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (
            cellValues[a] &&
            cellValues[a] === cellValues[b] &&
            cellValues[a] === cellValues[c]
        ) {
            return cellValues[a]; // 'X' o 'O'
        }
    }

    // Verificar empate
    const isDraw = cellValues.every(value => value !== '');
    if (isDraw) return 'draw';

    return null; // El juego continúa
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

  // Desactivar todas las celdas
  cells.forEach(cell => cell.classList.add('disabled'));
}
