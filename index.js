#!/usr/bin/env node
const express = require("express");
const path = require("path");
const getPort = require("get-port");
const open = require("open");

const root = __dirname;

(async () => {
  const app = express();

  // Hlavičky kvôli WebWorkerom a WASM
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  app.use(express.static(root, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm");
      }
      if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }
    }
  }));

  const port = await getPort({ port: 3000 });
  app.listen(port, async () => {
    const url = `http://localhost:${port}/simulator.html`;
    console.log(`Simulátor beží na ${url}`);
    try { await open(url); } catch (_) {}
  });
})();