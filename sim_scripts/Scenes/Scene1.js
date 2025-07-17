function Scene1(camera)
{
  this.scene = new Physijs.Scene();
  this.scene.setGravity(new THREE.Vector3(0, -9.81, 0));

  this.camera = camera;
  this.updatables = [];
  this.movingBodies = [];
  this.detectionZones = [];

  this.initScene();
}

Scene1.prototype.initScene = function ()
{
  this.addLights();
  this.addHelpers();

  loadOBJModel({
    scene: this.scene,
    url: 'obj/conv1.obj',
    position: [0, 5, 0],
    scale: [0.01, 0.01, 0.01],
    rotation: [0, 0, 180],
    mass: 0,
  });

  createStaticCube({
    scene: this.scene,
    position: [0, 8, 18],
    rotation: [0, 0, 0],
    size: [10, 1, 10],
    color: 0x444444
  });

  createFallingCube({
    scene: this.scene,
    position: [0, 15, 0],
    rotation: [0, 0, 0],
    size: [1, 1, 1],
    color: 0xff0000,
    mass: 1,
    friction: 1,
    restitution: 1,
  });

  this.detectionBox = createDetectionBox({
    width: 4,
    height: 0.5,
    depth: 25,
    scene: this.scene,
    position: [-0.5, 9.5, 0]
  });

  this.updatables.push(() => this.detectionBox.update());
};

Scene1.prototype.addLights = function ()
{
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  this.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  this.scene.add(directionalLight);
};

Scene1.prototype.addHelpers = function ()
{
  const gridHelper = new THREE.GridHelper(100, 100);
  gridHelper.material.depthWrite = false;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  this.scene.add(gridHelper);
};

Scene1.prototype.init = function ()
{
  // ďalšia inicializácia ak treba
};

Scene1.prototype.update = function (delta)
{
  for (const updateFn of this.updatables)
  {
    updateFn(delta);
  }

  this.scene.simulate(undefined, 1);
};

Scene1.prototype.dispose = function ()
{
  // čistenie ak treba
};