const socket = io();
const localVideo = document.getElementById('localVideo');
const unmoderatedBtn = document.getElementById('unmoderatedBtn');
const statusText = document.getElementById('statusText');

// 1. Alter aus der URL auslesen (kommt von der index.html)
const urlParams = new URLSearchParams(window.location.search);
const userAge = urlParams.get('age') || 'unknown';

let localStream;

// 2. Kamera-Funktion
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
    } catch (err) {
        alert("Bitte erlaube den Kamera-Zugriff!");
        console.error(err);
    }
}

// 3. Suche starten
if (unmoderatedBtn) {
    unmoderatedBtn.addEventListener('click', async () => {
        unmoderatedBtn.disabled = true;
        unmoderatedBtn.innerText = "Suche läuft...";
        statusText.innerText = "Kamera wird gestartet...";
        
        // Erst Kamera an
        await startCamera();
        
        statusText.innerText = `Suche Partner (${userAge === 'adult' ? '18+' : 'U18'})...`;
        
        // WICHTIG: Hier senden wir das Alter an deine neue server.js
        socket.emit('find-match', { ageGroup: userAge });
    });
}

// 4. Match gefunden
socket.on('match-found', () => {
    statusText.innerText = "Partner gefunden! Verbindung steht.";
    alert("Ein Partner wurde gefunden!");
});
