#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ST Simulátor – server
 * - HTTP: servíruje /simulator.html a assety
 * - WS:   sync IO ↔ browser (scéna)
 * - MB:   Modbus TCP server (jsmodbus)
 *
 * Dôležité zásady:
 *  - inputs.* riadi LEN Modbus (PLC)
 *  - outputs.* posiela z prehliadača scéna (senzory, koncáky, piesty...)
 *  - WS správy z browsera filter: berieme len outputs (inputs ignorujeme)
 *  - Coils mapa v Scene1.js je 1-based (1..n), MB.coils buffer je 0-based (0..n-1)
 *  - V postWriteSingleCoil zapisujeme do MB.coils[addr] (addr je 0-based z jsmodbus)
 *  - V modbusToIo pre adresu A používame index A-1
 */

const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const net = require("net");

try { require("dotenv").config(); } catch {}

const { WebSocketServer } = require("ws");
const Modbus = require("jsmodbus");

/* =========================
   KONFIGURÁCIA
   ========================= */
const HTTP_PORT   = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 0;
const NO_OPEN     = String(process.env.NO_OPEN || "").toLowerCase() === "true";
const MODBUS_PORT = parseInt(process.env.MB_PORT  || "1502", 10);
const MB_UNIT_ID  = parseInt(process.env.MB_UNIT  || "1",    10);
const TICK_MS     = parseInt(process.env.TICK_MS  || "100",  10);

/* =========================
   DEBUG – nastav cez env DEBUG
   napr. DEBUG=*, alebo DEBUG=mb,ws,tick,coils,io,snapshot,map
   ========================= */
function ts()
{
  const d = new Date();
  return d.toISOString().split("T")[1].replace("Z", "");
}

const DEBUG = new Set(
  String(process.env.DEBUG || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

function dbg(tag, ...args)
{
  if (DEBUG.has("*") || DEBUG.has(tag))
  {
    console.log(`[${ts()}][${tag}]`, ...args);
  }
}

function coilsBits(buf, from = 0, to = 31)
{
  const bits = [];
  for (let i = from; i <= to; i++)
  {
    const byte = buf[i >> 3] || 0;
    const bit  = (byte >> (i & 7)) & 1;
    bits.push(bit);
  }
  return bits.join("");
}

function mappedCoilsLine(map, buf)
{
  if (!map?.coils) return "(žiadne coils)";
  const parts = [];
  for (const [addrStr, conf] of Object.entries(map.coils))
  {
    const a   = parseInt(addrStr, 10);
    const idx = a - 1;
    const byte = buf[idx >> 3] || 0;
    const bit  = ((byte >> (idx & 7)) & 1) === 1 ? 1 : 0;
    parts.push(`${a}:${conf.path}=${bit}`);
  }
  return parts.join("  |  ");
}

/* =========================
   VERZIA (len log)
   ========================= */
let appVersion = "embedded";
try
{
  const pkgDev = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  if (pkgDev?.version) appVersion = pkgDev.version;
}
catch
{
  try
  {
    const pkgSnap = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
    if (pkgSnap?.version) appVersion = pkgSnap.version;
  }
  catch
  {
    if (process.env.APP_VERSION) appVersion = process.env.APP_VERSION;
  }
}

function openUrl(url)
{
  if (NO_OPEN) return;
  const platform = os.platform();
  if (platform === "win32") exec(`start "" "${url}"`, { windowsHide: true });
  else if (platform === "darwin") exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

/* =========================
   EXPRESS
   ========================= */
const root = __dirname;
const app = express();

app.use((_, res, next) =>
{
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(express.static(root, {
  setHeaders: (res, filePath) =>
  {
    if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
    if (filePath.endsWith(".js"))   res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  }
}));

app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/readyz",  (_req, res) => res.status(200).json({ ok: true }));

const server = app.listen(HTTP_PORT, () =>
{
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;

  console.log(`🚀 Spúšťam ST Simulátor v${appVersion}, Node.js ${process.version}`);
  try
  {
    const wsVer = JSON.parse(fs.readFileSync(require.resolve("ws/package.json"), "utf8")).version;
    const jmVer = JSON.parse(fs.readFileSync(require.resolve("jsmodbus/package.json"), "utf8")).version;
    console.log(`🔌 Knižnice: ws v${wsVer}, jsmodbus v${jmVer}`);
  }
  catch {}
  console.log(`🌐 Simulátor beží na ${url}`);
  try { openUrl(url); } catch {}
});

/* =========================
   WEBSOCKET
   ========================= */
const wss = new WebSocketServer({ server });
console.log("WS: WebSocket server pripojený k Expressu (rovnaký port).");

let IO = { inputs: {}, outputs: {} };
let lastBrowserClient = null;
let currentSceneMap = null;

function updateIO(newIO, source = "?", prev = null)
{
  if (!prev) prev = JSON.parse(JSON.stringify(IO));

  IO.inputs  = { ...IO.inputs,  ...newIO.inputs  };
  IO.outputs = { ...IO.outputs, ...newIO.outputs };

  for (const [k, v] of Object.entries(IO.inputs || {}))
  {
    if (prev.inputs?.[k] !== v)
    {
      console.log(`[IO][${source}] inputs.${k} zmenené: ${prev.inputs?.[k]} → ${v}`);
    }
  }

  for (const [k, v] of Object.entries(IO.outputs || {}))
  {
    if (prev.outputs?.[k] !== v)
    {
      console.log(`[IO][${source}] outputs.${k} zmenené: ${prev.outputs?.[k]} → ${v}`);
    }
  }
}

function wsHeartbeat(ws)
{
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
}

wss.on("connection", (ws) =>
{
  lastBrowserClient = ws;
  wsHeartbeat(ws);
  console.log("WS: simulátor pripojený");

  // po pripojení odošleme aktuálny IO stav
  ws.send(JSON.stringify({ type: "sync", IO }));

  ws.on("message", (msg) =>
  {
    try
    {
      const data = JSON.parse(msg.toString());

      // ⚠️ prijímame z browsera LEN outputs (inputs riadi Modbus)
      if (data?.type === "io" && data.IO)
      {
        if (data.IO.inputs && Object.keys(data.IO.inputs).length)
        {
          console.warn("[WS] IGNORUJEM inputs z browsera:", data.IO.inputs);
        }

        const onlyOutputs = { outputs: data.IO.outputs || {} };
        dbg("ws", "WS -> server outputs:", onlyOutputs.outputs);
        updateIO(onlyOutputs, "WS");
      }

      if (data?.type === "scene" && data.name)
      {
        console.log("[WS] Aktívna scéna:", data.name);
        if (data.map)
        {
          currentSceneMap = data.map;
          dbg("map", "Coils mapa:", Object.keys(currentSceneMap.coils || {}).length);
          dbg("map", "Holding:",   Object.keys(currentSceneMap.holding || {}).length);
          dbg("map", "Input:",     Object.keys(currentSceneMap.input   || {}).length);
        }
        else
        {
          console.warn("[WS] Scéna prišla bez mapy!");
        }
      }
    }
    catch (e)
    {
      console.warn("WS: neviem parsovať správu:", e.message);
    }
  });

  ws.on("close", () =>
  {
    if (lastBrowserClient === ws) lastBrowserClient = null;
    console.log("WS: simulátor odpojený");
  });

  ws.on("error", (err) => console.warn("WS: chyba spojenia:", err?.message || err));
});

const wsPingTimer = setInterval(() =>
{
  wss.clients.forEach((ws) =>
  {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 10000);

const wsHbTimer = setInterval(() =>
{
  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN)
  {
    lastBrowserClient.send(JSON.stringify({ type: "hb", ts: Date.now() }));
  }
}, 1000);

/* =========================
   MODBUS TCP (jsmodbus)
   ========================= */
const setBit = (buf, bitIndex, value) =>
{
  const byte = bitIndex >> 3;
  const bit  = bitIndex & 7;
  const mask = 1 << bit;
  const cur  = buf[byte] || 0;
  buf[byte]  = value ? (cur | mask) : (cur & ~mask);
};

function safeGetBit(buf, bitIndex)
{
  try
  {
    const byte = buf[bitIndex >> 3];
    if (typeof byte !== "number") return false;
    return ((byte >> (bitIndex & 7)) & 1) === 1;
  }
  catch
  {
    return false;
  }
}

function safeReadU16(buf, regIndex)
{
  try { return buf.readUInt16BE(regIndex * 2); }
  catch { return 0; }
}

const writeU16BE = (buf, regIndex, value) =>
  buf.writeUInt16BE((value >>> 0) & 0xffff, regIndex * 2);

const MB = {
  holding:  Buffer.alloc(400 * 2),
  input:    Buffer.alloc(200 * 2),
  coils:    Buffer.alloc(128),
  discrete: Buffer.alloc(128),
};

function getByPath(obj, path)
{
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value)
{
  const keys  = path.split(".");
  const last  = keys.pop();
  const target = keys.reduce((o, k) => (o ? o[k] : undefined), obj);
  if (target) target[last] = value;
}

/**
 * Simulátor -> Modbus (holding/input registre a coils mapované na outputs)
 */
function ioToModbus()
{
  if (!currentSceneMap) return;

  // holding registre – prepočítaj zo stavov IO.outputs (ak sú tak mapované)
  for (const [addr, conf] of Object.entries(currentSceneMap.holding || {}))
  {
    const val    = getByPath(IO, conf.path);
    const scaled = Math.round((val || 0) * (conf.scale || 1));
    writeU16BE(MB.holding, addr - 40001, scaled);
  }

  // input registre – čítajú sa zo scény (outputs) a ukladajú do MB.input
  for (const [addr, conf] of Object.entries(currentSceneMap.input || {}))
  {
    const val    = getByPath(IO, conf.path);
    const scaled = Math.round((val || 0) * (conf.scale || 1));
    writeU16BE(MB.input, addr - 30001, scaled);
  }
}

/**
 * Modbus -> Simulátor (coils mapované na inputs) + spätné zrkadlenie outputs do coils
 */
function modbusToIo()
{
  if (!currentSceneMap) return;

  const prev = JSON.parse(JSON.stringify(IO));

  // COILS
  for (const [addrStr, conf] of Object.entries(currentSceneMap.coils || {}))
  {
    const a       = parseInt(addrStr, 10); // 1-based adresa z mapy
    const mbIndex = a - 1;                 // 0-based index v MB.coils

    if (conf.path.startsWith("inputs"))
    {
      // PLC -> Simulátor (čítaj z MB.coils)
      const bitVal = safeGetBit(MB.coils, mbIndex);
      const curr   = getByPath(IO, conf.path);
      if (curr !== bitVal)
      {
        dbg("coils", `[COIL<-MB_TICK] a=${a} idx=${mbIndex} path=${conf.path} : ${curr} → ${bitVal}`);
        setByPath(IO, conf.path, bitVal);
      }
    }
    else if (conf.path.startsWith("outputs"))
    {
      // Simulátor -> PLC (zapisuj do MB.coils)
      const val = !!getByPath(IO, conf.path);
      const before = safeGetBit(MB.coils, mbIndex) ? 1 : 0;
      dbg("coils", `[COIL->MB_TICK] a=${a} idx=${mbIndex} path=${conf.path} : ${before} → ${val ? 1 : 0}`);
      setBit(MB.coils, mbIndex, val);
    }
  }

  // HOLDING – ak PLC píše do holdingov, premapuj späť do IO
  for (const [addr, conf] of Object.entries(currentSceneMap.holding || {}))
  {
    const raw  = safeReadU16(MB.holding, addr - 40001);
    const val  = raw / (conf.scale || 1);
    const curr = getByPath(IO, conf.path);

    if (curr !== val)
    {
      dbg("tick", `[HOLDING<-MB_TICK] @${addr} path=${conf.path} : ${curr} → ${val}`);
      setByPath(IO, conf.path, val);
    }
  }

  // Ulož rozdiely + sync do klienta
  updateIO(IO, "TICK", prev);

  if (DEBUG.has("snapshot"))
  {
    dbg("snapshot", "COILS bits [0..31]:", coilsBits(MB.coils, 0, 31));
    if (currentSceneMap) dbg("snapshot", "MAP:", mappedCoilsLine(currentSceneMap, MB.coils));
  }

  if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN)
  {
    lastBrowserClient.send(JSON.stringify({ type: "sync", IO }));
  }
}

/* =========================
   MB server
   ========================= */
const netServer = net.createServer();
const modbusServer = new Modbus.server.TCP(netServer, {
  holding:  MB.holding,
  input:    MB.input,
  coils:    MB.coils,
  discrete: MB.discrete,
  unitId: MB_UNIT_ID
});

// Jednotlivý zápis coil – sem chodí PLC (addr je 0-based)
modbusServer.on("postWriteSingleCoil", (req) =>
{
  const addr = req.body?.address ?? 0;   // 0-based z PLC
  const val  = req.body?.value ? 1 : 0;

  console.log(`[MB] writeCoil @${addr} = ${val}`);

  // Zapíš do 0-based indexu v MB.coils
  setBit(MB.coils, addr, !!val);
  dbg("mb", `po zápise: MB.coils[${addr}] = ${safeGetBit(MB.coils, addr) ? 1 : 0}`);

  // Okamžitá projekcia do IO (mapa je 1-based)
  const sceneAddr = addr + 1;
  if (currentSceneMap?.coils?.[sceneAddr])
  {
    const path = currentSceneMap.coils[sceneAddr].path;
    const prev = JSON.parse(JSON.stringify(IO));

    dbg("coils", `[COIL<-MB_WRITE] a=${sceneAddr} idx=${addr} path=${path} = ${!!val}`);
    setByPath(IO, path, !!val);
    updateIO(IO, "MB_WRITE", prev);

    if (lastBrowserClient && lastBrowserClient.readyState === lastBrowserClient.OPEN)
    {
      lastBrowserClient.send(JSON.stringify({ type: "sync", IO }));
    }
  }
  else
  {
    dbg("coils", `[COIL<-MB_WRITE] a=${sceneAddr} (nemapované)`);
  }
});

// modbusServer.on("postWriteMultipleCoils", (req) => {
//   console.log(`[MB] writeMultiCoils @${req.address} qty=${req.quantity}`);
// });
// modbusServer.on("postWriteSingleRegister", (req) => {
//   console.log(`[MB] writeHolding @${40001 + req.address} = ${req.value}`);
// });
// modbusServer.on("postWriteMultipleRegisters", (req) => {
//   console.log(`[MB] writeMultiHolding starting @${40001 + req.address} qty=${req.quantity}`);
// });

modbusServer.on("connection", (client) =>
{
  try { client.setKeepAlive?.(true, 10000); } catch {}
  const sock = client.socket || client._socket || {};
  console.log("[MB] nový klient pripojený:", sock.remoteAddress || "?", "port", sock.remotePort || "?");
});

modbusServer.on("close", (client) =>
{
  const sock = client?.socket || client?._socket || {};
  console.log("[MB] klient odpojený:", sock.remoteAddress || "?");
});

modbusServer.on("error", (err) =>
{
  console.error("[MB] server error:", err?.message || err);
});

netServer.listen(MODBUS_PORT, "0.0.0.0", () =>
{
  const addr = netServer.address();
  console.log(`✅ MB: Modbus TCP beží na ${addr.address}:${addr.port}, UnitID=${MB_UNIT_ID}`);
});

/* =========================
   PERIODICKÁ SYNCHRONIZÁCIA IO <-> MB
   ========================= */
const tick = setInterval(() =>
{
  try
  {
    if (DEBUG.has("tick")) dbg("tick", "— TICK —");
    ioToModbus();
    modbusToIo();
  }
  catch (e)
  {
    console.warn("Tick error:", e?.message || e);
  }
}, TICK_MS);

/* =========================
   SHUTDOWN
   ========================= */
process.on("uncaughtException",  (err) => console.error("Uncaught:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err));

function shutdown(sig = "SIGTERM")
{
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
