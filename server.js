const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

require('dotenv').config();
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;
const rooms = {};
const victories = {};

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    socket.on('setUsername', (username) => {
        socket.username = username;

        if (waitingPlayer) {
            const room = `${waitingPlayer.id}#${socket.id}`;
            socket.join(room);
            waitingPlayer.join(room);

            rooms[room] = {
                players: [waitingPlayer.id, socket.id],
                rematchVotes: new Set()
            };

            const playerColors = {
                [waitingPlayer.username]: '#CCFF00',
                [socket.username]: '#4FC3F7'
            };

            io.to(waitingPlayer.id).emit('startGame', {
                yourAlias: waitingPlayer.username,
                opponentAlias: socket.username,
                firstTurn: waitingPlayer.id,
                playerColors
            });

            io.to(socket.id).emit('startGame', {
                yourAlias: socket.username,
                opponentAlias: waitingPlayer.username,
                firstTurn: waitingPlayer.id,
                playerColors
            });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waitingForPlayer');
        }
    });

    socket.on('playMove', ({ index }) => {
        const room = Array.from(socket.rooms).find((r) => r !== socket.id);
        if (room) {
            socket.to(room).emit('opponentMove', { index });
        }
    });

    socket.on('gameOver', ({ result, winnerId }) => {
        const room = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!room) return;

        let winnerUsername = null;

        if (winnerId) {
            const winnerSocket = io.sockets.sockets.get(winnerId);
            if (winnerSocket?.username) {
                winnerUsername = winnerSocket.username;
                victories[winnerUsername] = (victories[winnerUsername] || 0) + 1;
            }
        }

        io.to(room).emit('gameEnded', {
            result,
            victories
        });
    });

    socket.on('requestRematch', async () => {
        const room = Array.from(socket.rooms).find((r) => r !== socket.id);
        if (!room || !rooms[room]) return;

        rooms[room].rematchVotes.add(socket.id);

        if (rooms[room].rematchVotes.size === 2) {
            rooms[room].rematchVotes.clear();

            const socketsInRoom = await io.in(room).fetchSockets();
            const first = socketsInRoom[Math.floor(Math.random() * 2)];

            io.to(room).emit('startRematch', {
                firstTurn: first.id
            });
        }
    });

    socket.on('chatMessage', ({ message }) => {
        const room = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!room) return;

        const from = socket.username || 'Anónimo';
        io.to(room).emit('chatMessage', {
            from,
            message,
            senderId: socket.id
        });
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en puerto:${port}`);
});