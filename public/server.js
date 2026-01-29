import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

const queues = { moderated: {}, unmoderated: {} };
let stats = { male: 0, female: 0, other: 0 };

io.on("connection", socket => {
  socket.on("join", async ({ mode, interests, gender }) => {
    socket.mode = mode;
    socket.interests = interests?.length > 0 ? interests : ["any"];
    socket.gender = gender || "other";

    if (stats[socket.gender] !== undefined) {
      stats[socket.gender]++;
      io.emit("stats", stats);
    }

    queues[mode] = queues[mode] || {};

    for (const interest of socket.interests) {
      queues[mode][interest] = queues[mode][interest] || [];
      if (queues[mode][interest].length > 0) {
        const partner = queues[mode][interest].shift();
        await connect(socket, partner);
        return;
      }
    }

    queues[mode]["any"] = queues[mode]["any"] || [];
    queues[mode]["any"].push(socket);
  });

  socket.on("next", () => disconnectPartner(socket));

  socket.on("signal", data => {
    if (socket.partner) socket.partner.emit("signal", data);
  });

  socket.on("disconnect", () => {
    disconnectPartner(socket);
    if (stats[socket.gender] !== undefined) {
      stats[socket.gender]--;
      io.emit("stats", stats);
    }
  });

  async function getCountry(socket) {
    const ip = socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
               socket.handshake.address ||
               "127.0.0.1";

    try {
      let res = await fetch(`http://ip-api.com/json/${ip}?fields=country`);
      if (res.ok) {
        const data = await res.json();
        if (data.country) return data.country;
      }

      res = await fetch(`https://ipinfo.io/${ip}/json`);
      if (res.ok) {
        const data = await res.json();
        if (data.country) return data.country;
      }

      return "Unbekannt";
    } catch {
      return "Unbekannt";
    }
  }

  async function connect(a, b) {
    try {
      a.partner = b;
      b.partner = a;

      const [countryA, countryB] = await Promise.all([
        getCountry(a),
        getCountry(b)
      ]);

      a.emit("match-countdown", 3);
      b.emit("match-countdown", 3);

      setTimeout(() => {
        a.emit("matched", { country: countryB });
        b.emit("matched", { country: countryA });
      }, 3200);
    } catch (err) {
      console.error("Verbindungsfehler:", err);
      disconnectPartner(a);
      disconnectPartner(b);
    }
  }

  function disconnectPartner(s) {
    if (s.partner) {
      s.partner.emit("partner-left");
      s.partner.partner = null;
      s.partner = null;
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
