#!/usr/bin/env node
/* eslint-disable no-console */

const net = require("net");
const Modbus = require("jsmodbus");

const host = "127.0.0.1";
const port = 1502;
const unitId = 1;

const client = new net.Socket();
const modbusClient = new Modbus.client.TCP(client, unitId);

client.on("connect", async () => {
  console.log(`[CLIENT] Connected to Modbus server ${host}:${port}`);

  const args = process.argv.slice(2);

  try {
    if (args[0] === "read-coils") {
      const addr = parseInt(args[1], 10);
      const qty = parseInt(args[2] || "1", 10);

      const resp = await modbusClient.readCoils(addr, qty);
      console.log(`[CLIENT] Coils ${addr}..${addr + qty - 1}:`, resp.response._body._valuesAsArray);
    }
    else if (args[0] === "write-coil") {
      const addr = parseInt(args[1], 10);
      const val = args[2] === "true" || args[2] === "1";

      await modbusClient.writeSingleCoil(addr, val);
      console.log(`[CLIENT] Wrote coil ${addr} = ${val}`);
    }
    else if (args[0] === "read-holding") {
      const addr = parseInt(args[1], 10); // napr. 40001 -> zadaj 0
      const qty = parseInt(args[2] || "1", 10);

      const resp = await modbusClient.readHoldingRegisters(addr, qty);
      console.log(`[CLIENT] Holding ${40001 + addr}..${40001 + addr + qty - 1}:`, resp.response._body.valuesAsArray);
    }
    else if (args[0] === "read-input") {
      const addr = parseInt(args[1], 10); // napr. 30001 -> zadaj 0
      const qty = parseInt(args[2] || "1", 10);

      const resp = await modbusClient.readInputRegisters(addr, qty);
      console.log(`[CLIENT] Input ${30001 + addr}..${30001 + addr + qty - 1}:`, resp.response._body.valuesAsArray);
    }
    else {
      console.log("Usage:");
      console.log("  node client.js read-coils <addr> [qty]");
      console.log("  node client.js write-coil <addr> <true|false>");
      console.log("  node client.js read-holding <addr> [qty]");
      console.log("  node client.js read-input <addr> [qty]");
      console.log("");
      console.log("Poznámka: pre holding/input registre zadávaj index od 0.");
      console.log("  Napr. 40001 -> addr=0");
      console.log("       30001 -> addr=0");
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