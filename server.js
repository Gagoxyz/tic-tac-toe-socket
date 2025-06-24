const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'public')))

let waitingPlayer = null

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`)

    socket.on('setUsername', (username) => {
        socket.username = username

        if (waitingPlayer) {
            const room = `room-${waitingPlayer.id}-${socket.id}`
            socket.join(room)
            waitingPlayer.join(room)

            io.to(room).emit('startGame', {
                room,
                players: [waitingPlayer.username, socket.username],
                firstTurn: waitingPlayer.id
            })

            waitingPlayer = null
        } else {
            waitingPlayer = socket
            socket.emit('waitingForPlayer')
        }
    })

    socket.on('disconnect', () => {
        console.log(`Jugador desconectado: ${socket.id}`)
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null
        }
        // se podría inidcar que el jugar ha dejado la sala
    })

    socket.on('playMove', ({ index }) => {
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        if (rooms.length === 0) return;

        const room = rooms[0];
        socket.to(room).emit('opponentMove', { index });
    });

    socket.on('gameOver', ({ result }) => {
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        if (rooms.length === 0) return;

        const room = rooms[0];
        socket.to(room).emit('gameEnded', { result });
    });

})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`))