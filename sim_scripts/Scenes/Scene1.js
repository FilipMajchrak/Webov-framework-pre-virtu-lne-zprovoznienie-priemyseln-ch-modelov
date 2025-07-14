import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PhysicsWorld } from '../physics.js';
import { createStaticCube, createFallingCube, loadOBJModel } from '../objects.js';
import { createDetectionBox } from '../detection.js';
import { showHitbox, showDetectionBoxHelper } from '../debugtool.js';
import { moveDetectedObject, updateDetectedObjectsMovement, stopMovingObject, meshToBodyMap } from '../action_objects/conv.js';

export const movingObjectsMap = new Map();

export class Scene1
{
  constructor(camera)
  {
    // vytvorenie scény a nastavenie farby pozadia
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#252526');

    // vytvorenie fyzikálneho sveta pre simuláciu
    this.physicsWorld = new PhysicsWorld();

    // pole objektov, ktoré majú update() funkciu a sú volané každý frame
    this.updatables = [];

    this.camera = camera;

    // pole na všetky padajúce fyzikálne objekty (PhysicsBody)
    this.fallingBodies = [];

    // pole pre všetky detection boxy, každý s vlastnými sledovanými objektmi a callbackmi
    this.detectionBoxes = [];

    // uchovávanie referencií na načítané modely
    this.conv1Body = null;
  }

  init()
  {
    // pridanie svetiel do scény
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // pridanie grid helpera pre orientáciu v priestore
    const gridHelper = new THREE.GridHelper(100, 100);
    this.scene.add(gridHelper);

    // vytvorenie detection boxov najprv, aby boli dostupné pri pridávaní padajúcich objektov
    const detection1 = createDetectionBox({
      width: 4,
      height: 1,
      depth: 25,
      scene: this.scene,
      position: [-0.5, 9, 0]
    });

    // vloženie detection boxov do poľa spolu s ich sledovanými objektmi, callbackmi a stavmi
    this.detectionBoxes.push({
      name: 'Conv1',
      detection: detection1,
      objects: [],
      callbacks: new Map(),
      states: new Map()
    });

    // vytvorenie statickej kocky v scéne a pridanie do fyziky
    const staticCubeOBJ = createStaticCube({
      scene: this.scene,
      physicsWorld: this.physicsWorld,
      position: [0, 8, 18],
      size: [10, 1, 10],
      color: 0x555555
    });
    staticCubeOBJ.body.surfaceFriction = 0.7;

    // vytvorenie padajúcej kocky
    const cube = createFallingCube({
      scene: this.scene,
      physicsWorld: this.physicsWorld,
      position: [0, 20, 0],
      rotation: [0, 0, 0],
      size: [1, 1, 1],
      color: 0xff0000
    });

    this.fallingBodies.push(cube.body);
    meshToBodyMap.set(cube.mesh, cube.body);

    for (const boxInfo of this.detectionBoxes)
    {
      boxInfo.objects.push(cube.mesh);

      boxInfo.callbacks.set(cube.mesh, {
        onEnter: () =>
        {
          console.log(`Objekt ${cube.mesh.name} vosiel do detection boxu ${boxInfo.name}`);

          if (boxInfo.name === "Conv1")
          {
            moveDetectedObject(cube.mesh, boxInfo, new THREE.Vector3(0, 0, 1), 4);
          }
        },
        onExit: () =>
        {
          console.log(`Objekt ${cube.mesh.name} vysiel z detection boxu ${boxInfo.name}`);
          stopMovingObject(cube.mesh);
        }
      });
    }

    // pridanie vizuálnych hitboxov k statickej kocke
    const staticHitbox = showHitbox(staticCubeOBJ.mesh, this.scene, null);
    this.updatables.push(staticHitbox);

    // nahratie a pridanie OBJ modelu s hitboxom do scény a fyziky
    loadOBJModel({
      scene: this.scene,
      physicsWorld: this.physicsWorld,
      url: 'obj/conv1.obj',
      position: [0, 5, 0],
      scale: [0.01, 0.01, 0.01],
      rotation: [0, 0, 180],
      onLoaded: (obj, body) =>
      {
        const conv1Hitbox = showHitbox(obj, this.scene, null);
        this.updatables.push(conv1Hitbox);
        this.conv1 = obj;
        this.conv1Body = body;
      }
    });

    // pridanie vizualizácie a update funkcií pre všetky detection boxy
    for (const boxInfo of this.detectionBoxes)
    {
      const helper = showDetectionBoxHelper(boxInfo.detection, this.scene);
      this.updatables.push(helper);

      this.updatables.push({
        update: () => boxInfo.detection.update()
      });
    }

    this.updatables.push({
      update: (delta) => updateDetectedObjectsMovement(delta)
    });

    this.updatables.push({
      update: () =>
      {
        for (const boxInfo of this.detectionBoxes)
        {
          for (const obj of boxInfo.objects)
          {
            const result = boxInfo.detection.checkContains(obj);

            if (result !== null)
            {
              const callbacks = boxInfo.callbacks.get(obj);
              if (!callbacks) continue;

              if (result === true && callbacks.onEnter)
              {
                callbacks.onEnter();
              }

              if (result === false && callbacks.onExit)
              {
                callbacks.onExit();
              }

              boxInfo.states.set(obj, result);
            }
          }
        }
      }
    });
  }

  // kontrola kolízií medzi padajúcimi fyzikálnymi telesami
  checkCollisionWithFalling(bodyToCheck)
  {
    const boxToCheck = new THREE.Box3().setFromObject(bodyToCheck.mesh);

    for (const otherBody of this.physicsWorld.bodies)
    {
      if (otherBody === bodyToCheck)
      {
        continue;
      }

      const otherBox = new THREE.Box3().setFromObject(otherBody.mesh);

      if (boxToCheck.intersectsBox(otherBox))
      {
        return true;
      }
    }

    return false;
  }

  // hlavná update funkcia, volaná každý frame
  update(delta)
  {
    this.physicsWorld.update(delta);
    updateDetectedObjectsMovement(delta);

    for (const u of this.updatables)
    {
      if (typeof u.update === 'function')
      {
        u.update(delta);
      }
    }

    for (const body of this.fallingBodies)
    {
      if (this.checkCollisionWithFalling(body))
      {
        //console.log('Kolizia detekovana pre telo:', body);
        // Tu môžeš spracovať reakciu
      }
    }
  }

  dispose()
  {
    this.updatables = [];
    this.fallingBodies = [];
    this.detectionBoxes = [];
  }
}