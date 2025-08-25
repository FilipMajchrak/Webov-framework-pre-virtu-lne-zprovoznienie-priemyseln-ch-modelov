#!/usr/bin/env node
/* eslint-disable no-console */
const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const net = require("net");

try { require("dotenv").config(); } catch {}

// WebSocket + Modbus (jsmodbus)
const { WebSocketServer } = require("ws");
const Modbus = require("jsmodbus");

/* =========================
   KONFIGURÁCIA
   ========================= */
const HTTP_PORT   = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 0; // 0 => auto
const NO_OPEN     = String(process.env.NO_OPEN || "").toLowerCase() === "true";
const MODBUS_PORT = parseInt(process.env.MB_PORT  || "1502", 10);
const MB_UNIT_ID  = parseInt(process.env.MB_UNIT  || "1",    10);
const TICK_MS     = parseInt(process.env.TICK_MS  || "100",  10);

/* =========================
   VERZIA (len log)
   ========================= */
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

/* =========================
   EXPRESS (statiky + hlavičky)
   ========================= */
const root = __dirname;
const app = express();

app.use((_, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(express.static(root, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
    if (filePath.endsWith(".js"))   res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  }
}));

app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/readyz",  (_req, res) => res.status(200).json({ ok: true }));

const server = app.listen(HTTP_PORT, () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;

  console.log(`🚀 Spúšťam ST Simulátor v${appVersion}, Node.js ${process.version}`);
  try {
    const wsVer = JSON.parse(fs.readFileSync(require.resolve("ws/package.json"), "utf8")).version;
    const jmVer = JSON.parse(fs.readFileSync(require.resolve("jsmodbus/package.json"), "utf8")).version;
    console.log(`🔌 Knižnice: ws v${wsVer}, jsmodbus v${jmVer}`);
  } catch {}
  console.log(`🌐 Simulátor beží na ${url}`);
  try { openUrl(url); } catch {}
});

/* =========================
   WEBSOCKET
   ========================= */
const wss = new WebSocketServer({ server });
console.log("WS: WebSocket server pripojený k Expressu (rovnaký port).");

let IO = { inputs: { start: false, stop: false }, outputs: { dist1: 0, motorRun: false } };
let lastBrowserClient = null;

const wsHeartbeat = (ws) => { ws.isAlive = true; ws.on("pong", () => { ws.isAlive = true; }); };

wss.on("connection", (ws) => {
  lastBrowserClient = ws;
  wsHeartbeat(ws);
  console.log("WS: simulátor pripojený");
  ws.send(JSON.stringify({ type: "sync", IO }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data?.type === "io" && data.IO) IO = data.IO;
    } catch (e) { console.warn("WS: neviem parsovať správu:", e.message); }
  });

  ws.on("close", () => { if (lastBrowserClient === ws) lastBrowserClient = null; console.log("WS: simulátor odpojený"); });
  ws.on("error", (err) => console.warn("WS: chyba spojenia:", err?.message || err));
});

const wsPingTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 10000);

const wsHbTimer = setInterval(() => {
  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "hb", ts: Date.now() }));
  }
}, 1000);

/* =========================
   MODBUS TCP (jsmodbus)
   ========================= */

// Bit/word helpery
const setBit = (buf, bitIndex, value) => {
  const byte = bitIndex >> 3, bit = bitIndex & 7, mask = 1 << bit;
  const cur = buf[byte] || 0;
  buf[byte] = value ? (cur | mask) : (cur & ~mask);
};
const getBit = (buf, bitIndex) => ((buf[bitIndex >> 3] >> (bitIndex & 7)) & 1) === 1;
const writeU16BE = (buf, regIndex, value) => buf.writeUInt16BE((value >>> 0) & 0xffff, regIndex * 2);
const readU16BE  = (buf, regIndex)       => buf.readUInt16BE(regIndex * 2);

// Interné „pamäte“ (dosť veľké pre OpenPLC)
const MB = {
  holding:  Buffer.alloc(400 * 2), // 400 wordov = 800 B (40001..40400)
  input:    Buffer.alloc(200 * 2), // 200 wordov = 400 B (30001..30200)
  coils:    Buffer.alloc(128),     // 1024 bitov
  discrete: Buffer.alloc(128),     // 1024 bitov
};

// IO -> MB
function ioToModbus() {
  setBit(MB.coils, 0,  !!IO.inputs.start);     // Coil 1
  setBit(MB.coils, 1,  !!IO.inputs.stop);      // Coil 2
  setBit(MB.coils, 10, !!IO.outputs.motorRun); // Coil 11

  setBit(MB.discrete, 0, !!IO.outputs.motorRun); // Input 10001

  const dist100 = Math.max(0, Math.round((IO.outputs.dist1 || 0) * 100));
  writeU16BE(MB.holding, 0, dist100); // 40001
  writeU16BE(MB.input,   0, dist100); // 30001
}

// MB -> IO
function modbusToIo() {
  IO.inputs.start = !!getBit(MB.coils, 0);
  IO.inputs.stop  = !!getBit(MB.coils, 1);
  const distPLC = readU16BE(MB.holding, 1); // 40002
  if (!Number.isNaN(distPLC)) IO.outputs.dist1 = distPLC / 100.0;

  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "sync", IO }));
  }
}

// jsmodbus server (TCP)
const netServer = net.createServer();

const modbusServer = new Modbus.server.TCP(netServer, {
  holding:  MB.holding,
  input:    MB.input,
  coils:    MB.coils,
  discrete: MB.discrete,
  unitId: MB_UNIT_ID
});

// ——— Logy spojení ———
modbusServer.on("connection", (client) => {
  try { client.setKeepAlive?.(true, 10000); } catch {}
  const sock = client.socket || client._socket || {};
  console.log("[MB] nový klient pripojený:", sock.remoteAddress || "?", "port", sock.remotePort || "?");
});
modbusServer.on("close", (client) => {
  const sock = client?.socket || client?._socket || {};
  console.log("[MB] klient odpojený:", sock.remoteAddress || "?");
});
modbusServer.on("error", (err) => {
  console.error("[MB] server error:", err?.message || err);
});

// ——— Robustné post* logovanie (žiadne NaN/undefined) ———
const q = (x) => (Number.isFinite(x) ? x : "?");

modbusServer.on("postReadCoils", (req) => {
  console.log(`[MB] readCoils @${q(req.address) + 1}..${q(req.address) + q(req.quantity)}`);
});
modbusServer.on("postReadDiscreteInputs", (req) => {
  console.log(`[MB] readDiscreteInputs @${10001 + q(req.address)}..${10001 + q(req.address) + q(req.quantity) - 1}`);
});
modbusServer.on("postReadHoldingRegisters", (req) => {
  console.log(`[MB] readHolding @${40001 + q(req.address)}..${40001 + q(req.address) + q(req.quantity) - 1}`);
});
modbusServer.on("postReadInputRegisters", (req) => {
  console.log(`[MB] readInputRegs @${30001 + q(req.address)}..${30001 + q(req.address) + q(req.quantity) - 1}`);
});
modbusServer.on("postWriteSingleCoil", (req) => {
  console.log(`[MB] writeCoil @${q(req.address) + 1} = ${req.value ? 1 : 0}`);
});
modbusServer.on("postWriteMultipleCoils", (req) => {
  console.log(`[MB] writeMultiCoils @${q(req.address) + 1} qty=${q(req.quantity)}`);
});
modbusServer.on("postWriteSingleRegister", (req) => {
  console.log(`[MB] writeHolding @${40001 + q(req.address)} = ${q(req.value)}`);
});
modbusServer.on("postWriteMultipleRegisters", (req) => {
  // req.values môže byť Buffer alebo pole; bezpečne zisti „count“
  let count = "?";
  if (Array.isArray(req.values)) count = req.values.length;
  else if (Buffer.isBuffer(req.values)) count = req.values.length / 2;
  const start = 40001 + q(req.address);
  const end   = Number.isFinite(count) && Number.isFinite(req.address)
    ? start + count - 1
    : "?";
  console.log(`[MB] writeMultiHolding @${start}..${end}`);
});

// surové rámce (voliteľne – pekné na debug)
modbusServer.on("receive", (data) => {
  try { console.log("[MB] <<", data.toString("hex")); } catch {}
});
modbusServer.on("send", (data) => {
  try { console.log("[MB] >>", data.toString("hex")); } catch {}
});

// spusti TCP
netServer.on("error", (e) => {
  console.error("[MB] net error:", e.code || e.message);
  if (e.code === "EADDRINUSE") console.error(`[MB] Port ${MODBUS_PORT} už používa iný proces`);
  if (e.code === "EACCES") console.error(`[MB] Port ${MODBUS_PORT} vyžaduje admin/root; použi port >=1024 alebo spusti ako admin`);
});
netServer.listen(MODBUS_PORT, "0.0.0.0", () => {
  const addr = netServer.address();
  console.log(`✅ MB: Modbus TCP beží na ${addr.address}:${addr.port}, UnitID=${MB_UNIT_ID}`);
});

/* =========================
   PERIODICKÁ SYNCHRONIZÁCIA IO <-> MB
   ========================= */
const tick = setInterval(() => {
  try { ioToModbus(); modbusToIo(); }
  catch (e) { console.warn("Tick error:", e?.message || e); }
}, TICK_MS);

/* =========================
   SHUTDOWN
   ========================= */
process.on("uncaughtException",  (err) => console.error("Uncaught:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err));

function shutdown(sig = "SIGTERM") {
  console.log(`\n🔻 ${sig} prijatý – ukončujem...`);
  clearInterval(tick);
  clearInterval(wsPingTimer);
  clearInterval(wsHbTimer);
  try { wss.close(() => console.log("WS: ukončené.")); } catch {}
  try { server.close(() => console.log("HTTP: ukončené.")); } catch {}
  try { netServer.close(() => console.log("MB: ukončené.")); } catch {}
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
