window.onload = function ()
{
  // ==========================
  // Inicializácia Physijs (fyzikálny engine)
  // ==========================
  Physijs.scripts.worker = 'sim_scripts/physi/physijs_worker.js'; // cesta k worker skriptu
  Physijs.scripts.ammo = 'sim_scripts/physi/ammo.js';             // cesta k fyzikálnemu jadru (Ammo.js)

  const clock = new THREE.Clock(); // Hodiny pre výpočet deltaTime (čas medzi snímkami)

  // ==========================
  // Vytvorenie kamery a renderer-a
  // ==========================
  const camera = createCamera(); // THREE.PerspectiveCamera s FOV, near/far clipping atď.

  const renderer = new THREE.WebGLRenderer(); // Hlavný vykresľovací engine
  renderer.setSize(window.innerWidth, window.innerHeight); // Nastavenie veľkosti podľa okna
  renderer.setClearColor(0x252526); // Tmavošedé pozadie
  document.getElementById('three-container').appendChild(renderer.domElement); // Pripoj renderer do DOM

  // ==========================
  // Nastavenie ovládania kamery (fly controls)
  // ==========================
  const controls = setupPointerFlyControls(camera, renderer);

  // ==========================
  // Inicializácia správcu scén a načítanie scény
  // ==========================
  const sceneManager = new SceneManager(renderer, camera);
  sceneManager.loadScene(new Scene1(camera)); // Načíta Scene1 a zavolá init()

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
  function animate()
  {
    requestAnimationFrame(animate); // Rekurzívne volanie animácie každé frame (~60 fps)
    controls.updateCameraPosition(); // Pohyb a rotácia kamery podľa vstupu

    const deltaTime = clock.getDelta(); // Čas medzi snímkami (v sekundách)
    sceneManager.update(deltaTime);     // Aktualizuj a vykresli aktuálnu scénu
  }

  animate(); // Spusti animáciu
};