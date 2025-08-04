function createCamera()
{
  const camera = new THREE.PerspectiveCamera(
    75, // Field of View (FOV) – vertikálny zorný uhol v stupňoch
    window.innerWidth / window.innerHeight, // Aspect Ratio – pomer šírka / výška okna
    0.1, // Near Clipping Plane – najbližšia vzdialenosť, odkiaľ sa objekty ešte kreslia
    1000 // Far Clipping Plane – najvzdialenejšia vzdialenosť, po ktorú sú objekty viditeľné
  );
  return camera; // Vráti vytvorenú kameru
}

function setupPointerFlyControls(camera, renderer)
{
  const moveSpeed = 12;     // Rýchlosť pohybu dopredu/dozadu/do strán
  const rotationSpeed = 0.004; // Rýchlosť otáčania pohľadu myšou

  // pitchObject umožňuje rotáciu hore/dole (X-os)
  const pitchObject = new THREE.Object3D();
  pitchObject.add(camera); // kamera je zavesená na pitchObjekte

  // yawObject umožňuje rotáciu doľava/doprava (Y-os)
  const yawObject = new THREE.Object3D();
  yawObject.position.set(-15,15,0); // Počiatočná pozícia kamery v scéne
  yawObject.rotation.y = THREE.MathUtils.degToRad(-90); // Počiatočný smer (otočenie doľava)
  yawObject.add(pitchObject); // pitch je zavesený na yaw, takže sa otáčajú spolu

  const keys = {}; // Objekt sledujúci stlačené klávesy

  // Zaznamenávanie stlačenia klávesov
  document.addEventListener('keydown', (e) => keys[e.code] = true);
  document.addEventListener('keyup', (e) => keys[e.code] = false);

  // Ovládanie otáčania myšou
  document.addEventListener('mousemove', (event) =>
  {
    if (document.pointerLockElement === renderer.domElement) // funguje len ak je uzamknutý kurzor
    {
      yawObject.rotation.y -= event.movementX * rotationSpeed; // otáčanie vľavo/vpravo
      pitchObject.rotation.x -= event.movementY * rotationSpeed; // otáčanie hore/dole

      // Obmedzenie vertikálneho pohľadu (max ±90°)
      pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
    }
  });

  // Aktivovanie pointer lock po kliknutí do canvasu
  renderer.domElement.addEventListener('click', () =>
  {
    renderer.domElement.requestPointerLock();
  });

  const velocity = new THREE.Vector3(); // Pohybový vektor
  let prevTime = performance.now();     // Na výpočet deltaTime

  // Hlavná aktualizačná funkcia, volaná každé frame
  function updateCameraPosition()
  {
    const time = performance.now();
    const delta = (time - prevTime) / 1000; // Delta time v sekundách

    velocity.set(0, 0, 0); // Resetuj pohybový vektor

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction); // Získa smer, kam sa kamera pozerá

    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize(); // Vektor doprava (smerom krížovým k up a direction)

    // Rôzne smery pohybu podľa stlačených kláves
    if (keys['KeyW']) velocity.addScaledVector(direction, moveSpeed * delta);  // dopredu
    if (keys['KeyS']) velocity.addScaledVector(direction, -moveSpeed * delta); // dozadu
    if (keys['KeyA']) velocity.addScaledVector(right, -moveSpeed * delta);     // doľava
    if (keys['KeyD']) velocity.addScaledVector(right, moveSpeed * delta);      // doprava

    yawObject.position.add(velocity); // Aplikuj pohyb

    prevTime = time; // Ulož aktuálny čas pre ďalší frame
  }

  // Vráti objekt, ktorý sa dá použiť v render loop
  return {updateCameraPosition,yawObject};
}