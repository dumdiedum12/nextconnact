const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Zwei getrennte Wartelisten für maximale Sicherheit
let waitingAdult = null;
let waitingMinor = null;

io.on('connection', (socket) => {
    console.log('Ein Nutzer hat sich verbunden:', socket.id);

    socket.on('find-match', (data) => {
        const ageGroup = data.ageGroup; // Empfängt 'adult' oder 'minor'
        console.log(`Suche Match für Gruppe: ${ageGroup}`);

        if (ageGroup === 'adult') {
            // Logik für Erwachsene
            if (waitingAdult && waitingAdult.id !== socket.id) {
                io.to(waitingAdult.id).emit('match-found');
                socket.emit('match-found');
                console.log('Match für Erwachsene gefunden!');
                waitingAdult = null;
            } else {
                waitingAdult = socket;
            }
        } else {
            // Logik für unter 18-Jährige
            if (waitingMinor && waitingMinor.id !== socket.id) {
                io.to(waitingMinor.id).emit('match-found');
                socket.emit('match-found');
                console.log('Match für U18 gefunden!');
                waitingMinor = null;
            } else {
                waitingMinor = socket;
            }
        }
    });

    socket.on('disconnect', () => {
        if (waitingAdult && waitingAdult.id === socket.id) waitingAdult = null;
        if (waitingMinor && waitingMinor.id === socket.id) waitingMinor = null;
        console.log('Nutzer getrennt');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
