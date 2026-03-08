// ============================================
// inicializácia WebSocket spojenia
// ============================================
window.ws = new WebSocket(`ws://${location.hostname}:${location.port}`);

window.ws.onopen = () =>
{
  console.log("[WS] Spojenie otvorené");
  sendSceneToServer();
};

window.ws.onclose = () => console.log("[WS] Spojenie zatvorené");
window.ws.onerror = (e) => console.error("[WS] Chyba:", e);

window.ws.onmessage = (event) => 
{
  try 
  {
    const data = JSON.parse(event.data);

    if (data.type === "sync" && data.IO) 
    {
      // prepíš IO z hodnotami zo servera
      window.IO.inputs  = { ...window.IO.inputs,  ...data.IO.inputs };
      window.IO.outputs = { ...window.IO.outputs, ...data.IO.outputs };

      //console.log("[WS] Sync IO prijaté:", window.IO);
    }
  } 
  catch (e) 
  {
    console.warn("[WS] Chyba pri spracovaní správy:", e.message);
  }
};

function sendSceneToServer()
{
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
  if (!window.sceneManager?.currentScene) return;

  const scene = window.sceneManager.currentScene;
  const sceneName = scene.constructor.name;
  const modbusMap = (typeof scene.getModbusMap === "function") ? scene.getModbusMap() : null;

  window.ws.send(JSON.stringify({
    type: "scene",
    name: sceneName,
    map: modbusMap
  }));

  console.log("[WS] Scene+map odoslané:", sceneName);
}

const getTheme = async () => {
  try {
    const r = await fetch("/api/config", { cache: "no-store" });
    const cfg = await r.json();
    return cfg?.theme || "dark";
  } catch {
    return "dark";
  }
};

// ============================================
// window.onload – inicializácia aplikácie
// ============================================
window.onload = async function ()
{
  // ==========================
  // Inicializácia Physijs (fyzikálny engine)
  // ==========================
  Physijs.scripts.worker = 'sim_scripts/physi/physijs_worker.js'; // cesta k worker skriptu
  Physijs.scripts.ammo   = 'sim_scripts/physi/ammo.js';           // cesta k fyzikálnemu jadru (Ammo.js)

  const clock = new THREE.Clock(); // Hodiny pre výpočet deltaTime (čas medzi snímkami)

  // ==========================
  // Vytvorenie kamery a renderer-a
  // ==========================
  const camera = createCamera(); // THREE.PerspectiveCamera s FOV, near/far clipping atď.

  const renderer = new THREE.WebGLRenderer(); // Hlavný vykresľovací engine
  renderer.setSize(window.innerWidth, window.innerHeight); // Nastavenie veľkosti podľa okna

  const theme = await getTheme();
  renderer.setClearColor(theme === "light" ? 0xe6f0ff : 0x252526);

  document.getElementById('three-container').appendChild(renderer.domElement); // Pripoj renderer do DOM

  // ==========================
  // Nastavenie ovládania kamery (fly controls)
  // ==========================
  const controls = setupPointerFlyControls(camera, renderer);

  // ==========================
  // Inicializácia správcu scén a načítanie scény
  // ==========================
  window.sceneManager = new SceneManager(renderer, camera);

  // tu si vytvoríš scénu (momentálne Scene1, ale môžeš vymeniť za Scene2 atď.)
  const scene = new Scene1(camera);
  await window.sceneManager.loadScene(scene);

  sendSceneToServer();

  // pošleme na server info o scéne až keď sa otvorí WebSocket (viď onopen vyššie)

  // ==========================
  // Prispôsobenie renderera a kamery pri zmene veľkosti okna
  // ==========================
  window.addEventListener('resize', function ()
  {
    camera.aspect = window.innerWidth / window.innerHeight; // Aktualizuj aspect ratio
    camera.updateProjectionMatrix();                        // Prepočítaj projekciu
    renderer.setSize(window.innerWidth, window.innerHeight); // Zmeň veľkosť renderer-a
  });

  // ==========================
  // Hlavný animačný cyklus
  // ==========================
  let fps = 0;
  let frameCount = 0;
  let lastFpsTime = performance.now();

  function animate()
  {
    requestAnimationFrame(animate);       // Rekurzívne volanie animácie každé frame (~60 fps)
    controls.updateCameraPosition();      // Pohyb a rotácia kamery podľa vstupu

    const deltaTime = clock.getDelta();   // Čas medzi snímkami (v sekundách)
    sceneManager.update(deltaTime);       // Aktualizuj a vykresli aktuálnu scénu

    // Volanie PLC logiky
    if (typeof PLC_Update === 'function') 
    {
      PLC_Update();
    }
    
    // posielaj celé IO (inputs aj outputs), nie len outputs
    if (window.ws && window.ws.readyState === WebSocket.OPEN) 
    {
      window.ws.send(JSON.stringify({ type: "io", IO: window.IO }));
    }

    // Aktualizuj IO tabuľku (len ak sa zmenila)
    if (typeof renderIOTable === 'function') 
    {
      renderIOTable();
    }

    frameCount++;

    const now = performance.now();

    if (now - lastFpsTime >= 1000)
    {
      fps = frameCount;
      frameCount = 0;
      lastFpsTime = now;

      if (window.DebugStats)
      {
        window.DebugStats.fps = fps;
      }

      if (window.graphWindow && !window.graphWindow.closed)
      {
        window.graphWindow.postMessage({
          type: "fps",
          value: fps,
          time: new Date().toLocaleTimeString()
        }, "*");

        console.log("[FPS] posielam do graph okna:", fps);
      }
      else
      {
        console.log("[FPS] graphWindow neexistuje alebo je zatvorené");
      }

      console.log("FPS:", fps);
    }
  }

  animate(); // Spusti animáciu
};
