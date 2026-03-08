  // prepínanie sekcií
  const menuBtns = document.querySelectorAll('.list-group-item[data-section]');
  const sections =
  {
    modbus: document.getElementById('section-modbus'),
    simulation: document.getElementById('section-simulation')
  };

  function showSection(key)
  {
    Object.values(sections).forEach(s =>
    {
      s.classList.add('d-none');
    });

    sections[key]?.classList.remove('d-none');

    menuBtns.forEach(b =>
    {
      b.classList.remove('active');
    });

    document
      .querySelector(`.list-group-item[data-section="${key}"]`)
      ?.classList.add('active');
  }

  menuBtns.forEach(btn =>
  {
    btn.addEventListener('click', () =>
    {
      showSection(btn.dataset.section);
    });
  });


  let graphsWindow = null;


  document.addEventListener("DOMContentLoaded", async () =>
  {
    if (!window.Settings)
    {
      console.error("SettingsManager nie je načítaný!");
      return;
    }

    const themeSelect = document.getElementById("sim-theme");
    const btnSave = document.getElementById("btn-save");
    const btnReset = document.getElementById("btn-reset");
    const dbgStats = document.getElementById("dbg-stats");


    function syncGraphsWindow()
    {
      if (dbgStats.checked)
      {
        if (!graphsWindow || graphsWindow.closed)
        {
          graphsWindow = window.open(
            "graph.html",
            "graphsWindow",
            "width=900,height=600"
          );
        }
        else
        {
          graphsWindow.focus();
        }
      }
      else
      {
        if (graphsWindow && !graphsWindow.closed)
        {
          graphsWindow.close();
        }

        graphsWindow = null;
      }
    }


    dbgStats.addEventListener("change", syncGraphsWindow);


    // helper: naplň UI z configu
    function fillFormFromConfig(cfg)
    {
      cfg = cfg || {};
      cfg.modbus = cfg.modbus || {};
      cfg.debug = cfg.debug || {};

      // Modbus
      document.getElementById("mb-host").value = cfg.modbus.host ?? "";
      document.getElementById("mb-port").value = cfg.modbus.port ?? 1502;
      document.getElementById("mb-unit").value = cfg.modbus.unitId ?? 1;
      document.getElementById("mb-ticks").value = cfg.modbus.tickMs ?? 500;

      // Theme + debug
      themeSelect.value = cfg.theme ?? "dark";
      dbgStats.checked = !!cfg.debug.stats;
    }


    // helper: zober hodnoty z formulára a nastav do Settings
    function applyFormToSettings()
    {
      Settings.set("modbus.host", document.getElementById("mb-host").value.trim());
      Settings.set("modbus.port", Number(document.getElementById("mb-port").value));
      Settings.set("modbus.unitId", Number(document.getElementById("mb-unit").value));
      Settings.set("modbus.tickMs", Number(document.getElementById("mb-ticks").value));

      Settings.set("debug.stats", !!dbgStats.checked);
      Settings.set("theme", themeSelect.value);
    }


    // načítaj config zo servera
    await Settings.load();

    // nastav UI po load
    fillFormFromConfig(Settings.get());
    syncGraphsWindow();


    // keď sa zmení theme
    themeSelect.addEventListener("change", () =>
    {
      Settings.set("theme", themeSelect.value);
      console.log("Theme prepnutý na:", themeSelect.value);
    });


    // uložiť
    btnSave.addEventListener("click", async () =>
    {
      try
      {
        applyFormToSettings();
        console.log("Ukladám config...");
        await Settings.save();
        console.log("Config uložený.");
      }
      catch (e)
      {
        console.error("Save zlyhal:", e);
      }
    });


    // reset + save
    btnReset.addEventListener("click", async () =>
    {
      try
      {
        console.log("Resetujem na default...");
        await Settings.resetAndSave();

        fillFormFromConfig(Settings.get());
        syncGraphsWindow();

        console.log("Reset na default + uložené.");
      }
      catch (e)
      {
        console.error("ResetAndSave zlyhal:", e);
      }
    });


    // defaultná sekcia
    showSection("modbus");

  });