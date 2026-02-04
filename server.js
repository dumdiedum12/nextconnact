import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 1. Statische Dateien aus dem "public" Ordner laden
// Das sorgt dafür, dass index.html, CSS und JS gefunden werden
app.use(express.static(path.join(process.cwd(), "public")));

// 2. Die Hauptroute für die Startseite
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// 3. Deine Socket.io Logik (Matching-System)
let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Ein User hat sich verbunden:", socket.id);

  socket.on("find-match", () => {
    if (waitingUser && waitingUser.id !== socket.id) {
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
    if (waitingUser === socket) {
      waitingUser = null;
    }
    console.log("User getrennt:", socket.id);
  });
});

// 4. Port-Bindung für Vercel
// WICHTIG: Wir lassen den 'server' listen, nicht nur die 'app'!
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
