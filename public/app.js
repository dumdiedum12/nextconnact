const socket = io();

function startChat(mode) {
  socket.emit("find-match");
}

socket.on("match-found", () => {
  alert("Match gefunden – Video folgt");
});