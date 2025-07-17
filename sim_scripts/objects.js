// objects.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/OBJLoader.js';
import { PhysicsBody } from './physics.js';
import { showHitbox, showDetectionBoxHelper} from './debugtool.js';

// Načítaj OBJ model a vlož ho do scény
/**
* Načíta OBJ model do scény.
*
* @param {object} options - nastavenia:
*   scene, physicsWorld, url, position, scale, rotation, onLoaded
*/
export function loadOBJModel({
  scene,
  physicsWorld,
  url,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  onLoaded = () => {}
}) 
{
  const loader = new OBJLoader();

  loader.load(url, (obj) => 
  {
    // Zarovnaj pivot do stredu
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);

    obj.traverse((child) => 
    {
      if (child.isMesh) {
        child.position.sub(center);
      }
    });

    scene.add(obj);

    obj.position.set(...position);
    obj.scale.set(...scale);
    obj.rotation.set(
      degToRad(rotation[0]),
      degToRad(rotation[1]),
      degToRad(rotation[2])
    );

    const physBody = new PhysicsBody(obj);
    physBody.isStatic = true;
    physicsWorld.addBody(physBody);

    showHitbox(obj, scene, physBody);

    onLoaded(obj);
  });
}

// Vytvor statickú kocku (platformu)
export function createStaticCube(scene, physicsWorld) 
{
  const cubeStatic = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 10),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  cubeStatic.position.set(0, 8, 18);
  scene.add(cubeStatic);

  const staticBody = new PhysicsBody(cubeStatic);
  staticBody.isStatic = true;
  physicsWorld.addBody(staticBody);

  showHitbox(cubeStatic, scene, staticBody);

  return{mesh:cubeStatic, body:staticBody};
}

// Vytvor kocku, ktorá padá
export function createFallingCube(scene, physicsWorld) 
{
  const cubeFalling = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  cubeFalling.position.set(0, 20, 0);
  scene.add(cubeFalling);

  const fallingBody = new PhysicsBody(cubeFalling);
  physicsWorld.addBody(fallingBody);

  showHitbox(cubeFalling, scene, fallingBody);

  return {mesh: cubeFalling,body: fallingBody,};
}

// Pomocná funkcia na prevod stupňov na radiány
export function degToRad(degrees) 
{
  return degrees * (Math.PI / 180);
}
