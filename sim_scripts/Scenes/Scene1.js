window.IO = {
  inputs: {
    conv: false,
    conv2: false,
    p1:false,
    p2:false,
    p3:false
  },
  outputs: {
    s1: false,
    s2: false,
    s3: false,
    p1: false,
    p2: false,
    p3: false
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

  loadOBJModel(
  {
    scene: this.scene,
    url: 'obj/conv2.obj',
    position: [-0.5, 5, 36],
    scale: [0.1, 0.1, 0.1],
    rotation: [0, 0, 0],
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

  //createStaticCube(
  //{
  //  scene: this.scene,
  //  position: [0, 8, 18],
  //  rotation: [0, 0, 0],
  //  size: [10, 1, 10],
  //  color: 0x444444
  //});

  //const { mesh: cube } = createFallingCube(
  //{
  //  scene: this.scene,
  //  position: [0, 10, 0],
  //  rotation: [0, 0, 0],
  //  size: [1, 1, 1],
  //  color: 0xff0000,
  //  mass: 1,
  //  friction: 1,
  //  restitution: 0.1
  //}, "Cube1");
  //this.movingBodies.push(cube);

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

  const piston1 = createPiston(this.scene,
  {
    name: "P1",
    position: [6, 10, 18],
    size: [5, 1, 1],
    color: 0x00ff00,
    direction: [-1, 0, 0], 
    moveDistance: 6,
    speed: 2,
    getInputFn: () => IO.inputs.p1,
    setOutputFn: (v) => IO.outputs.p1 = v,
    affectedObjects: this.movingBodies 
  });
  this.updatables.push(piston1.update);

  const piston2 = createPiston(this.scene,
  {
    name: "P2",
    position: [6, 10, 33],
    size: [5, 1, 1],
    color: 0x00ff00,
    direction: [-1, 0, 0], 
    moveDistance: 6,
    speed: 2,
    getInputFn: () => IO.inputs.p2,
    setOutputFn: (v) => IO.outputs.p2 = v,
    affectedObjects: this.movingBodies 
  });
  this.updatables.push(piston2.update);

  const piston3 = createPiston(this.scene,
  {
    name: "P3",
    position: [6, 10, 48],
    size: [5, 1, 1],
    color: 0x00ff00,
    direction: [-1, 0, 0], 
    moveDistance: 6,
    speed: 2,
    getInputFn: () => IO.inputs.p3,
    setOutputFn: (v) => IO.outputs.p3 = v,
    affectedObjects: this.movingBodies 
  });
  this.updatables.push(piston3.update);


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

  this.detectionBox2 = createDetectionBox(
  {
    width: 5,
    height: 0.2,
    depth: 46,
    scene: this.scene,
    position: [-0.5, 9.2, 36],
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 3,
    inputCondition: "conv2"
  });

  this.raySensor = createRaySensor({
    origin: new THREE.Vector3(2, 10, 20),
    rotation: new THREE.Euler(0, degToRad(90), 0), // otočenie doprava
    length: 5,
    scene: this.scene,
    targetObjects: this.movingBodies,
    showRay: true,
    onDetect: (hit) => IO.outputs.s1 = true,
    onClear: () => IO.outputs.s1 = false
  });

  this.raySensor2 = createRaySensor({
    origin: new THREE.Vector3(2, 10, 35),
    rotation: new THREE.Euler(0, degToRad(90), 0), // otočenie doprava
    length: 5,
    scene: this.scene,
    targetObjects: this.movingBodies,
    showRay: true,
    onDetect: (hit) => IO.outputs.s2 = true,
    onClear: () => IO.outputs.s2 = false
  });

  this.raySensor3 = createRaySensor({
    origin: new THREE.Vector3(2, 10, 50),
    rotation: new THREE.Euler(0, degToRad(90), 0), // otočenie doprava
    length: 5,
    scene: this.scene,
    targetObjects: this.movingBodies,
    showRay: true,
    onDetect: (hit) => IO.outputs.s3 = true,
    onClear: () => IO.outputs.s3 = false
  });



  this.updatables.push(() =>
  {
    for (const obj of this.movingBodies)
    {
      obj.userData?.syncVisual?.();

      const target = obj.userData?.detectionTarget ?? obj;
      const objectBox = new THREE.Box3().setFromObject(target);

      // detectionBox1 – základné správanie
      const isInBox1 = this.detectionBox.box3.intersectsBox(objectBox);
      const isBox1Enabled = IO.inputs.conv;

      if (isInBox1 && isBox1Enabled)
      {
        moveDetectedObject(obj, this.detectionBox);
        this.activatedObjects.add(obj);
      }

      // detectionBox2 – zatiaľ rovnaké správanie
      const isInBox2 = this.detectionBox2.box3.intersectsBox(objectBox);
      const isBox2Enabled = IO.inputs.conv2;

      if (isInBox2 && isBox2Enabled)
      {
        moveDetectedObject(obj, this.detectionBox2);
        this.activatedObjects.add(obj);
      }

    }

    [this.raySensor, this.raySensor2, this.raySensor3].forEach(sensor => sensor.update());
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
  const gridHelper = new THREE.GridHelper(300, 300);
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