import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PhysicsWorld } from '../physics.js';
import { createStaticCube, createFallingCube, loadOBJModel } from '../objects.js';
import { createDetectionBox } from '../detection.js';
import { showHitbox, showDetectionBoxHelper } from '../debugtool.js';

export class Scene1 
{
  constructor(camera) 
  {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#252526');

    this.physicsWorld = new PhysicsWorld();
    this.updatables = [];

    this.camera = camera;
  }

  init() 
  {
    // Svetlá
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const gridHelper = new THREE.GridHelper(100, 100);
    this.scene.add(gridHelper);

    // ➜ Tvoje objekty
    const staticCubeOBJ = createStaticCube(this.scene, this.physicsWorld);
    const fallingCubeOBJ = createFallingCube(this.scene, this.physicsWorld);

    loadOBJModel({
      scene: this.scene,
      physicsWorld: this.physicsWorld,
      url: 'obj/conv1.obj',
      position: [0, 5, 0],
      scale: [0.01, 0.01, 0.01],
      rotation: [0, 0, 180],
      onLoaded: (obj) => {
        //console.log('Model hotový:', obj);

        const conv1Hitbox = showHitbox(obj, this.scene, obj);
        this.updatables.push(conv1Hitbox);

        this.conv1 = obj;
      }
    });


    // Pridaj hitboxy do updatables
    const staticHitbox = showHitbox(staticCubeOBJ.mesh, this.scene, staticCubeOBJ.body);
    const fallingHitbox = showHitbox(fallingCubeOBJ.mesh, this.scene, fallingCubeOBJ.body);
    this.updatables.push(staticHitbox);
    this.updatables.push(fallingHitbox);

    // ➜ Detection box
    const detection = createDetectionBox({
      width: 4,
      height: 1,
      depth: 25,
      scene: this.scene,
      position: [-0.5, 9, 0]
    });

    // Detection vizualizácia
    const detectionHelper = showDetectionBoxHelper(detection, this.scene);
    this.updatables.push(detectionHelper);

    // Detection box sám do updatables
    this.updatables.push({
      update: () => detection.update()
    });

    // Log, ak kocka vojde do detection boxu
    this.updatables.push({
    update: () => detection.update()
    });

    // Log, ak kocka vojde do detection boxu
    this.updatables.push({
      update: () => {
        // detection.update(); // duplikát netreba, voláš vyššie

        const result = detection.checkContains(fallingCubeOBJ.mesh);

        if (result === true) {
          console.log('Objekt PRÁVE VOŠIEL!');
        }
        if (result === false) {
          console.log('Objekt PRÁVE VYŠIEL!');
        }
      }
    });
    }

  update(delta) 
  {
    this.physicsWorld.update(delta);

    for (const u of this.updatables) {
      u.update();
    }
  }

  dispose() 
  {
    // Sem daj logiku na zmazanie všetkých objektov
    this.updatables = [];
  }
}