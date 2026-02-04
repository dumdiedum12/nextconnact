// Verbindung zum Socket.io-Server herstellen
const socket = io();

const unmoderatedBtn = document.getElementById('unmoderatedBtn');
const statusText = document.getElementById('statusText');

if (unmoderatedBtn) {
    unmoderatedBtn.addEventListener('click', () => {
        // Feedback für den User
        unmoderatedBtn.disabled = true;
        unmoderatedBtn.innerText = "Suche...";
        statusText.innerText = "Wir suchen einen Partner für dich...";

        // Sendet das Signal "find-match" an deine server.js (Zeile 19)
        socket.emit('find-match');
    });
}

// Wenn deine server.js ein Match findet (Zeile 26)
socket.on('match-found', (data) => {
    statusText.innerText = "Partner gefunden! Verbindung wird hergestellt...";
    console.log("Verbunden mit Match:", data);
    
    // Test-Meldung
    alert("Ein Partner wurde gefunden!");
});
