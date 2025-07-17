window.onload = function ()
{
  Physijs.scripts.worker = 'sim_scripts/physi/physijs_worker.js';
  Physijs.scripts.ammo = 'sim_scripts/physi/ammo.js';

  const clock = new THREE.Clock();

  const camera = createCamera();

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x252526); // nastav farbu pozadia
  document.getElementById('three-container').appendChild(renderer.domElement);

  const controls = setupPointerFlyControls(camera, renderer);

  const sceneManager = new SceneManager(renderer, camera);
  sceneManager.loadScene(new Scene1(camera));

  window.addEventListener('resize', function ()
  {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate()
  {
    requestAnimationFrame(animate);
    controls.updateCameraPosition();

    const deltaTime = clock.getDelta();
    sceneManager.update(deltaTime);
  }

  animate();
};