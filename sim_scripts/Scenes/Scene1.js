import * as THREE from 'three';
import { PhysicsWorld } from '../physics.js';
import { createStaticCube, createFallingCube, loadOBJModel } from '../objects.js';
import { createDetectionBox } from '../detection.js';
import { showHitbox, showDetectionBoxHelper } from '../debugtool.js';

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

    //const detection2 = createDetectionBox({
    //  width: 6,
    //  height: 1,
    //  depth: 10,
    //  scene: this.scene,
    //  position: [0, 13, 0]
    //});

    // vloženie detection boxov do poľa spolu s ich sledovanými objektmi, callbackmi a stavmi
    this.detectionBoxes.push({
      detection: detection1,
      objects: [],         // objekty sledované v tomto boxe
      callbacks: new Map(),// mapa objekt → callbacky onEnter, onExit
      states: new Map()    // stav, či objekt je vo vnútri alebo nie
    });

    //this.detectionBoxes.push({
    //  detection: detection2,
    //  objects: [],
    //  callbacks: new Map(),
    //  states: new Map()
    //});

    // vytvorenie statickej kocky v scéne a pridanie do fyziky
    const staticCubeOBJ = createStaticCube(this.scene, this.physicsWorld);

    // pridanie padajúcej kocky cez samostatnú metódu
    // tá automaticky pridá objekt do všetkých detection boxov
    this.addFallingCube();

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
      onLoaded: (obj) => {
        const conv1Hitbox = showHitbox(obj, this.scene, null);
        this.updatables.push(conv1Hitbox);
        this.conv1 = obj;
      }
    });

    // pridanie vizualizácie a update funkcií pre všetky detection boxy
    for (const boxInfo of this.detectionBoxes)
    {
      // pridanie drôtového pomocníka na zobrazenie detekčnej oblasti
      const helper = showDetectionBoxHelper(boxInfo.detection, this.scene);
      this.updatables.push(helper);

      // update funkcia na aktualizáciu pozície detection boxu
      this.updatables.push({
        update: () => boxInfo.detection.update()
      });
    }

    // update funkcia, ktorá kontroluje vstup a výstup objektov v každom detection boxe
    // a spúšťa príslušné callbacky onEnter a onExit
    this.updatables.push({
      update: () => {
        for (const boxInfo of this.detectionBoxes)
        {
          for (const obj of boxInfo.objects)
          {
            const result = boxInfo.detection.checkContains(obj);

            if (result !== null) // stav sa zmenil - objekt práve vošiel alebo vyšiel
            {
              const callbacks = boxInfo.callbacks.get(obj);
              if (!callbacks) continue;

              if (result === true && callbacks.onEnter)
                callbacks.onEnter();

              if (result === false && callbacks.onExit)
                callbacks.onExit();

              boxInfo.states.set(obj, result);
            }
          }
        }
      }
    });
  }

  // metóda na pridanie nového padajúceho objektu do scény a do všetkých detection boxov
  addFallingCube()
  {
    const cube = createFallingCube(this.scene, this.physicsWorld);

    this.fallingBodies.push(cube.body);

    for (const boxInfo of this.detectionBoxes)
    {
      boxInfo.objects.push(cube.mesh);

      // nastavíme meno alebo id, ak ešte nemá
      if (!cube.mesh.name)
        cube.mesh.name = `FallingCube_${this.fallingBodies.length}`;

      boxInfo.callbacks.set(cube.mesh, {
        onEnter: () => console.log(`Objekt ${cube.mesh.name} vosiel do detection boxu`),
        onExit: () => console.log(`Objekt ${cube.mesh.name} vysiel z detection boxu`)
      });
    }
  }

  // kontrola kolízií medzi padajúcimi fyzikálnymi telesami
  checkCollisionWithFalling(bodyToCheck)
  {
    // získanie bounding boxu tela, ktoré kontrolujeme
    const boxToCheck = new THREE.Box3().setFromObject(bodyToCheck.mesh);

    for (const fallingBody of this.fallingBodies)
    {
      // preskočiť kontrolu kolízie sám so sebou
      if (fallingBody === bodyToCheck) continue;

      // získanie bounding boxu ďalšieho telesa
      const otherBox = new THREE.Box3().setFromObject(fallingBody.mesh);

      // kontrola prekrytia boxov
      if (boxToCheck.intersectsBox(otherBox)) return true;
    }

    return false;
  }

  // hlavná update funkcia, volaná každý frame
  update(delta)
  {
    // aktualizácia fyzikálneho sveta
    this.physicsWorld.update(delta);

    // update všetkých objektov, ktoré majú update funkciu
    for (const u of this.updatables)
    {
      if (typeof u.update === 'function')
        u.update(delta);
    }

    // kontrola kolízií medzi padajúcimi telesami
    for (const body of this.fallingBodies)
    {
      if (this.checkCollisionWithFalling(body))
      {
        console.log('Kolizia detekovana pre telo:', body);
        // tu možno pridať reakciu na kolíziu
      }
    }
  }

  // uvoľnenie všetkých referencií a dát pred zničením scény
  dispose()
  {
    this.updatables = [];
    this.fallingBodies = [];
    this.detectionBoxes = [];
  }
}