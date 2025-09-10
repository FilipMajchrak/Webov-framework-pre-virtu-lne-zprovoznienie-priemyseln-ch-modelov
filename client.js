#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * =====================================
 *  Modbus Client – Použitie (ťahák)
 * =====================================
 *
 * Najprv spusti server:
 *   node index.js
 *
 * Potom v inom termináli spusti klienta:
 *
 * 1) Čítanie COILS (digitálne výstupy)
 *    node client.js read-coils <addr> [qty]
 *    Príklad: node client.js read-coils 0 8
 *
 * 2) Zápis jednej COIL
 *    node client.js write-coil <addr> <true|false>
 *    Príklad: node client.js write-coil 0 true
 *
 * 3) Zápis viacerých COILS
 *    node client.js write-multi-coils <addr> <v1,v2,...>
 *    Príklad: node client.js write-multi-coils 0 1,0,1,1
 *
 * 4) Čítanie HOLDING registrov (40001 → addr=0)
 *    node client.js read-holding <addr> [qty]
 *    Príklad: node client.js read-holding 0 4
 *
 * 5) Zápis jedného HOLDING registra
 *    node client.js write-holding <addr> <value>
 *    Príklad: node client.js write-holding 0 123
 *
 * 6) Zápis viacerých HOLDING registrov
 *    node client.js write-multi-holding <addr> <v1,v2,...>
 *    Príklad: node client.js write-multi-holding 0 10,20,30
 *
 * 7) Čítanie INPUT registrov (30001 → addr=0)
 *    node client.js read-input <addr> [qty]
 *    Príklad: node client.js read-input 0 2
 *
 * =====================================
 */

const net = require("net");
const Modbus = require("jsmodbus");

const host = "127.0.0.1";   // adresa servera
const port = 1502;          // Modbus TCP port (rovnaký ako v index.js)
const unitId = 1;           // Unit ID (rovnaké ako MB_UNIT_ID v index.js)

const client = new net.Socket();
const modbusClient = new Modbus.client.TCP(client, unitId);

client.on("connect", async () => {
  console.log(`[CLIENT] Connected to Modbus server ${host}:${port}`);

  const args = process.argv.slice(2);

  try {
    switch (args[0]) {
      case "read-coils": {
        const addr = parseInt(args[1], 10);
        const qty = parseInt(args[2] || "1", 10);
        const resp = await modbusClient.readCoils(addr, qty);
        console.log(`[CLIENT] Coils ${addr}..${addr + qty - 1}:`, resp.response._body._valuesAsArray);
        break;
      }

      case "write-coil": {
        const addr = parseInt(args[1], 10);
        const val = args[2] === "true" || args[2] === "1";
        await modbusClient.writeSingleCoil(addr, val);
        console.log(`[CLIENT] Wrote coil ${addr} = ${val}`);
        break;
      }

      case "write-multi-coils": {
        const addr = parseInt(args[1], 10);
        const values = (args[2] || "1,0").split(",").map(v => v.trim() === "1");
        await modbusClient.writeMultipleCoils(addr, values);
        console.log(`[CLIENT] Wrote multiple coils starting @${addr}:`, values);
        break;
      }

      case "read-holding": {
        const addr = parseInt(args[1], 10); 
        const qty = parseInt(args[2] || "1", 10);
        const resp = await modbusClient.readHoldingRegisters(addr, qty);
        console.log(`[CLIENT] Holding ${40001 + addr}..${40001 + addr + qty - 1}:`, resp.response._body.valuesAsArray);
        break;
      }

      case "write-holding": {
        const addr = parseInt(args[1], 10);
        const val = parseInt(args[2], 10);
        await modbusClient.writeSingleRegister(addr, val);
        console.log(`[CLIENT] Wrote holding register ${40001 + addr} = ${val}`);
        break;
      }

      case "write-multi-holding": {
        const addr = parseInt(args[1], 10);
        const values = (args[2] || "10,20").split(",").map(v => parseInt(v.trim(), 10));
        await modbusClient.writeMultipleRegisters(addr, values);
        console.log(`[CLIENT] Wrote multiple holding registers starting @${40001 + addr}:`, values);
        break;
      }

      case "read-input": {
        const addr = parseInt(args[1], 10); 
        const qty = parseInt(args[2] || "1", 10);
        const resp = await modbusClient.readInputRegisters(addr, qty);
        console.log(`[CLIENT] Input ${30001 + addr}..${30001 + addr + qty - 1}:`, resp.response._body.valuesAsArray);
        break;
      }

      default:
        console.log("Použitie: pozri ťahák v komentári hore ↑");
    }
  } catch (e) {
    console.error("[CLIENT] Error:", e.message || e);
  } finally {
    client.end();
  }
});

client.on("error", (err) => {
  console.error("[CLIENT] Connection error:", err.message || err);
});

client.connect({ host, port });