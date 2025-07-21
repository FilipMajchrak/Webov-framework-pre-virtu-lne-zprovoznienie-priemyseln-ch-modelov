window.IO = {
  inputs: {
    conv: false
  },
  outputs: {
    conveyorRunning: false,
    pistonExtended: false,
    alarm: false
  }
};

function Scene1(camera)
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

  this.initScene();
}

Scene1.prototype.initScene = function ()
{
  this.activatedObjects = new Set(); // sleduje len objekty, ktoré sa reálne pohli

  this.addLights();
  this.addHelpers();

  loadOBJModel(
  {
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

  createStaticCube(
  {
    scene: this.scene,
    position: [0, 8, 18],
    rotation: [0, 0, 0],
    size: [10, 1, 10],
    color: 0x444444
  });

  const { mesh: cube } = createFallingCube(
  {
    scene: this.scene,
    position: [0, 10, 0],
    rotation: [0, 0, 0],
    size: [1, 1, 1],
    color: 0xff0000,
    mass: 1,
    friction: 1,
    restitution: 0.1
  }, "Cube1");
  this.movingBodies.push(cube);

  const { mesh: cylinder } = createFallingCylinder(
  {
    scene: this.scene,
    position: [0, 11, -10],
    rotation: [90, 0, 0],
    radiusTop: 0.5,
    radiusBottom: 0.5,
    height: 5,
    radialSegments: 24,
    color: 0x0077ff,
    mass: 1,
    friction: 0.9,
    restitution: 0.2
  }, "Cylinder");
  this.movingBodies.push(cylinder);

  this.detectionBox = createDetectionBox(
  {
    width: 4,
    height: 0.2,
    depth: 26,
    scene: this.scene,
    position: [-0.5, 9.2, 0],
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 3,
    inputCondition: "conv"
  });

  this.updatables.push(() =>
  {
    for (const obj of this.movingBodies)
    {
      obj.userData?.syncVisual?.();

      const isActivated = this.activatedObjects.has(obj);

      const target = obj.userData?.detectionTarget ?? obj;
      const objectBox = new THREE.Box3().setFromObject(target);
      const isStillInside = this.detectionBox.box3.intersectsBox(objectBox);

      const conditionKey = this.detectionBox.inputCondition;
      const isEnabled = typeof conditionKey === "string" ? IO.inputs?.[conditionKey] === true : true;

      // Objekt je v zóne, nie je aktívny a podmienka je splnená → aktivuj
      if (isStillInside && isEnabled)
      {
        moveDetectedObject(obj, this.detectionBox);
        this.activatedObjects.add(obj);
      }
    }

    updateDetectedObjectsMovement();
  });
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
  if (!this.ready)
  {
    return;
  }

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