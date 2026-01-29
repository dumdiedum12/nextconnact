const socket = io();
const mode = localStorage.getItem("mode");
const interests = JSON.parse(localStorage.getItem("interests") || "[]");
const gender = localStorage.getItem("gender") || "other";

let pc, stream, useFront = true;

function addChat(sender, msg) {
  const chat = document.getElementById("chat");
  chat.innerHTML += `<p><b>${sender}:</b> ${msg}</p>`;
  chat.scrollTop = chat.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("msg");
  if (input.value.trim() && socket.partner) {
    socket.partner.emit("chat", input.value);
    addChat("Du", input.value);
    input.value = "";
  }
}

socket.on("chat", msg => addChat("Partner", msg));

async function startStream() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: useFront ? "user" : "environment" },
      audio: true
    });
    document.getElementById("local").srcObject = stream;
  } catch (err) {
    console.error("Kamera/Mikrofon Fehler:", err);
  }
}

startStream();

function createPC() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => {
    document.getElementById("remote").srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("signal", { candidate: e.candidate });
  };
}

socket.emit("join", { mode, interests, gender });

socket.on("matched", data => {
  document.getElementById("partnerCountry").innerText = "🌍 Partner aus: " + data.country;
  createPC();
  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer).then(() => {
      socket.emit("signal", { offer });
    });
  });
});

socket.on("signal", async data => {
  if (!pc) createPC();

  if (data.offer) {
    await pc.setRemoteDescription(data.offer);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    socket.emit("signal", { answer: ans });
  }

  if (data.answer) {
    await pc.setRemoteDescription(data.answer);
  }

  if (data.candidate) {
    await pc.addIceCandidate(data.candidate);
  }
});

socket.on("partner-left", () => {
  if (pc) pc.close();
  pc = null;
  document.getElementById("remote").srcObject = null;
});

function next() {
  if (pc) pc.close();
  socket.emit("next");
}

function toggleCamera() {
  if (stream) {
    stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
  }
}

async function switchCamera() {
  useFront = !useFront;
  if (stream) stream.getTracks().forEach(t => t.stop());
  await startStream();
  if (pc) {
    pc.getSenders().forEach(s => pc.removeTrack(s));
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
  }
}

socket.on("stats", s => {
  document.getElementById("stats").innerText =
    `👩 Frauen: ${s.female} | 👨 Männer: ${s.male} | 🧑 Andere: ${s.other}`;
});

socket.on("match-countdown", sec => {
  const cd = document.getElementById("countdown");
  let counter = sec;
  cd.innerText = `⏱ Match startet in ${counter}...`;
  const interval = setInterval(() => {
    counter--;
    cd.innerText = counter > 0 ? `⏱ Match startet in ${counter}...` : "";
    if (counter <= 0) clearInterval(interval);
  }, 1000);
});
