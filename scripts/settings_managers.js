// sim_scripts/SettingsManager.js
(function () {
  // DEFAULT nastavenia 
  const DEFAULT_CONFIG = {
    theme: "dark",
    modbus: { host: "127.0.0.1", port: 1502, unitId: 1, tickMs: 500 },
    debug: { hitbox: false, stats: true }
  };

  function deepMerge(base, incoming) {
    const out = structuredClone(base);
    if (!incoming || typeof incoming !== "object") return out;

    for (const [k, v] of Object.entries(incoming)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = deepMerge(out[k] ?? {}, v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function sanitize(cfg) {
    const theme = cfg?.theme === "light" ? "light" : "dark";

    const host = String(cfg?.modbus?.host ?? DEFAULT_CONFIG.modbus.host).trim() || DEFAULT_CONFIG.modbus.host;
    const port = clampInt(cfg?.modbus?.port, 1, 65535, DEFAULT_CONFIG.modbus.port);
    const unitId = clampInt(cfg?.modbus?.unitId, 0, 255, DEFAULT_CONFIG.modbus.unitId);
    const tickMs = clampInt(cfg?.modbus?.tickMs, 10, 600000, DEFAULT_CONFIG.modbus.tickMs);

    return {
      theme,
      modbus: { host, port, unitId, tickMs },
      debug: {
        hitbox: !!cfg?.debug?.hitbox,
        stats: !!cfg?.debug?.stats
      }
    };
  }

  class SettingsManager {
    constructor() {
      this.config = structuredClone(DEFAULT_CONFIG);
      this.listeners = new Set();
      this.loaded = false;
    }

    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    _emit() {
      for (const fn of this.listeners) {
        try { fn(this.get()); } catch (e) { console.warn("[Settings] listener error:", e); }
      }
    }

    get() {
      return structuredClone(this.config);
    }

    set(path, value) {
      const parts = String(path).split(".");
      let obj = this.config;

      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!obj[p] || typeof obj[p] !== "object") obj[p] = {};
        obj = obj[p];
      }
      obj[parts[parts.length - 1]] = value;

      this.config = sanitize(this.config);
      this.applyTheme();
      this._emit();
    }

    // RESET do default (iba lokálne v UI)
    reset() {
      this.config = structuredClone(DEFAULT_CONFIG);
      this.config = sanitize(this.config);
      this.applyTheme();
      this._emit();
      return this.get();
    }

    //  RESET + uloženie na server (prepíše user_config.json cez tvoje POST /api/config)
    async resetAndSave() {
      this.reset();
      await this.save();
      return true;
    }

    applyTheme() {
      const t = this.config.theme === "light" ? "light" : "dark";
      document.body.classList.toggle("theme-light", t === "light");
      document.body.classList.toggle("theme-dark", t === "dark");
      document.documentElement.dataset.theme = t;
    }

    async load() {
      const res = await fetch("/api/config", { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/config failed: ${res.status}`);
      const data = await res.json();

      const merged = deepMerge(DEFAULT_CONFIG, data);
      this.config = sanitize(merged);

      this.loaded = true;
      this.applyTheme();
      this._emit();

      return this.get();
    }

    async save() {
      const payload = this.get();

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`POST /api/config failed: ${res.status}`);
      return true;
    }
  }

  window.Settings = new SettingsManager();
})();