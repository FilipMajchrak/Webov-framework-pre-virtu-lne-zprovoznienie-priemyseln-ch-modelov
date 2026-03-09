#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ============================================
 * ST Simulátor – Node.js backend (priama adresácia ako v CLI)
 *
 * Funkcie:
 *  - HTTP server (Express) na servírovanie HTML a JS pre simulátor
 *  - WebSocket server na komunikáciu s prehliadačom
 *  - Modbus TCP klient (jsmodbus) pre spojenie so skutočným PLC
 *
 * Architektúra:
 *   Browser (simulator.html)
 *          ↑  WebSocket
 *   Node.js (index.js)  ↔  Modbus TCP ↔  PLC (TwinCAT)
 *
 * Zásady IO:
 *  - IO.inputs  → PLC povely pre simulátor
 *  - IO.outputs → hodnoty zo simulátora (senzory, merania) pre PLC
 *
 * Základný rozdiel oproti predchádzajúcim verziám:
 *  - každá Modbus adresa sa číta a zapisuje presne tak, ako je uvedená v mape scény
 *  - nepoužívajú sa blokové čítania ani offsety
 * ============================================
 */

const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const net = require("net");
const fs = require("fs");

try 
{
  require("dotenv").config();
} catch {}

const { WebSocketServer } = require("ws");
const Modbus = require("jsmodbus");

/* =========================
   KONFIGURÁCIA
   ========================= */
const HTTP_PORT   = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 0;
const NO_OPEN     = String(process.env.NO_OPEN || "").toLowerCase() === "true";

let MB_HOST     = process.env.MB_HOST || "127.0.0.1";
let MB_PORT     = parseInt(process.env.MB_PORT || "1502", 10);
let MB_UNIT_ID  = parseInt(process.env.MB_UNIT || "1", 10);
let TICK_MS     = parseInt(process.env.TICK_MS || "500", 10);

let modbusStats = {
  lastMs: 0,
  minMs: Infinity,
  maxMs: 0,
  avgMs: 0,
  count: 0,
  sumMs: 0
};

/* =========================
   EXPRESS SERVER
   ========================= */
const root = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;

const CONFIG_PATH = path.join(root, "user_config.json");

function readUserConfigSafe() {
  try 
  {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) 
  {
    console.warn("[CONFIG] Read error:", e.message);
    return null;
  }
}

function applyRuntimeConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return;

  // očakávame štruktúru ako vo user_config.json:
  // { modbus: { host, port, unitId, tickMs }, ... }

  if (cfg.modbus && typeof cfg.modbus === "object") 
  {
    if (typeof cfg.modbus.host === "string" && cfg.modbus.host.trim()) MB_HOST = cfg.modbus.host.trim();
    if (Number.isFinite(cfg.modbus.port)) MB_PORT = Math.trunc(cfg.modbus.port);
    if (Number.isFinite(cfg.modbus.unitId)) MB_UNIT_ID = Math.trunc(cfg.modbus.unitId);
    if (Number.isFinite(cfg.modbus.tickMs) && cfg.modbus.tickMs > 0) TICK_MS = Math.trunc(cfg.modbus.tickMs);
    if (Number.isFinite(cfg.modbus.port) && cfg.modbus.port > 0) MB_PORT = Math.trunc(cfg.modbus.port);
  }
}

// pri štarte: načítaj config a aplikuj
applyRuntimeConfig(readUserConfigSafe());

const app = express();
app.use(express.static(root));



const server = app.listen(HTTP_PORT, () =>
{
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;
  console.log(`Spúšťam ST Simulátor (Node.js ${process.version})`);
  console.log(`Simulátor beží na ${url}`);

  if (!NO_OPEN)
  {
    const platform = os.platform();
    if (platform === "win32") exec(`start "" "${url}"`);
    else if (platform === "darwin") exec(`open "${url}"`);
    else exec(`xdg-open "${url}"`);
  }
});

/* =========================
   WEBSOCKET SERVER
   ========================= */
const wss = new WebSocketServer({ server });
console.log("WS server pripojený k Expressu.");

let IO = { inputs: {}, outputs: {} };
let lastBrowserClient = null;
let currentSceneMap = null;

wss.on("connection", (ws) =>
{
  lastBrowserClient = ws;
  console.log("WS: simulátor pripojený");

  // pošleme klientovi aktuálny stav IO
  ws.send(JSON.stringify({ type: "sync", IO }));

  ws.on("message", (msg) =>
  {
    try
    {
      const data = JSON.parse(msg.toString());

      if (data?.type === "io" && data.IO)
      {
        if (data.IO.outputs)
        {
          IO.outputs = { ...IO.outputs, ...data.IO.outputs };
        }
      }

      // ak príde mapa scény, uložíme ju
      if (data?.type === "scene" && data.map)
      {
        currentSceneMap = data.map;
        console.log("[WS] Mapa scény prijatá.");

        // poistka: aby vetvy existovali
        IO.inputs = IO.inputs || {};
        IO.outputs = IO.outputs || {};
      }
    }
    catch (e)
    {
      console.warn("WS parse error:", e.message);
    }
  });

  ws.on("close", () =>
  {
    if (lastBrowserClient === ws) lastBrowserClient = null;
  });
});

/* =========================
   HELPER FUNKCIE
   ========================= */
function getByPath(obj, path)
{
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value)
{
  const keys = path.split(".");
  let cur = obj;

  for (let i = 0; i < keys.length - 1; i++)
  {
    const k = keys[i];
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object")
    {
      cur[k] = {};
    }
    cur = cur[k];
  }

  cur[keys[keys.length - 1]] = value;
}

/* =========================
  MODBUS KLIENT
  ========================= */
let socket = null;
let mbClient = null;

function attachSocketHandlers() {
  socket.on("connect", () => {
    console.log(`[MB] Pripojené na ${MB_HOST}:${MB_PORT} (UnitId=${MB_UNIT_ID})`);
  });

  socket.on("error", (err) => {
    console.error("[MB] Chyba:", err.message);
  });

  socket.on("close", () => {
    console.warn("[MB] Spojenie zatvorené, pokus znova o 3s...");
    setTimeout(() => connectModbus(), 3000);
  });
}

function makeClient() {
  socket = new net.Socket();
  mbClient = new Modbus.client.TCP(socket, MB_UNIT_ID);
  attachSocketHandlers();
}

function connectModbus() {
  if (!socket || !mbClient) makeClient();

  // ak už je socket otvorený alebo sa pripája, neskúšaj znova
  if (socket.connecting) return;
  if (!socket.destroyed && socket.remoteAddress) return;

  console.log(`[MB] Pripájam sa na ${MB_HOST}:${MB_PORT} ...`);
  try 
  {
    socket.connect({ host: MB_HOST, port: MB_PORT });
  } catch (e) 
  {
    console.warn("[MB] connect error:", e.message);
  }
}

function restartModbus() {
  console.log(`[MB] Reštartujem spojenie -> ${MB_HOST}:${MB_PORT} (UnitId=${MB_UNIT_ID})`);
  try {
    if (socket) {
      socket.removeAllListeners();
      socket.destroy();
    }
  } catch {}
  socket = null;
  mbClient = null;
  connectModbus();
}

function recordModbusLatency(ms)
{
  modbusStats.lastMs = ms;
  modbusStats.minMs = Math.min(modbusStats.minMs, ms);
  modbusStats.maxMs = Math.max(modbusStats.maxMs, ms);
  modbusStats.count += 1;
  modbusStats.sumMs += ms;
  modbusStats.avgMs = modbusStats.sumMs / modbusStats.count;
}

connectModbus();

/* =========================
   MODBUS - IO FUNKCIE
   ========================= */
async function modbusToIo()
{
  if (!currentSceneMap) return;
  if (!mbClient || !socket || socket.destroyed) return;

  // Čítanie discrete inputs (digitálne výstupy PLC)
  if (currentSceneMap.inputCoils)
  {
    const addrs = Object.keys(currentSceneMap.inputCoils)
      .map(a => parseInt(a, 10))
      .sort((a,b) => a - b);

    const vals = [];

    for (const addr of addrs)
    {
      const conf = currentSceneMap.inputCoils[addr];
      if (!conf?.path) continue;

      try
      {
        const start = performance.now();
        const resp = await mbClient.readDiscreteInputs(addr, 1);
        const elapsed = performance.now() - start;
        recordModbusLatency(elapsed);
        const bit  = resp?.response?._body?._valuesAsArray?.[0] ? 1 : 0;

        setByPath(IO, conf.path, !!bit);
        vals.push(bit);
      }
      catch (e)
      {
        console.warn(`[MB][READ DI] addr=${addr} error: ${e.message}`);
        vals.push("E");
      }
    }

    if (addrs.length > 0)
    {
      console.log(`[MB][READ DI ] ${addrs[0]}..${addrs[addrs.length - 1]} → [${vals.join(",")}]`);
    }
  }

  // Čítanie input registers (číselné vstupy PLC)
  if (currentSceneMap.inputRegisters)
  {
    const addrs = Object.keys(currentSceneMap.inputRegisters)
      .map(a => parseInt(a, 10))
      .sort((a,b) => a - b);

    const vals = [];

    for (const addr of addrs)
    {
      const conf = currentSceneMap.inputRegisters[addr];
      if (!conf?.path) continue;

      try
      {
        const start = performance.now();
        const resp = await mbClient.readInputRegisters(addr, 1);
        const elapsed = performance.now() - start;
        recordModbusLatency(elapsed);
        const raw  = resp?.response?._body?.valuesAsArray?.[0] ?? 0;
        const val  = raw / (conf.scale || 1);

        setByPath(IO, conf.path, val);
        vals.push(raw);
      }
      catch (e)
      {
        console.warn(`[MB][READ IR] addr=${addr} error: ${e.message}`);
        vals.push("E");
      }
    }

    if (addrs.length > 0)
    {
      console.log(`[MB][READ IR ] ${addrs[0]}..${addrs[addrs.length - 1]} → [${vals.join(",")}]`);
    }
  }
}

async function ioToModbus()
{
  if (!currentSceneMap) return;
  if (!mbClient || !socket || socket.destroyed) return;

  // Zápis coils (digitálne vstupy PLC)
  if (currentSceneMap.outputCoils)
  {
    const addrs = Object.keys(currentSceneMap.outputCoils)
      .map(a => parseInt(a, 10))
      .sort((a,b) => a - b);

    const vals = [];

    for (const addr of addrs)
    {
      const conf = currentSceneMap.outputCoils[addr];
      if (!conf?.path) continue;

      const bit = !!getByPath(IO, conf.path);

      try
      {
        const start = performance.now();
        await mbClient.writeSingleCoil(addr, bit);
        const elapsed = performance.now() - start;
        recordModbusLatency(elapsed);
        vals.push(bit ? 1 : 0);
      }
      catch (e)
      {
        console.warn(`[MB][WRITE C ] addr=${addr} error: ${e.message}`);
        vals.push("E");
      }
    }

    if (addrs.length > 0)
    {
      console.log(`[MB][WRITE C ] ${addrs[0]}..${addrs[addrs.length - 1]} ← [${vals.join(",")}]`);
    }
  }

  // Zápis holding registers (analógové výstupy PLC)
  if (currentSceneMap.outputRegisters)
  {
    const addrs = Object.keys(currentSceneMap.outputRegisters)
      .map(a => parseInt(a, 10))
      .sort((a,b) => a - b);

    const vals = [];

    for (const addr of addrs)
    {
      const conf = currentSceneMap.outputRegisters[addr];
      if (!conf?.path) continue;

      const scaled = Math.round((getByPath(IO, conf.path) || 0) * (conf.scale || 1));

      try
      {
        const start = performance.now();
        await mbClient.writeSingleRegister(addr, scaled);
        const elapsed = performance.now() - start;
        recordModbusLatency(elapsed);
        vals.push(scaled);
      }
      catch (e)
      {
        console.warn(`[MB][WRITE HR] addr=${addr} error: ${e.message}`);
        vals.push("E");
      }
    }

    if (addrs.length > 0)
    {
      console.log(`[MB][WRITE HR] ${addrs[0]}..${addrs[addrs.length - 1]} ← [${vals.join(",")}]`);
    }
  }
}

/* =========================
   HLAVNÝ TICK
   ========================= */

let tickTimer = null;

function startTick() 
{
  if (tickTimer) clearInterval(tickTimer);

  tickTimer = setInterval(async () => {
    try 
    {
      await modbusToIo();
      await ioToModbus();

      if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN) 
      {
        lastBrowserClient.send(JSON.stringify({
          type: "sync",
          IO,
          stats: {
            modbusLastMs: Number(modbusStats.lastMs.toFixed(2)),
            modbusMinMs: modbusStats.minMs === Infinity ? 0 : Number(modbusStats.minMs.toFixed(2)),
            modbusMaxMs: Number(modbusStats.maxMs.toFixed(2)),
            modbusAvgMs: Number(modbusStats.avgMs.toFixed(2))
          }
        }));
      }
    }
    catch (e)
    {
      console.error("Tick error:", e.message);
    }
  }, TICK_MS);

  console.log(`[TICK] ${TICK_MS} ms`);
}

startTick();

/* =========================
   SETTINGS API (user_config.json)
   ========================= */

// JSON parser pre POST
app.use(express.json());

// GET config
app.get("/api/config", (req, res) => {
  try 
  {
    if (!fs.existsSync(CONFIG_PATH)) 
    {
      const defaultConfig = {
        theme: "dark",
        modbus: 
        {
          host: MB_HOST,
          port: MB_PORT,
          unitId: MB_UNIT_ID,
          tickMs: TICK_MS
        }
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      return res.json(defaultConfig);
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const data = JSON.parse(raw);
    return res.json(data);

  } 
  catch (e) 
  {
    console.error("GET /api/config error:", e.message);
    return res.status(500).json({ error: "Failed to read config" });
  }
});

// POST config
app.post("/api/config", (req, res) => {
  try 
  {
    const before = readUserConfigSafe() || {};
    const cfg = req.body || {};

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    console.log("[CONFIG] Uložený user_config.json");

    const beforeMb = before?.modbus || {};
    const afterMb  = cfg?.modbus || {};

    const mbChanged =
      String(beforeMb.host ?? "") !== String(afterMb.host ?? "") ||
      Number(beforeMb.port ?? NaN) !== Number(afterMb.port ?? NaN) ||
      Number(beforeMb.unitId ?? NaN) !== Number(afterMb.unitId ?? NaN);

    const tickChanged =
      Number(beforeMb.tickMs ?? NaN) !== Number(afterMb.tickMs ?? NaN);

    // nastav runtime premenné
    applyRuntimeConfig(cfg);

    if (mbChanged) restartModbus();
    if (tickChanged) startTick();

    return res.json({ success: true, mbChanged, tickChanged });
  } 
  catch (e) 
  {
    console.error("POST /api/config error:", e.message);
    return res.status(500).json({ error: "Failed to save config" });
  }
});