import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

// Mapa všetkých aktívne pohybujúcich sa objektov
export const movingObjectsMap = new Map();

// Mapa pre rýchle získanie PhysicsBody podľa mesh objektu
export const meshToBodyMap = new Map();

/**
 * Spusti pohyb objektu mesh v smere directionVector a rychlosti speed,
 * pomocou nastavenia velocity na PhysicsBody – využíva zotrvačnosť.
 * Počas pohybu v detection boxe sa linearDamping nastaví na 0 (bez odporu).
 */
export function moveDetectedObject(mesh, detectionBox, directionVector, speed)
{
  let dirVec;

  if (directionVector instanceof THREE.Vector3)
  {
    dirVec = directionVector.clone().normalize();
  }
  else if
  (
    typeof directionVector === 'object' &&
    'x' in directionVector &&
    'y' in directionVector &&
    'z' in directionVector
  )
  {
    dirVec = new THREE.Vector3(directionVector.x, directionVector.y, directionVector.z).normalize();
  }
  else
  {
    dirVec = new THREE.Vector3(1, 0, 0); // defaultný smer
  }

  // Získaj PhysicsBody z mapy
  const physicsBody = meshToBodyMap.get(mesh);

  if (!physicsBody)
  {
    console.warn('moveDetectedObject: PhysicsBody pre tento objekt nebol nájdený.');
    return;
  }

  // Nastav velocity a deaktivuj odpor (tlmenie) počas jazdy
  physicsBody.velocity.copy(dirVec.multiplyScalar(speed));
  physicsBody.linearDamping = 0; // žiadne spomaľovanie počas pohybu

  // Zapíš do mapy pohybu
  movingObjectsMap.set(mesh,
  {
    detectionBox: detectionBox,
    body: physicsBody
  });
}

/**
 * Sleduje pohybujúce sa objekty.
 * Ak objekt opustí detection box, spustí sa spomalenie (damping).
 */
export function updateDetectedObjectsMovement(delta)
{
  for (const [mesh, data] of movingObjectsMap.entries())
  {
    const { detectionBox, body } = data;

    const inside = detectionBox.detection.checkContains(mesh);

    // Ak objekt opustil detection box
    if (inside === false)
    {
      // Nastav lineárne tlmenie, aby sa objekt prirodzene spomalil
      body.linearDamping = 0.25;

      // Odstráň zo zoznamu pohybujúcich sa
      movingObjectsMap.delete(mesh);

      console.log(`Objekt ${mesh.name} opustil detection box, začína brzdiť.`);
    }

    // Žiadna priama manipulácia s pozíciou – o všetko sa stará fyzika
  }
}

/**
 * Zastaví pohyb objektu úplne – nastaví velocity na nulu.
 * Vhodné použiť, ak chceme objekt úplne „uzamknúť“.
 */
export function stopMovingObject(mesh)
{
  if (movingObjectsMap.has(mesh))
  {
    const { body } = movingObjectsMap.get(mesh);

    if (body)
    {
      // Úplne zastavíme pohyb
      body.velocity.set(0, 0, 0);
      body.linearDamping = 0.5; // ak by znovu nadobudol rýchlosť, rýchlo zastaví
    }

    movingObjectsMap.delete(mesh);

    console.log(`Objekt ${mesh.name} bol úplne zastavený.`);
  }
}