import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", (socket) => {

  socket.on("find-match", () => {
    if (waitingUser && waitingUser !== socket) {
      const room = `${waitingUser.id}#${socket.id}`;
      waitingUser.join(room);
      socket.join(room);

      waitingUser.emit("match-found", { initiator: true });
      socket.emit("match-found", { initiator: false });

      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT);