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
    // Ziskaj stred bounding boxu na centrovanie
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Nastav material a posun meshe tak, aby boli centrovane
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

    // pridaj vizuálny objekt
    scene.add(obj);

    // Vytvor fyzikalny collider s rovnakym rozmerom ako bounding box
    const size = new THREE.Vector3();
    box.getSize(size);

    const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ visible: false }),friction,restitution);

    const collider = new Physijs.BoxMesh(new THREE.BoxGeometry(size.x, size.y, size.z),material,mass);

    collider.position.copy(obj.position);
    collider.rotation.copy(obj.rotation);
    collider.scale.copy(obj.scale);
    collider.name = name + '_Collider';

    scene.add(collider);
    showHitbox(obj, scene, collider); // Zobrazi zltu obalku

    onLoaded(obj, collider);
  });
}

// Vytvori bounding box mesh (vizualny alebo referencny)
// Tento mesh nie je fyzikalne telo – je len reprezentaciou objemu objektu
function createBoundingBoxMesh(object3D) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshBasicMaterial({visible:false});

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);

  return mesh;
}

// Vytvori staticku kocku (napr. podlahu) s nulovou hmotnostou
function createStaticCube({scene,position = [0, 0, 0],rotation = [0, 0, 0],size = [10, 1, 10],color = 0x555555,friction = 0.8,restitution = 0.3},name = '')
{
  const geometry = new THREE.BoxGeometry(...size);
  const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color }),friction,restitution);

  const cubeStatic = new Physijs.BoxMesh(geometry, material, 0);
  cubeStatic.position.set(...position);
  cubeStatic.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  cubeStatic.name = name;

  scene.add(cubeStatic);
  showHitbox(cubeStatic, scene); // Zobrazi zltu obalku

  return { mesh: cubeStatic, body: cubeStatic };
}

// Vytvori dynamicku (padajucu) kocku s nenulovou hmotnostou
function createFallingCube({scene,position = [0, 20, 0],rotation = [0, 0, 0],size = [1, 1, 1],color = 0xff0000,mass = 1,friction = 0.8,restitution = 0.3},name = '')
{
  const geometry = new THREE.BoxGeometry(...size);
  const material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color }),friction,restitution);

  const cubeFalling = new Physijs.BoxMesh(geometry, material, mass);
  cubeFalling.position.set(...position);
  cubeFalling.rotation.set(degToRad(rotation[0]),degToRad(rotation[1]),degToRad(rotation[2]));
  cubeFalling.name = name;

  scene.add(cubeFalling);
  showHitbox(cubeFalling, scene); // Zobrazi zltu obalku

  return { mesh: cubeFalling, body: cubeFalling };
}