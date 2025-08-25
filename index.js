#!/usr/bin/env node
const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");

function openUrl(url) {
  const platform = os.platform();
  if (platform === "win32") {
    exec(`start "" "${url}"`, { windowsHide: true });
  } else if (platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

const root = __dirname;

const app = express();

// Hlavičky pre WebWorker/WASM (Physijs/Ammo)
app.use((req, res, next) => {
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

// Požiadaj OS o voľný port: 0 => auto-assign
const server = app.listen(0, () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/simulator.html`;
  console.log(`Simulátor beží na ${url}`);
  try { openUrl(url); } catch (_) {}
});

// Pre istotu nechaj chyby v konzole
process.on('uncaughtException', err => {
  console.error('Uncaught:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled:', err);
});