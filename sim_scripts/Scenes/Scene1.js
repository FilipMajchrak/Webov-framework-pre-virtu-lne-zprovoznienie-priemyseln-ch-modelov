// ============================================
// Inicializácia globálneho I/O systému (vstupy + výstupy)
// ============================================

// Ak IO ešte neexistuje, vytvor ho s default hodnotami
// → hodnoty sa použijú len ako inicializácia pri prvom spustení
// → ďalej už PLC/Modbus alebo simulátor menia hodnoty a neprepíšu sa späť
if (!window.IO) {
  window.IO = {
    inputs: {
      start: false,
      conv: false,
      conv2: false,
      p1: false,
      p2: false,
      p3: false
    },
    outputs: {
      conv1end: false,
      conv2end: false,
      s1: false,
      s2: false,
      s3: false,
      p1_rec: true,
      p2_rec: true,
      p3_rec: true,
      p1_ex: false,
      p2_ex: false,
      p3_ex: false,
      dist1: 10
    }
  };
}
//Modbus mapovanie
Scene1.prototype.getModbusMap = function ()
{
  return {
    coils: {
      1: { path: "inputs.start" },
      2: { path: "inputs.conv" },
      3: { path: "inputs.conv2" },
      4: { path: "inputs.p1" },
      5: { path: "inputs.p2" },
      6: { path: "inputs.p3" }
    },
    holding: {
      40001: { path: "outputs.conv1end" },
      40002: { path: "outputs.conv2end" },
      40003: { path: "outputs.s1" },
      40004: { path: "outputs.s2" },
      40005: { path: "outputs.s3" },
      40006: { path: "outputs.p1_ex" },
      40007: { path: "outputs.p2_ex" },
      40008: { path: "outputs.p3_ex" },
      40009: { path: "outputs.dist1", scale: 100 }
    },
    input: {
      30001: { path: "outputs.dist1", scale: 100 }
    }
  };
};



// ============================================
// ============== Scene1 - KONŠTRUKTOR =========
// ============================================

function Scene1(camera)
{
  this.scene = new Physijs.Scene(); // vytvor Physijs scénu (s fyzikou)
  this.scene.setGravity(new THREE.Vector3(0, -9.81, 0)); // zapni gravitáciu

  this.camera = camera;

  this.updatables = [];      // sem sa ukladajú všetky objekty, ktoré sa majú updatovať
  this.movingBodies = [];    // objekty, ktoré sa môžu hýbať a reagovať na senzory
  this.detectionZones = [];  // (rezervované na detekčné zóny)

  this.ready = false;        // indikátor, či je scéna pripravená
  this.loadedCount = 0;      // koľko modelov sa načítalo
  this.expectedLoads = 3;    // koľko sa má načítať (upraviť ak bude viac modelov)

  this.initScene();          // spustenie hlavnej inicializácie
}

// Inicializácia scény – pridanie svetiel, objektov, senzorov, piestov...
// ============================================
// ========== Scene1.prototype.initScene ======
// ============================================

Scene1.prototype.initScene = function ()
{
  this.activatedObjects = new Set(); // sledovanie, ktoré objekty boli detegované

  this.addLights();
  this.addHelpers();

  // Načítanie modelu conveyor1 (obj)
  loadOBJModel({
    scene: this.scene,
    url: 'obj/conv1.obj',
    position: [0, 5, 0],
    scale: [0.01, 0.01, 0.01],
    rotation: [0, 0, 180],
    mass: 0,
    onLoaded: (obj, collider) => {
      this.conv1 = obj;
      this.conv1Body = collider;

      const boundingMesh = createBoundingBoxMesh(obj);
      this.scene.add(boundingMesh);
      showHitbox(obj, this.scene, boundingMesh);

      this.loadedCount++;
      if (this.loadedCount === this.expectedLoads) {
        this.ready = true;
      }
    }
  });

  loadOBJModel({
    scene: this.scene,
    url: 'obj/conv2.obj',
    position: [-0.5, 5, 36],
    scale: [0.1, 0.1, 0.1],
    rotation: [0, 0, 0],
    mass: 0,
    onLoaded: (obj, collider) => {
      this.conv2 = obj;
      this.conv2Body = collider;

      const boundingMesh = createBoundingBoxMesh(obj);
      this.scene.add(boundingMesh);
      showHitbox(obj, this.scene, boundingMesh);

       // Vytvor distance senzor až keď je model načítaný
      this.distanceSensor1 = createDistanceSensor({
        origin: new THREE.Vector3(0, 15, 17),
        rotation: new THREE.Euler(degToRad(-90), 0, 0),
        length: 8,
        scene: this.scene,
        targetObjects: [],
        showRay: true
      });

      // Pridaj update pre distance senzor
      this.updatables.push(() => {
        this.distanceSensor1.update();
        const dist = this.distanceSensor1.getDistance();
        IO.outputs.dist1 = typeof dist === 'number' ? parseFloat(dist.toFixed(2)) : 0;
      });

      this.loadedCount++;
      if (this.loadedCount === this.expectedLoads) {
        this.ready = true;
      }
    }
  });

// Načítanie modelu box
[22, 37, 52].forEach((z, index) => {
  const i = index + 1;

  loadConcaveOBJModel({
    scene: this.scene,
    url: 'obj/box.obj',
    position: [-6.2, 5, z],
    scale: [0.1, 0.08, 0.07],
    rotation: [0, 0, 0],
    mass: 0,
    onLoaded: (obj, collider) => {
      this[`box${i}`] = obj;
      this[`boxBody${i}`] = collider;

      const boundingMesh = createBoundingBoxMesh(obj);
      this.scene.add(boundingMesh);
      showHitbox(obj, this.scene, boundingMesh);

      createStaticCube({
        scene: this.scene,
        position: [-6.2, 2, z],
        size: [6, 0.1, 11],
        color: 0x444444,
        friction: 0.8,
        restitution: 0.3
      });

      this.loadedCount++;
      if (this.loadedCount === this.expectedLoads) {
        this.ready = true;
      }
    }
  });
});

  //[...Array(5)].forEach((_, i) => {
  //const z = -10 + i * 3; // aby neboli na sebe
  //this.spawnCylinder(i + 1, [0, 11, z]);
  //});

  // Vytvorenie 3 piestov – ovládané pomocou IO.inputs.p1 až p3
  [22, 37, 52].forEach((z, index) => {
    const i = index + 1;
    const piston = createPiston(this.scene, {
      name: `P${i}`,
      position: [5, 10, z],
      size: [6, 1, 1],
      color: 0x00ff00,
      direction: [-1, 0, 0],
      moveDistance: 6,
      speed: 2,
      getInputFn: () => IO.inputs[`p${i}`],
      setOutputFn: (v) => IO.outputs[`p${i}_ex`] = v,
      setRetractedFn: (v) => IO.outputs[`p${i}_rec`] = v,
      affectedObjects: this.movingBodies
    });
    this.updatables.push(piston.update);
  });

  // Dve detekčné zóny (napr. pás)
  this.detectionBox = createDetectionBox({
    width: 4,
    height: 0.2,
    depth: 26,
    scene: this.scene,
    position: [-0.5, 9.2, 0],
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 3,
    inputCondition: "conv"
  });

  this.detectionBox2 = createDetectionBox({
    width: 5,
    height: 0.2,
    depth: 46,
    scene: this.scene,
    position: [-0.5, 9.2, 36],
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 3,
    inputCondition: "conv2"
  });

  this.detectionBox3 = createDetectionBox({
    width: 3,
    height: 3,
    depth: 10,
    scene: this.scene,
    position: [0, 10.5, -8],
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 3,
    inputCondition: "conv2"
  });

  // Tri ray senzory (smerom doprava)
  const raySensorPositions = [24, 39, 54];
  raySensorPositions.forEach((z, i) => {
    const index = i + 1;
    this[`raySensor${index}`] = createRaySensor({
      origin: new THREE.Vector3(2, 10, z),
      rotation: new THREE.Euler(0, degToRad(90), 0),
      length: 5,
      scene: this.scene,
      targetObjects: this.movingBodies,
      showRay: true,
      onDetect: () => IO.outputs[`s${index}`] = true,
      onClear: () => IO.outputs[`s${index}`] = false
    });
  });

  this.raySensor4 = createRaySensor({
    origin: new THREE.Vector3(2, 10, 12),
    rotation: new THREE.Euler(0,degToRad(90), 0), // otočenie doprava
    length: 5,
    scene: this.scene,
    targetObjects: this.movingBodies,
    showRay: true,
    onDetect: (hit) => IO.outputs.conv1end = true,
    onClear: () => IO.outputs.conv1end = false
  });

  this.raySensor5 = createRaySensor({
    origin: new THREE.Vector3(2, 10, 58),
    rotation: new THREE.Euler(0,degToRad(90), 0), // otočenie doprava
    length: 5,
    scene: this.scene,
    targetObjects: this.movingBodies,
    showRay: true,
    onDetect: (hit) => IO.outputs.conv2end = true,
    onClear: () => IO.outputs.conv2end = false
  });

  //========================================
  // Hlavný update blok – volaný každý frame
  this.updatables.push(() => {
    for (const obj of this.movingBodies)
    {
      obj.userData?.syncVisual?.();

      const target = obj.userData?.detectionTarget ?? obj;
      const objectBox = new THREE.Box3().setFromObject(target);

      const isInBox1 = this.detectionBox.box3.intersectsBox(objectBox);
      if (isInBox1 && IO.inputs.conv)
      {
        moveDetectedObject(obj, this.detectionBox);
        this.activatedObjects.add(obj);
      }

      const isInBox2 = this.detectionBox2.box3.intersectsBox(objectBox);
      if (isInBox2 && IO.inputs.conv2)
      {
        moveDetectedObject(obj, this.detectionBox2);
        this.activatedObjects.add(obj);
      }
    }

    // update distance senzora
    if (this.distanceSensor1)
    {
      this.distanceSensor1.setTargets([...this.movingBodies, this.conv2Body]);
      this.distanceSensor1.update();
      const dist = this.distanceSensor1.getDistance();
      IO.outputs.dist1 = typeof dist === 'number' ? parseFloat(dist.toFixed(2)) : 0;
    }

    // Update ray senzorov (ak existujú)
    [this.raySensor1, this.raySensor2, this.raySensor3, this.raySensor4, this.raySensor5].forEach(sensor => sensor?.update());

    updateDetectedObjectsMovement();
  });

  // Automatický spawner každých 5 sekúnd
  this.spawnIndex = 1;

  const startSpawner = () => {
    if (!this.detectionBox3 || !this.detectionBox3.box3) {
      setTimeout(startSpawner, 500);
      return;
    }

    const maxCylinders = 20;

    const intervalId = setInterval(() => {
      if (this.spawnIndex > maxCylinders) {
        clearInterval(intervalId); // zastav časovač
        console.log(`[Spawner] Hotovo – vytvorených ${maxCylinders} valcov.`);
        return;
      }

      this.spawnCylinder(this.spawnIndex, [0, 11, -10], { min: 0.4, max: 0.9 });

    }, 5000);
  };

  startSpawner(); // spustenie oneskorene
};


// Pomocné funkcie pre svetlo, mriežku atď.
// ============================================
// ========== Scene1.prototype.addLights ======
// ============================================

Scene1.prototype.addLights = function ()
{
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  this.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  this.scene.add(directionalLight);
};

// ============================================
// ========== Scene1.prototype.addHelpers =====
// ============================================

Scene1.prototype.addHelpers = function ()
{
  const gridHelper = new THREE.GridHelper(300, 300);
  gridHelper.material.depthWrite = false;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  this.scene.add(gridHelper);
};

// Voliteľné hooky
Scene1.prototype.init = function () {};
Scene1.prototype.dispose = function () {};

// ======== Hlavný update cyklus scény ========
// ============================================
// ========== Scene1.prototype.update =========
// ============================================
Scene1.prototype.update = function (delta)
{
  if (!this.ready) return;

  for (const updateFn of this.updatables)
  {
    updateFn(delta);
  }

  this.scene.simulate(undefined, 1);
};

// ============================================
// ====== Scene1.prototype.spawnCylinder ======
// ============================================
Scene1.prototype.spawnCylinder = function(index, position = [0, 11, -10], radiusRange = { min: 0.45, max: 0.7 }) {
  const name = `Cylinder${index}`;

  setTimeout(() => {
    const isCylinderInZone = this.movingBodies.some(obj => {
      return obj.name?.startsWith('Cylinder') && this.detectionBox3?.box3?.intersectsBox(new THREE.Box3().setFromObject(obj));
    });

    if (isCylinderInZone) {
      //console.warn(`[Spawner] ${name} nebol spawnutý — niečo už je v zóne`);
      return;
    }

    const radius = THREE.MathUtils.lerp(radiusRange.min, radiusRange.max, Math.random());

    const { mesh: cylinder } = createFallingCylinder({
      scene: this.scene,
      position,
      rotation: [90, 0, 0],
      radiusTop: radius,
      radiusBottom: radius,
      height: 5,
      radialSegments: 24,
      color: 0x0077ff,
      mass: 1,
      friction: 0.9,
      restitution: 0.2
    }, name);

    cylinder.name = name;
    cylinder.userData.id = name;

    this.movingBodies.push(cylinder);
    //console.log(`[Spawner] Spawned: ${name} (r = ${radius.toFixed(2)})`);

    this.spawnIndex++;
  }, 100);
};