const Pistons = [];

function createPiston(
  scene,
  {
    name = "piston",
    position = [0, 5, 0],
    size = [1, 1, 1],
    color = 0x00ff00,
    moveDistance = 2,
    speed = 2,
    direction = [0, 0, 1],
    getInputFn = () => false,
    setOutputFn = (v) => {},
    setRetractedFn = (v) => {},
    affectedObjects = [],
    supportedObject = null,
    supportEpsilon = 0.2
  }
)
{
  const geometry = new THREE.BoxGeometry(...size);
  const material = Physijs.createMaterial(
    new THREE.MeshStandardMaterial({ color }),
    0.9,
    0.0
  );

  const piston = new Physijs.BoxMesh(geometry, material, 1000);
  piston.position.set(...position);
  piston.rotation.set(0, 0, 0);
  piston.name = name;

  let physicsReady = false;

  piston.addEventListener("ready", function ()
  {
    physicsReady = true;

    if (typeof piston.setAngularFactor === "function")
    {
      piston.setAngularFactor(new THREE.Vector3(0, 0, 0));
    }

    if (typeof piston.setLinearFactor === "function")
    {
      const fx = Math.abs(direction[0]) > 0 ? 1 : 0;
      const fy = Math.abs(direction[1]) > 0 ? 1 : 0;
      const fz = Math.abs(direction[2]) > 0 ? 1 : 0;
      piston.setLinearFactor(new THREE.Vector3(fx, fy, fz));
    }

    if (typeof piston.setDamping === "function")
    {
      piston.setDamping(0.9, 0.9);
    }
  });

  scene.add(piston);
  showHitbox(piston, scene);

  const start = new THREE.Vector3(...position);
  const dir = new THREE.Vector3(...direction).normalize();
  const end = start.clone().addScaledVector(dir, moveDistance);

  function isPhysicsBody(obj)
  {
    return !!obj &&
      obj instanceof THREE.Object3D &&
      typeof obj.setLinearVelocity === "function";
  }

  function getSupportedRadius()
  {
    if (!supportedObject) return 0.5;

    let radius = 0.5;

    if (supportedObject.geometry)
    {
      if (!supportedObject.geometry.boundingSphere)
      {
        supportedObject.geometry.computeBoundingSphere();
      }

      if (supportedObject.geometry.boundingSphere)
      {
        const scaleX = supportedObject.scale?.x ?? 1;
        const scaleY = supportedObject.scale?.y ?? 1;
        const scaleZ = supportedObject.scale?.z ?? 1;
        const maxScale = Math.max(scaleX, scaleY, scaleZ);
        radius = supportedObject.geometry.boundingSphere.radius * maxScale;
      }
    }

    return radius;
  }

  function supportTop(pistonVelocity)
  {
    if (!physicsReady) return;
    if (!isPhysicsBody(supportedObject)) return;

    piston.updateMatrixWorld(true);
    supportedObject.updateMatrixWorld(true);

    const pistonBox = new THREE.Box3().setFromObject(piston);

    const topY = pistonBox.max.y;
    const leftX = pistonBox.min.x;
    const rightX = pistonBox.max.x;
    const frontZ = pistonBox.min.z;
    const backZ = pistonBox.max.z;

    const objPos = supportedObject.position.clone();
    const radius = getSupportedRadius();
    const objectBottom = objPos.y - radius;

    const insideX = objPos.x >= leftX - radius && objPos.x <= rightX + radius;
    const insideZ = objPos.z >= frontZ - radius && objPos.z <= backZ + radius;

    const closeToTop =
      objectBottom <= topY + supportEpsilon &&
      objectBottom >= topY - radius - supportEpsilon;

    if (insideX && insideZ && closeToTop)
    {
      const v = supportedObject.getLinearVelocity();

      supportedObject.setLinearVelocity(
        new THREE.Vector3(
          pistonVelocity.x,
          Math.max(0, v.y),
          pistonVelocity.z
        )
      );

      if (typeof supportedObject.setAngularVelocity === "function")
      {
        supportedObject.setAngularVelocity(new THREE.Vector3(0, 0, 0));
      }
    }
  }

  function update(delta)
  {
    if (!physicsReady) return;

    const extend = getInputFn();
    const target = extend ? end : start;

    const toTarget = target.clone().sub(piston.position);
    const distance = toTarget.length();

    if (distance < 0.02)
    {
      piston.setLinearVelocity(new THREE.Vector3(0, 0, 0));

      setOutputFn(extend);
      setRetractedFn(!extend);

      supportTop(new THREE.Vector3(0, 0, 0));
      return;
    }

    const velocity = toTarget.normalize().multiplyScalar(speed);
    piston.setLinearVelocity(velocity);

    setOutputFn(extend && piston.position.distanceTo(end) < 0.05);
    setRetractedFn(!extend && piston.position.distanceTo(start) < 0.05);

    supportTop(velocity);

    if (extend)
    {
      const pistonBox = new THREE.Box3().setFromObject(piston);

      for (const obj of affectedObjects)
      {
        if (!isPhysicsBody(obj)) continue;

        const objBox = new THREE.Box3().setFromObject(obj);

        if (pistonBox.intersectsBox(objBox))
        {
          const force = dir.clone().multiplyScalar(5);
          obj.setLinearVelocity(force);
        }
      }
    }
  }

  const pistonObj = { name, mesh: piston, update };
  Pistons.push(pistonObj);

  return pistonObj;
}