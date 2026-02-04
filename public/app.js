const socket = io();
const localVideo = document.getElementById('localVideo');
const unmoderatedBtn = document.getElementById('unmoderatedBtn');
const statusText = document.getElementById('statusText');

let localStream;

// Funktion um die Kamera zu starten
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert("Kamera-Zugriff verweigert oder nicht verfügbar!");
        console.error(err);
    }
}

if (unmoderatedBtn) {
    unmoderatedBtn.addEventListener('click', async () => {
        unmoderatedBtn.disabled = true;
        unmoderatedBtn.innerText = "Suche läuft...";
        statusText.innerText = "Kamera wird vorbereitet...";
        
        // Kamera beim Klick schon mal anfordern (bessere UX)
        await startCamera();
        
        statusText.innerText = "Suche Partner...";
        socket.emit('find-match');
    });
}

socket.on('match-found', (data) => {
    statusText.innerText = "Verbunden!";
    alert("Partner gefunden! Ihr könnt euch jetzt sehen.");
    
    // HINWEIS: Für die echte Video-Übertragung zwischen zwei Personen 
    // bräuchtest du "WebRTC". Das ist der nächste große Schritt.
});
