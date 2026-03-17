// ============================================
// Inicializácia globálneho I/O systému
// ============================================
if (!window.IO) {
  window.IO = {
    inputs: {
      testStart: false
    },
    outputs: {
      testLamp: false
    }
  };
}

// ============================================
// ============== Scene2 - KONŠTRUKTOR =========
// ============================================
function Scene2(camera)
{
  this.scene = new Physijs.Scene();
  this.scene.setGravity(new THREE.Vector3(0, -9.81, 0));

  this.camera = camera;
  this.updatables = [];
  this.ready = false;
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
  // ak nechceš mapovanie, nechaj null
  this.modbusMap = null;

  this.initScene();
};

// ============================================
// Inicializácia scény
// ============================================
Scene2.prototype.initScene = function ()
{
  this.addLights();
  this.addHelpers();

  // test logika
  this.updatables.push(() =>
  {
    IO.outputs.testLamp = IO.inputs.testStart;
  });

  this.ready = true;
};

// ============================================
// Svetlá
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
// Pomocná mriežka
// ============================================
Scene2.prototype.addHelpers = function ()
{
  const gridHelper = new THREE.GridHelper(100, 100);
  gridHelper.material.depthWrite = false;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  this.scene.add(gridHelper);
};

// ============================================
// Dispose
// ============================================
Scene2.prototype.dispose = function () {};

// ============================================
// Update
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