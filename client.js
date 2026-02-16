#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ============================================
 * Modbus TEST CLI
 *  - Interaktívne čítanie/zapisovanie Modbus adries
 *  - Príkazy: read-coils, read-discrete, read-regs, write-coil, write-reg
 * ============================================
 */

const net = require("net");
const Modbus = require("jsmodbus");
const readline = require("readline");

// ============================================
// Konfigurácia
// ============================================
const MB_HOST    = process.env.MB_HOST || "192.168.245.129";
const MB_PORT    = parseInt(process.env.MB_PORT || "1502", 10);
const MB_UNIT_ID = parseInt(process.env.MB_UNIT || "1", 10);

// ============================================
// Modbus klient
// ============================================
const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, MB_UNIT_ID);

socket.on("connect", () => {
  console.log(`[MB] Pripojené na ${MB_HOST}:${MB_PORT} (UnitId=${MB_UNIT_ID})`);
  startCLI();
});

socket.on("error", (err) => {
  console.error("[MB] Chyba:", err.message);
});

socket.on("close", () => {
  console.warn("[MB] Spojenie zatvorené, pokus znova o 3s...");
  setTimeout(connect, 3000);
});

function connect() {
  console.log(`[MB] Pripájam sa na ${MB_HOST}:${MB_PORT} ...`);
  socket.connect({ host: MB_HOST, port: MB_PORT });
}

connect();

// ============================================
// CLI vstup
// ============================================
function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "MB> "
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    const addr = parseInt(parts[1], 10);

    try {
      switch (cmd) {
        case "read-coils": {
          const qty = parseInt(parts[2], 10);
          if (isNaN(addr) || isNaN(qty)) {
            console.log("Použi: read-coils <addr> <qty>");
            break;
          }
          const resp = await client.readCoils(addr, qty);
          console.log(`[READ COILS ] ${addr}..${addr+qty-1} →`, resp.response._body._valuesAsArray);
          break;
        }

        case "read-discrete": {
          const qty = parseInt(parts[2], 10);
          if (isNaN(addr) || isNaN(qty)) {
            console.log("Použi: read-discrete <addr> <qty>");
            break;
          }
          const resp = await client.readDiscreteInputs(addr, qty);
          console.log(`[READ INPUTS] ${addr}..${addr+qty-1} →`, resp.response._body._valuesAsArray);
          break;
        }

        case "read-regs": {
          const qty = parseInt(parts[2], 10);
          if (isNaN(addr) || isNaN(qty)) {
            console.log("Použi: read-regs <addr> <qty>");
            break;
          }
          const resp = await client.readInputRegisters(addr, qty);
          console.log(`[READ REGS  ] ${addr}..${addr+qty-1} →`, resp.response._body.valuesAsArray);
          break;
        }

        case "write-coil": {
          const val = parseInt(parts[2], 10);
          if (isNaN(addr) || isNaN(val) || (val !== 0 && val !== 1)) {
            console.log("Použi: write-coil <addr> <0|1>");
            break;
          }
          await client.writeSingleCoil(addr, val === 1);
          console.log(`[WRITE COIL ] ${addr} ← ${val}`);
          break;
        }

        case "write-reg": {
          const val = parseInt(parts[2], 10);
          if (isNaN(addr) || isNaN(val)) {
            console.log("Použi: write-reg <addr> <value>");
            break;
          }
          await client.writeSingleRegister(addr, val);
          console.log(`[WRITE REG  ] ${addr} ← ${val}`);
          break;
        }

        case "exit":
          rl.close();
          socket.end();
          return;

        default:
          console.log("Neznámy príkaz. Použi:");
          console.log("  read-coils <addr> <qty>       # PLC inputs (Coils)");
          console.log("  read-discrete <addr> <qty>    # PLC outputs (Discrete Inputs)");
          console.log("  read-regs <addr> <qty>        # Input Registers");
          console.log("  write-coil <addr> <0|1>");
          console.log("  write-reg <addr> <value>");
          console.log("  exit");
      }
    } catch (e) {
      console.error("[MB] Error:", e.message);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Koniec CLI.");
    process.exit(0);
  });
}
