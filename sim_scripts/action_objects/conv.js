import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
export const movingObjectsMap = new Map();

/**
 * Spusti pohyb objektu mesh v smere directionVector a rychlosti speed,
 * pohyb bude pokracovat dokial je objekt v detection boxe.
 */
export function moveDetectedObject(mesh, detectionBox, directionVector, speed)
{
  let dirVec;

  if (directionVector instanceof THREE.Vector3)
  {
    dirVec = directionVector.clone().normalize();
  }
  else if (typeof directionVector === 'object' &&
           'x' in directionVector && 'y' in directionVector && 'z' in directionVector)
  {
    dirVec = new THREE.Vector3(directionVector.x, directionVector.y, directionVector.z).normalize();
  }
  else
  {
    //console.warn('moveDetectedObject: invalid directionVector, using (1,0,0) default');
    dirVec = new THREE.Vector3(1, 0, 0);
  }

  movingObjectsMap.set(mesh, {
    direction: dirVec,
    speed: speed,
    moved: 0,
    detectionBox: detectionBox,
    unlimited: true
  });

  //console.log(`moveDetectedObject: pridany objekt ${mesh.name} s rychlostou ${speed} a smerom ${dirVec.toArray()}`);
}

/**
 * Aktualizuj pozicie vsetkych pohybujucich sa objektov.
 * Zastav pohyb, ak objekt vyjde z detection boxu.
 */
export function updateDetectedObjectsMovement(delta)
{
  for (const [mesh, data] of movingObjectsMap.entries())
  {
    const { speed, direction, detectionBox } = data;
    const moveStep = speed * delta;

    const inside = detectionBox.detection.checkContains(mesh);

    // Ak inside je false, objekt už nie je v boxe => zastav pohyb
    if (inside === false)
    {
      movingObjectsMap.delete(mesh);
      console.log(`Objekt ${mesh.name} opustil detection box, pohyb zastaveny.`);
      continue;
    }

    // Posúvaj objekt, ak je vo vnútri alebo stav nezmenený (true alebo null)
    if (inside === true || inside === null)
    {
      mesh.position.addScaledVector(direction, moveStep);
    }
  }
}

/**
 * Zastav pohyb daneho objektu mesh.
 */
export function stopMovingObject(mesh)
{
  if(movingObjectsMap.has(mesh))
  {
    movingObjectsMap.delete(mesh);
    //console.log(`stopMovingObject: zastaveny pohyb objektu ${mesh.name}`);
  }
}