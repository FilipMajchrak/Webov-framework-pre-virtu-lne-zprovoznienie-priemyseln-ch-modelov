// Mapa všetkých aktívne pohybujúcich sa objektov
const movingObjectsMap = new Map();

/**
 * Spusti pohyb objektu mesh v smere directionVector a rýchlosti speed.
 * Predpokladá sa, že mesh je Physijs.Mesh.
 */
function moveDetectedObject(mesh, detectionBox, directionVector, speed)
{
  let dirVec;

  if (directionVector instanceof THREE.Vector3)
  {
    dirVec = directionVector.clone().normalize();
  }
  else if (
    typeof directionVector === 'object' &&
    'x' in directionVector && 'y' in directionVector && 'z' in directionVector
  )
  {
    dirVec = new THREE.Vector3(directionVector.x, directionVector.y, directionVector.z).normalize();
  }
  else
  {
    dirVec = new THREE.Vector3(1, 0, 0); // defaultný smer
  }

  if (!mesh.setLinearVelocity)
  {
    //console.warn('moveDetectedObject: mesh nie je Physijs objekt.');
    return;
  }

  mesh.setLinearVelocity(dirVec.multiplyScalar(speed));
  mesh.setDamping(0, mesh.angularDamping ?? 0.5);

  movingObjectsMap.set(mesh, {
    detectionBox: detectionBox,
    body: mesh
  });
}

/**
 * Sleduje pohybujúce sa objekty.
 * Ak objekt opustí detection box, spustí sa spomalenie (damping).
 */
function updateDetectedObjectsMovement(delta)
{
  for (const [mesh, data] of movingObjectsMap.entries())
  {
    const { detectionBox, body } = data;

    const inside = detectionBox.contains(mesh);

    if (!inside)
    {
      body.setDamping(0.9, body.angularDamping ?? 0.5);

      if (body.getLinearVelocity().length() < 0.1)
      {
        stopMovingObject(mesh);
      }
    }
  }
}

/**
 * Zastaví objekt a odstráni ho z mapy pohybu.
 */
function stopMovingObject(mesh)
{
  if (mesh.setLinearVelocity)
  {
    mesh.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    mesh.setDamping(0.9, mesh.angularDamping ?? 0.5);
  }

  movingObjectsMap.delete(mesh);
}