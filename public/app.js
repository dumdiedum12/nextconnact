const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const unmoderatedBtn = document.getElementById('unmoderatedBtn');
const nextBtn = document.getElementById('nextBtn'); // Stelle sicher, dass dieser Button in deiner HTML existiert!
const statusText = document.getElementById('statusText');

const urlParams = new URLSearchParams(window.location.search);
const userAge = urlParams.get('age') || 'unknown';

let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startCamera() {
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    }
}

function stopConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
}

async function findNewMatch() {
    stopConnection();
    statusText.innerText = "Suche Partner...";
    socket.emit('find-match', { ageGroup: userAge });
}

unmoderatedBtn.addEventListener('click', async () => {
    unmoderatedBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'inline-block';
    await startCamera();
    findNewMatch();
});

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        socket.emit('next-partner');
        findNewMatch();
    });
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit('ice-candidate', event.candidate);
    };
}

socket.on('match-found', async (data) => {
    statusText.innerText = "Partner gefunden!";
    createPeerConnection();
    if (data.initiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    }
});

socket.on('offer', async (offer) => {
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('partner-disconnected', () => {
    statusText.innerText = "Partner hat verlassen. Suche neu...";
    stopConnection();
    findNewMatch();
});
