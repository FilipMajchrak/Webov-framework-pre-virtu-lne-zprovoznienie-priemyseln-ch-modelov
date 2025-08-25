const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

async function run() {
  try {
    await client.connectTCP("127.0.0.1", { port: 1502 });
    client.setID(1);
    console.log("✅ Pripojený na Modbus slave");

    // Zapíš Start (Coil 1)
    await client.writeCoil(0, true);

    // Prečítaj späť Coil 1
    const coils = await client.readCoils(0, 1);
    console.log("▶️ Coil[1] =", coils.data[0]);

    // Prečítaj Input Register 30001 (index 0)
    const data = await client.readInputRegisters(0, 1);
    console.log("📏 dist1 =", data.data[0] / 100.0);

    client.close();
  } catch (err) {
    console.error("❌ Chyba:", err.message || err);
  }
}

run();