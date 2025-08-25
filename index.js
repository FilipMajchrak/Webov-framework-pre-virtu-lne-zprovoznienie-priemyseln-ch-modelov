#!/usr/bin/env node
/* eslint-disable no-console */
const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");

// --- Voliteľné: načítaj .env, ak je k dispozícii (bez pádu, ak nie je) ---
try { require("dotenv").config(); } catch {}

// --- WebSocket + Modbus ---
const { WebSocketServer } = require("ws");
const ModbusRTU = require("modbus-serial");

// ======= KONFIGURÁCIA =======
const HTTP_PORT  = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 0; // 0 => auto
const NO_OPEN    = String(process.env.NO_OPEN || "").toLowerCase() === "true";
const MODBUS_PORT= parseInt(process.env.MB_PORT  || "1502", 10);
const MB_UNIT_ID = parseInt(process.env.MB_UNIT  || "1",    10);
const TICK_MS    = parseInt(process.env.TICK_MS  || "100",  10);

// ======= VERZIA APLIKÁCIE / RUNTIME (len log) =======
let appVersion = "embedded";
try {
  const pkgDev = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  if (pkgDev?.version) appVersion = pkgDev.version;
} catch {
  try {
    const pkgSnap = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
    if (pkgSnap?.version) appVersion = pkgSnap.version;
  } catch {
    if (process.env.APP_VERSION) appVersion = process.env.APP_VERSION;
  }
}

function openUrl(url) {
  if (NO_OPEN) return;
  const platform = os.platform();
  if (platform === "win32") exec(`start "" "${url}"`, { windowsHide: true });
  else if (platform === "darwin") exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

const root = __dirname;
const app = express();

// Hlavičky pre WebWorker/WASM (Physijs/Ammo)
app.use((_, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(
  express.static(root, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
      if (filePath.endsWith(".js"))   res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    },
  })
);

// Základné health-check endpointy
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/readyz",  (_req, res) => res.status(200).json({ ok: true }));

// Spusti HTTP
const server = app.listen(HTTP_PORT, () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;

  console.log(`🚀 Spúšťam ST Simulátor v${appVersion}, Node.js ${process.version}`);
  try {
    const wsPkgPath = require.resolve("ws/package.json");
    const mbPkgPath = require.resolve("modbus-serial/package.json");
    const wsVer = JSON.parse(fs.readFileSync(wsPkgPath, "utf8")).version;
    const mbVer = JSON.parse(fs.readFileSync(mbPkgPath, "utf8")).version;
    console.log(`🔌 Knižnice: ws v${wsVer}, modbus-serial v${mbVer}`);
  } catch {}
  console.log(`🌐 Simulátor beží na ${url}`);
  try { openUrl(url); } catch {}
});

// =========================
// WEBSOCKET (zdieľa HTTP)
// =========================
const wss = new WebSocketServer({ server });
console.log("WS: WebSocket server pripojený k Expressu (rovnaký port).");

// IO z prehliadača budeme držať tu
let IO = {
  inputs:  { start: false, stop: false },
  outputs: { dist1: 0, motorRun: false },
};

let lastBrowserClient = null;

// Ping/pong pre zistenie mŕtveho spojenia
const wsHeartbeat = (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
};

wss.on("connection", (ws) => {
  lastBrowserClient = ws;
  wsHeartbeat(ws);
  console.log("WS: simulátor pripojený");

  ws.send(JSON.stringify({ type: "sync", IO }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "io" && data.IO) IO = data.IO;
    } catch (e) {
      console.warn("WS: neviem parsovať správu:", e.message);
    }
  });

  ws.on("close", () => {
    if (lastBrowserClient === ws) lastBrowserClient = null;
    console.log("WS: simulátor odpojený");
  });

  ws.on("error", (err) => {
    console.warn("WS: chyba spojenia:", err?.message || err);
  });
});

// Serverový interval: ping všetkým klientom
const wsPingTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 10000);

// Heartbeat správa do posledného klienta (voliteľné UI)
const wsHbTimer = setInterval(() => {
  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "hb", ts: Date.now() }));
  }
}, 1000);

// =========================
// MODBUS TCP SLAVE
// =========================
const setBit = (buf, bitIndex, value) => {
  const byte = bitIndex >> 3;
  const bit  = bitIndex & 7;
  const mask = 1 << bit;
  const current = buf[byte] || 0;
  buf[byte] = value ? (current | mask) : (current & ~mask);
};
const getBit = (buf, bitIndex) => {
  const byte = bitIndex >> 3;
  const bit  = bitIndex & 7;
  return ((buf[byte] >> bit) & 1) === 1;
};

const vector = {
  holding:  Buffer.alloc(400),
  input:    Buffer.alloc(200),
  coils:    Buffer.alloc(64),
  discrete: Buffer.alloc(64),
};

const serverTCP = new ModbusRTU.ServerTCP(
  vector,
  {
    host: "0.0.0.0",
    port: MODBUS_PORT,
    unitID: MB_UNIT_ID,
    debug: true,
  },
  () => {
    console.log(`✅ MB: Modbus TCP slave beží na porte ${MODBUS_PORT}, UnitID=${MB_UNIT_ID}`);
  }
);

// ERROR LOGY servera
serverTCP.on("error", (err) => {
  console.error("[MB] Server error:", err.code || err.message);
});

// ⚡ LOGOVANIE TCP spojení (podpora oboch polí: server aj _server)
const attachConnLogger = (srv) => {
  if (!srv) return;
  srv.on("connection", (socket) => {
    console.log("[MB] nový klient pripojený:", socket.remoteAddress, "port", socket.remotePort);
    socket.on("data", (data) => console.log("[MB] RAW:", data.toString("hex")));
    socket.on("close", () => console.log("[MB] klient odpojený:", socket.remoteAddress));
    socket.on("error", (err) => console.error("[MB] socket error:", err.message));
  });
};
attachConnLogger(serverTCP.server);
attachConnLogger(serverTCP._server);

// Logovanie čítania a zápisov
serverTCP.on("postWriteSingleCoil", (addr, value) => {
  console.log(`[MB] writeCoil @${addr + 1} = ${value}`);
});
serverTCP.on("postWriteSingleRegister", (addr, value) => {
  console.log(`[MB] writeHolding @${40001 + addr} = ${value}`);
});
serverTCP.on("postReadInputRegisters", (addr, qty) => {
  console.log(`[MB] readInputRegs @${30001 + addr}..${30001 + addr + qty - 1}`);
});
serverTCP.on("postReadHoldingRegisters", (addr, qty) => {
  console.log(`[MB] readHolding @${40001 + addr}..${40001 + addr + qty - 1}`);
});
serverTCP.on("postReadCoils", (addr, qty) => {
  console.log(`[MB] readCoils @${addr + 1}..${addr + qty}`);
});
serverTCP.on("postReadDiscreteInputs", (addr, qty) => {
  console.log(`[MB] readDiscreteInputs @${10001 + addr}..${10001 + addr + qty - 1}`);
});
serverTCP.on("postWriteMultipleCoils", (addr, qty) => {
  console.log(`[MB] writeMultiCoils @${addr + 1} qty=${qty}`);
});
serverTCP.on("postWriteMultipleRegisters", (addr, qty) => {
  console.log(`[MB] writeMultiHolding @${40001 + addr}..${40001 + addr + qty - 1}`);
});

// Pomocné funkcie pre wordy
const writeU16BE = (buf, regIndex, value) => buf.writeUInt16BE((value >>> 0) & 0xffff, regIndex * 2);
const readU16BE  = (buf, regIndex)       => buf.readUInt16BE(regIndex * 2);

// Mapovanie IO <-> Modbus
function ioToModbus() {
  setBit(vector.coils, 0,  !!IO.inputs.start);
  setBit(vector.coils, 1,  !!IO.inputs.stop);
  setBit(vector.coils, 10, !!IO.outputs.motorRun);
  setBit(vector.discrete, 0, !!IO.outputs.motorRun);

  const dist100 = Math.max(0, Math.round((IO.outputs.dist1 || 0) * 100));
  writeU16BE(vector.holding, 0, dist100);
  writeU16BE(vector.input,   0, dist100);
}

function modbusToIo() {
  IO.inputs.start = !!getBit(vector.coils, 0);
  IO.inputs.stop  = !!getBit(vector.coils, 1);

  const distPLC = readU16BE(vector.holding, 1);
  if (!Number.isNaN(distPLC)) IO.outputs.dist1 = distPLC / 100.0;

  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "sync", IO }));
  }
}

const tick = setInterval(() => {
  try {
    ioToModbus();
    modbusToIo();
  } catch (e) {
    console.warn("Tick error:", e?.message || e);
  }
}, TICK_MS);

// Log chýb
process.on("uncaughtException",  (err) => console.error("Uncaught:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err));

// Graceful shutdown
function shutdown(sig = "SIGTERM") {
  console.log(`\n🔻 ${sig} prijatý – ukončujem...`);

  clearInterval(tick);
  clearInterval(wsPingTimer);
  clearInterval(wsHbTimer);

  try { wss.close(() => console.log("WS: ukončené.")); } catch {}
  try { server.close(() => console.log("HTTP: ukončené.")); } catch {}
  try {
    if (serverTCP?._server) serverTCP._server.close(() => console.log("MB: ukončené."));
    else if (serverTCP?.server) serverTCP.server.close(() => console.log("MB: ukončené."));
  } catch {}

  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
