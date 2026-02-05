import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let waitingAdult = null;
let waitingMinor = null;

io.on('connection', (socket) => {
    console.log('Nutzer verbunden:', socket.id);

    socket.on('find-match', (data) => {
        const ageGroup = data.ageGroup;
        let partner = (ageGroup === 'adult') ? waitingAdult : waitingMinor;

        if (partner && partner.id !== socket.id) {
            socket.partnerId = partner.id;
            partner.partnerId = socket.id;

            io.to(partner.id).emit('match-found', { initiator: true });
            socket.emit('match-found', { initiator: false });

            if (ageGroup === 'adult') waitingAdult = null;
            else waitingMinor = null;
        } else {
            if (ageGroup === 'adult') waitingAdult = socket;
            else waitingMinor = socket;
        }
    });

    socket.on('next-partner', () => {
        if (socket.partnerId) {
            io.to(socket.partnerId).emit('partner-disconnected');
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) partnerSocket.partnerId = null;
            socket.partnerId = null;
        }
    });

    socket.on('offer', (offer) => {
        if (socket.partnerId) io.to(socket.partnerId).emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        if (socket.partnerId) io.to(socket.partnerId).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
        if (socket.partnerId) io.to(socket.partnerId).emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
        if (socket.partnerId) io.to(socket.partnerId).emit('partner-disconnected');
        if (waitingAdult === socket) waitingAdult = null;
        if (waitingMinor === socket) waitingMinor = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
