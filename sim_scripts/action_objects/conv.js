// Mapa všetkých aktívne pohybujúcich sa objektov
const movingObjectsMap = new Map();

/**
 * Spusti pohyb objektu mesh v smere directionVector a rýchlosti speed.
 * Ak nie je smer alebo rýchlosť zadaná, zoberie sa z detectionBox.
 */
function moveDetectedObject(mesh, detectionBox, directionVector = null, speed = null)
{
  let dirVec;

  // Zober smer z detectionBox, ak nie je zadaný
  if (!directionVector && detectionBox.moveDirection instanceof THREE.Vector3)
  {
    dirVec = detectionBox.moveDirection.clone().normalize();
  }
  else if (directionVector instanceof THREE.Vector3)
  {
    dirVec = directionVector.clone().normalize();
  }
  else if (
    directionVector &&
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

  // Ak by bol smer nulový, zruš pohyb
  if (dirVec.lengthSq() === 0)
  {
    console.warn('Nulový smer pohybu - pohyb sa neaplikuje.');
    return;
  }

  // Zober rýchlosť z detectionBox, ak nie je zadaná
  const finalSpeed = (typeof speed === 'number')
    ? speed
    : (typeof detectionBox.moveSpeed === 'number')
      ? detectionBox.moveSpeed
      : 5;

  if (!mesh.setLinearVelocity)
  {
    return;
  }

  // Nastav počiatočnú rýchlosť
  mesh.setLinearVelocity(dirVec.clone().multiplyScalar(finalSpeed));
  mesh.setDamping(0, mesh.angularDamping ?? 0.5);

  // Zaregistruj do pohybovej mapy spolu so smerom a rýchlosťou
  movingObjectsMap.set(mesh,
  {
    detectionBox: detectionBox,
    body: mesh,
    direction: dirVec,
    speed: finalSpeed
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
    const { detectionBox, body, direction, speed } = data;

    const inside = detectionBox.isInside(mesh);

    if (inside)
    {
      const velocity = body.getLinearVelocity();

      // Zachová vertikálnu rýchlosť (napr. pád) a udržiava horizontálnu zložku
      const newVelocity = new THREE.Vector3(direction.x * speed,velocity.y,direction.z * speed);
      body.setLinearVelocity(newVelocity);
      body.setDamping(0, body.angularDamping ?? 0.5);
    }
    else
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