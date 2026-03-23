// ============================================
// Inicializácia globálneho I/O systému
// ============================================

function createScene2IO()
{
  return {
    inputs: {
      testStart: false,
      p1: false,
    },
    outputs: {
      testLamp: false,
      p1_rec: true,
      p1_ex: false,
    }
  };
}

if (!window.IO)
{
  window.IO = createScene2IO();
}

Scene2.prototype.getDefaultIO = function ()
{
  return createScene2IO();
};

Scene2.prototype.resetIO = function ()
{
  window.IO = createScene2IO();
};

// ============================================
// ============== Scene2 - KONŠTRUKTOR =========
// ============================================

function Scene2(camera)
{
  this.scene = new Physijs.Scene();
  this.scene.setGravity(new THREE.Vector3(0, -9.81, 0));

  this.camera = camera;

  this.updatables = [];
  this.movingBodies = [];
  this.detectionZones = [];

  this.ready = false;
  this.loadedCount = 0;
  this.expectedLoads = 1;

  this.modbusMap = null;
}

// ============================================
// Modbus mapovanie
// ============================================

Scene2.prototype.getModbusMap = function ()
{
  return this.modbusMap || {};
};

Scene2.prototype.init = async function ()
{
  try
  {
    const res = await fetch("sim_scripts/Scenes/modbusMap_scene2.json");
    this.modbusMap = await res.json();
    console.log("[Scene2] Modbus map loaded", this.modbusMap);
  }
  catch (e)
  {
    console.error("[Scene2] Modbus map load failed", e);
    this.modbusMap = null;
  }

  this.initScene();
};

// ============================================
// ========== Scene2.prototype.initScene ======
// ============================================

Scene2.prototype.initScene = function ()
{
  this.activatedObjects = new Set();

  this.addLights();
  this.addHelpers();

  loadOBJModel({
    scene: this.scene,
    url: 'obj/conv1.obj',
    position: [0, 5, 0],
    scale: [0.01, 0.01, 0.01],
    rotation: [0, 0, 180],
    mass: 0,
    onLoaded: (obj, collider) =>
    {
      this.conv1 = obj;
      this.conv1Body = collider;

      const boundingMesh = createBoundingBoxMesh(obj);
      this.scene.add(boundingMesh);
      showHitbox(obj, this.scene, boundingMesh);

      this.loadedCount++;
      if (this.loadedCount === this.expectedLoads)
      {
        this.ready = true;
      }
    }
  });

  const sphere = createFallingSphere({
    scene: this.scene,
    position: [0, 20, 0],
    radius: 1,
    color: 0x3399ff,
    mass: 1
  }, 'sphere1');

  this.sphere = sphere.mesh;
  this.sphereBody = sphere.body;

  this.movingBodies.push(sphere.body);

  const size = 0.5
  const height = 10
  const offset = 1

  const center = [0, 13, 0] 

  const pillars = [
    [-offset, height / 2, -offset],
    [ offset, height / 2, -offset],
    [-offset, height / 2,  offset],
    [ offset, height / 2,  offset],
  ]

  pillars.forEach(pos => {
    createStaticCube({
      scene: this.scene,
      position: [
        pos[0] + center[0],
        pos[1] + center[1],
        pos[2] + center[2],
      ],
      size: [size, height, size],
    })
  })

  this.piston1 = createPiston(this.scene, {
    name: "p1",
    position: [0, 13, 1],
    size: [1, 1, 5],
    color: 0x00cc00,
    moveDistance: 3,
    speed: 4,
    direction: [0, 0, 1],
    getInputFn: () => IO.inputs.p1,
    setOutputFn: (v) => {
      IO.outputs.p1_ex = v;
    },
    setRetractedFn: (v) => {
      IO.outputs.p1_rec = v;
    },
    affectedObjects: [],
    supportedObject: this.sphereBody
  });

this.updatables.push((delta) => this.piston1.update(delta));

  // ============================================
  // Hlavný update blok – logika scény
  // ============================================
  this.updatables.push(() =>
  {
    IO.outputs.testLamp = IO.inputs.testStart;

    for (const obj of this.movingBodies)
    {
      obj.userData?.syncVisual?.();
    }
  });
};

// ============================================
// ========== Scene2.prototype.addLights =======
// ============================================

Scene2.prototype.addLights = function ()
{
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  this.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  this.scene.add(directionalLight);
};

// ============================================
// ========== Scene2.prototype.addHelpers ======
// ============================================

Scene2.prototype.addHelpers = function ()
{
  const gridHelper = new THREE.GridHelper(100, 100);
  gridHelper.material.depthWrite = false;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  this.scene.add(gridHelper);
};

Scene2.prototype.dispose = function () {};

// ============================================
// ========== Scene2.prototype.update ==========
// ============================================
Scene2.prototype.update = function (delta)
{
  if (!this.ready) return;

  for (const updateFn of this.updatables)
  {
    updateFn(delta);
  }

  this.scene.simulate(undefined, 1);
};