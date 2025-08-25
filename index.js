#!/usr/bin/env node
const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");

// --- NOVÉ: WebSocket + Modbus ---
const { WebSocketServer } = require("ws");
const ModbusRTU = require("modbus-serial");
// ---------------------------------

// === VERZIA APLIKÁCIE / RUNTIME (len log) ===
let appVersion = "embedded"; // fallback pre zabalenú verziu
try {
  // pokus 1: development spustenie (node index.js)
  const pkgDev = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  if (pkgDev?.version) appVersion = pkgDev.version;
} catch {
  try {
    // pokus 2: snapshot cesta v rámci __dirname (ak by bol package.json pridaný medzi assets)
    const pkgSnap = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
    if (pkgSnap?.version) appVersion = pkgSnap.version;
  } catch {
    // ostane "embedded"; prípadne si vieš poslať verziu cez env: APP_VERSION=1.2.3
    if (process.env.APP_VERSION) appVersion = process.env.APP_VERSION;
  }
}

function openUrl(url) {
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

app.use(express.static(root, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
    if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  }
}));

// Požiadaj OS o voľný port pre HTTP (0 => auto-assign)
const server = app.listen(0, () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;

  // → sem pridávame výpis verzií
  console.log(`Spúšťam ST Simulátor v${appVersion}, Node.js ${process.version}`);
  try {
    // voliteľne: vypíš verzie WS a Modbus knižníc (ak sú dostupné)
    const wsPkgPath = require.resolve("ws/package.json");
    const mbPkgPath = require.resolve("modbus-serial/package.json");
    const wsVer = JSON.parse(fs.readFileSync(wsPkgPath, "utf8")).version;
    const mbVer = JSON.parse(fs.readFileSync(mbPkgPath, "utf8")).version;
    console.log(`Knižnice: ws v${wsVer}, modbus-serial v${mbVer}`);
  } catch {
    // v zabalenom .exe nemusí byť package.json knižníc dostupný – nič sa nedeje
  }

  console.log(`Simulátor beží na ${url}`);
  try { openUrl(url); } catch (_) {}
});

/* =========================
   WEBSOCKET (zdieľa HTTP)
   ========================= */
const wss = new WebSocketServer({ server });
console.log("WS: WebSocket server pripojený k Expressu (rovnaký port).");

// IO z prehliadača budeme držať tu zatial testovné!!!!!!!
let IO = {
  inputs: { start: false, stop: false },
  outputs: { dist1: 0, motorRun: false },
};

let lastBrowserClient = null;

wss.on("connection", (ws) => {
  lastBrowserClient = ws;
  console.log("WS: simulátor pripojený");

  // pošleme aktuálny stav
  ws.send(JSON.stringify({ type: "sync", IO }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      // očakávame { type: "io", IO: {...} }
      if (data.type === "io" && data.IO) {
        IO = data.IO;
      }
    } catch (e) {
      console.warn("WS: neviem parsovať správu:", e.message);
    }
  });

  ws.on("close", () => {
    if (lastBrowserClient === ws) lastBrowserClient = null;
    console.log("WS: simulátor odpojený");
  });
});

// Heartbeat pre istotu 
setInterval(() => {
  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "hb", ts: Date.now() }));
  }
}, 1000);

/* =========================
   MODBUS TCP SLAVE
   ========================= */
// POZN.: port 502 často vyžaduje admin práva → použijeme 1502
const MODBUS_PORT = parseInt(process.env.MB_PORT || "1502", 10);
const MB_UNIT_ID  = parseInt(process.env.MB_UNIT || "1", 10);

// Vytvoríme pamäte (Buffers) pre Modbus mapu
const vector = {
  holding: Buffer.alloc(200),   // 100 wordov (RW 40001+)
  input:   Buffer.alloc(200),   // 100 wordov (RO 30001+)
  coils:   Buffer.alloc(64),    // 512 bitov (RW 00001+)
  discrete:Buffer.alloc(64),    // 512 bitov (RO 10001+)
};

const serverTCP = new ModbusRTU.ServerTCP(vector, {
  host: "0.0.0.0",
  port: MODBUS_PORT,
  unitID: MB_UNIT_ID,
  debug: false,
}, () => {
  console.log(`MB: Modbus TCP slave beží na porte ${MODBUS_PORT}, UnitID=${MB_UNIT_ID}`);
});

// Pomocné funkcie pre wordy
const writeU16BE = (buf, regIndex, value) =>
  buf.writeUInt16BE((value >>> 0) & 0xffff, regIndex * 2);
const readU16BE = (buf, regIndex) =>
  buf.readUInt16BE(regIndex * 2);

// Mapovanie IO <-> Modbus (uprav si podľa seba)
function ioToModbus() {
  // COILS (RW, 00001…)
  vector.coils[0]  = IO.inputs.start ? 1 : 0;    // 00001
  vector.coils[1]  = IO.inputs.stop  ? 1 : 0;    // 00002
  vector.coils[10] = IO.outputs.motorRun ? 1 : 0; // 00011 (len čítanie v PLC ak chceš)

  // DISCRETES (RO, 10001…)
  vector.discrete[0] = IO.outputs.motorRun ? 1 : 0; // 10001

  // HOLDING (RW, 40001…)
  writeU16BE(vector.holding, 0, Math.max(0, Math.round((IO.outputs.dist1 || 0) * 100))); // 40001 RO/RW z PLC
  // INPUT (RO, 30001…)
  writeU16BE(vector.input, 0, Math.max(0, Math.round((IO.outputs.dist1 || 0) * 100)));   // 30001
}

function modbusToIo() {
  // PLC môže zapísať:
  IO.inputs.start = !!vector.coils[0]; // 00001
  IO.inputs.stop  = !!vector.coils[1]; // 00002

  // Ak chceš umožniť PLC nastavovať dist1:
  const distPLC = readU16BE(vector.holding, 1); // 40002
  if (!Number.isNaN(distPLC)) IO.outputs.dist1 = distPLC / 100.0;

  // odošli späť do prehliadača
  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) {
    lastBrowserClient.send(JSON.stringify({ type: "sync", IO }));
  }
}

// Periodická synchronizácia IO <-> Modbus
setInterval(() => {
  ioToModbus();
  modbusToIo();
}, 100);
 
// Log chýb (ako máš)
process.on('uncaughtException', err => console.error('Uncaught:', err));
process.on('unhandledRejection', err => console.error('Unhandled:', err));
