function createCamera()
{
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  return camera;
}

function setupPointerFlyControls(camera, renderer)
{
  const moveSpeed = 5;
  const rotationSpeed = 0.002;

  const pitchObject = new THREE.Object3D();
  pitchObject.add(camera);

  const yawObject = new THREE.Object3D();
  yawObject.position.set(-15,15,0);
  yawObject.rotation.y = THREE.MathUtils.degToRad(-90);
  yawObject.add(pitchObject);


  const keys = {};

  document.addEventListener('keydown', (e) => keys[e.code] = true);
  document.addEventListener('keyup', (e) => keys[e.code] = false);

  document.addEventListener('mousemove', (event) =>
  {
    if (document.pointerLockElement === renderer.domElement)
    {
      yawObject.rotation.y -= event.movementX * rotationSpeed;
      pitchObject.rotation.x -= event.movementY * rotationSpeed;
      pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
    }
  });

  renderer.domElement.addEventListener('click', () =>
  {
    renderer.domElement.requestPointerLock();
  });

  const velocity = new THREE.Vector3();
  let prevTime = performance.now();

  function updateCameraPosition()
  {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    velocity.set(0, 0, 0);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize();

    if (keys['KeyW']) velocity.addScaledVector(direction, moveSpeed * delta);
    if (keys['KeyS']) velocity.addScaledVector(direction, -moveSpeed * delta);
    if (keys['KeyA']) velocity.addScaledVector(right, -moveSpeed * delta);
    if (keys['KeyD']) velocity.addScaledVector(right, moveSpeed * delta);

    yawObject.position.add(velocity);

    prevTime = time;
  }

  return {
    updateCameraPosition,
    yawObject
  };
}