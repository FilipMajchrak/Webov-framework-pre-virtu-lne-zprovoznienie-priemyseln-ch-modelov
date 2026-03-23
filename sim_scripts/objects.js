// Prevod stupnov na radiany (Three.js pouziva radiany)
function degToRad(degrees)
{
  return degrees * (Math.PI / 180);
}

// Nacitanie .OBJ modelu a vytvorenie fyzikalneho boxu ako obalky
function loadOBJModel({scene,url,position = [0, 0, 0],scale = [1, 1, 1],rotation = [0, 0, 0],mass = 0,friction = 0.8,restitution = 0.3,onLoaded = () => {}}, name = '')
{
  const loader = new THREE.OBJLoader();

  loader.load(url, function (obj)
  {
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);

    obj.traverse(function (child)
    {
      if (child.isMesh)
      {
        child.geometry.computeBoundingBox();
        child.geometry.computeVertexNormals();
        child.material = new THREE.MeshStandardMaterial({ color: 0x999999 });
        child.position.sub(center);
      }
    });

    obj.position.set(...position);
    obj.scale.set(...scale);
    obj.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
    obj.name = name;

    scene.add(obj);

    const size = new THREE.Vector3();
    box.getSize(size);

    const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ visible: false }),friction,restitution);

    const collider = new Physijs.BoxMesh(new THREE.BoxGeometry(size.x, size.y, size.z),material,mass);

    collider.position.copy(obj.position);
    collider.rotation.copy(obj.rotation);
    collider.scale.copy(obj.scale);
    collider.name = name + '_Collider';

    scene.add(collider);
    showHitbox(obj, scene, collider);

    onLoaded(obj, collider);
  });
}

function loadConcaveOBJModel ({ scene, url, position, scale, rotation, mass = 0, onLoaded }) {
  const loader = new THREE.OBJLoader();

  loader.load(url, function (obj) {
    const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ visible: false }),0.8,0.3);

    // centrovanie
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);

    obj.traverse(child => {
      if (child.isMesh) {
        child.geometry.computeBoundingBox();
        child.geometry.computeVertexNormals();
        child.position.sub(center); // centrovanie
        child.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      }
    });

    obj.position.set(...position);
    obj.scale.set(...scale);
    obj.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));

    scene.add(obj);

    // Získanie geometrie pre fyziku
    let geometry = null;

    obj.traverse(child => {
      if (!geometry && child.isMesh && child.geometry) {
        // Ak je to BufferGeometry, skonvertuj
        if (child.geometry.isBufferGeometry) {
          geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);
        } else {
          geometry = child.geometry.clone();
        }
      }
    });

    if (!geometry) {
      console.error("Žiadna mesh geometria nebola nájdená v .obj súbore!");
      return;
    }

    const collider = new Physijs.ConcaveMesh(geometry, material, mass);
    collider.position.copy(obj.position);
    collider.rotation.copy(obj.rotation);
    collider.scale.copy(obj.scale);

    scene.add(collider);

    onLoaded?.(obj, collider);
  });
}

// Vytvori bounding box mesh (vizualny alebo referencny)
function createBoundingBoxMesh(object3D)
{
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshBasicMaterial({ visible: false });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);

  return mesh;
}

// Staticka kocka
function createStaticCube({scene,position = [0, 0, 0],rotation = [0, 0, 0],size = [10, 1, 10],color = 0x555555,friction = 0.8,restitution = 0.3},name = '')
{
  const geometry = new THREE.BoxGeometry(...size);
  const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color }),friction,restitution);

  const cubeStatic = new Physijs.BoxMesh(geometry, material, 0);
  cubeStatic.position.set(...position);
  cubeStatic.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  cubeStatic.name = name;

  scene.add(cubeStatic);
  showHitbox(cubeStatic, scene);

  return { mesh: cubeStatic, body: cubeStatic };
}

// Padajuca kocka
function createFallingCube({scene,position = [0, 20, 0],rotation = [0, 0, 0],size = [1, 1, 1],color = 0xff0000,mass = 1,friction = 0.8,restitution = 0.3},name = '')
{
  const geometry = new THREE.BoxGeometry(...size);
  const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color }),friction,restitution);

  const cubeFalling = new Physijs.BoxMesh(geometry, material, mass);
  cubeFalling.position.set(...position);
  cubeFalling.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  cubeFalling.setAngularFactor(new THREE.Vector3(0, 0, 0));
  cubeFalling.name = name;

  scene.add(cubeFalling);
  showHitbox(cubeFalling, scene);

  return { mesh: cubeFalling, body: cubeFalling };
}

// Padajuci cylinder
function createFallingCylinder({scene,position = [0, 20, 0],rotation = [0, 0, 0],radiusTop = 1,radiusBottom = 1,height = 2,radialSegments = 16,color = 0x00ff00,mass = 1,friction = 0.8,restitution = 0.3}, name = '')
{
  //Vizuálna geometria – valec
  const visualGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  const visualMaterial = new THREE.MeshStandardMaterial({ color });
  const visual = new THREE.Mesh(visualGeometry, visualMaterial);
  visual.rotation.set(degToRad(rotation[0]), degToRad(rotation[1]), degToRad(rotation[2]));
  scene.add(visual);

  //Kolízna geometria – box s rovnakou veľkosťou
  const boxGeometry = new THREE.BoxGeometry(radiusTop * 2, height, radiusTop * 2);
  const physMaterial = Physijs.createMaterial(new THREE.MeshStandardMaterial({ visible: false }), friction, restitution);
  const collider = new Physijs.BoxMesh(boxGeometry, physMaterial, mass);
  collider.position.set(...position);
  collider.rotation.set(degToRad(rotation[0]), degToRad(rotation[1]), degToRad(rotation[2]));
  collider.setAngularFactor(new THREE.Vector3(0, 1, 0));
  collider.setLinearFactor(new THREE.Vector3(1, 0, 1));
  collider.name = name;

  //Synchronizácia vizuálu s telom
  collider.userData.syncVisual = () =>
  {
    visual.position.copy(collider.position);
    visual.quaternion.copy(collider.quaternion);
  };

  //Debug & detection
  showHitbox(collider, scene);
  showDetectionProxyBox(collider, scene);

  scene.add(collider);

  return { mesh: collider, body: collider };
}


function createFallingSphere({scene,position = [0, 20, 0],rotation = [0, 0, 0],radius = 1,widthSegments = 24,heightSegments = 24,color = 0x0000ff,mass = 1,friction = 0.8,restitution = 0.3}, name = '')
{
  // Vizuálna geometria
  const visualGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const visualMaterial = new THREE.MeshStandardMaterial({ color });
  const visual = new THREE.Mesh(visualGeometry, visualMaterial);

  visual.position.set(...position);
  visual.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  visual.name = name + '_Visual';
  scene.add(visual);

  // Kolízna geometria
  const physMaterial = Physijs.createMaterial(
    new THREE.MeshStandardMaterial({ visible: false }),
    friction,
    restitution
  );

  const collider = new Physijs.SphereMesh(
    new THREE.SphereGeometry(radius, widthSegments, heightSegments),
    physMaterial,
    mass
  );

  collider.position.set(...position);
  collider.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  collider.name = name;

  // Synchronizácia vizuálu s fyzikálnym telom
  collider.userData.syncVisual = () =>
  {
    visual.position.copy(collider.position);
    visual.quaternion.copy(collider.quaternion);
  };

  collider.userData.syncVisual();

  // Debug
  showHitbox(visual, scene, collider);
  showDetectionProxyBox(collider, scene);

  scene.add(collider);

  return { mesh: visual, body: collider };
}