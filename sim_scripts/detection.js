function createDetectionBox({width,height,depth,scene,position = [0, 0, 0],color = 0x00ffff,opacity = 0.2,moveDirection = new THREE.Vector3(1, 0, 0),moveSpeed = 5,inputCondition = null})
{
  // Vytvorenie geometrie a materiálu pre detekčný mesh
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({color,opacity,transparent: true,wireframe: true}); //wireframe: true - len kostra, nie plná plocha

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false; // Box je primárne neviditeľný (debug vizualizácia zvlášť)

  // Nastavenie pozície
  if (position instanceof THREE.Vector3)
  {
    mesh.position.copy(position);
  }
  else if (Array.isArray(position))
  {
    mesh.position.set(position[0], position[1], position[2]);
  }

  scene.add(mesh); // Pridaj box do scény

  const box3 = new THREE.Box3();      // THREE.Box3 pre výpočty kolízie
  const insideMap = new Map();        // Mapovanie objektov, ktoré už boli vnútri

  // Aktualizácia pozície a veľkosti boxu (každý frame)
  function update()
  {
    mesh.updateMatrixWorld(true);
    box3.setFromObject(mesh); // obnov bounding box
  }

  // Zistí, či objekt práve VSTÚPIL (prechod z "mimo" → "vnútri")
  function contains(object3D)
  {
    const target = object3D.userData.detectionTarget ?? object3D;
    target.updateMatrixWorld(true);

    let objectBox = new THREE.Box3();

    if (target.geometry && target.geometry.boundingBox)
    {
      // Ak má predpočítaný bounding box
      objectBox.copy(target.geometry.boundingBox).applyMatrix4(target.matrixWorld);
    }
    else if (target.geometry)
    {
      // Ak nemá bounding box, ale má geometriu → spočítaj
      target.geometry.computeBoundingBox();
      objectBox.copy(target.geometry.boundingBox).applyMatrix4(target.matrixWorld);
    }
    else
    {
      // Fallback – z objektu
      objectBox.setFromObject(target);
    }

    const nowInside = box3.intersectsBox(objectBox);          // je objekt aktuálne vnútri?
    const wasInside = insideMap.get(object3D) === true;       // bol vnútri naposledy?

    insideMap.set(object3D, nowInside); // zapíš nový stav
    return nowInside && !wasInside;     // true len ak objekt práve vošiel
  }

  // Zistí, či je objekt stále vnútri boxu (bez ohľadu na vstup)
  function isInside(object3D)
  {
    const objectBox = new THREE.Box3().setFromObject(object3D);
    return box3.intersectsBox(objectBox);
  }

  // Detekčný objekt s verejnými vlastnosťami a metódami
  const detection = {mesh, box3, update, contains, isInside, moveDirection, moveSpeed, inputCondition};

  //mesh,              // THREE.Mesh reprezentujúci box
  //box3,              // THREE.Box3 pre výpočty
  //update,            // aktualizačná funkcia
  //contains,          // detekcia prvého vstupu
  //isInside,          // detekcia zotrvania vnútri
  //moveDirection,     // voliteľný smer, ktorým sa má objekt posúvať
  //moveSpeed,         // voliteľná rýchlosť pohybu
  //inputCondition     // názov podmienky z IO.inputs (napr. "conv")

  // Zobraz debug vizualizáciu boxu (voliteľne)
  showDetectionBox(detection, scene);

  return detection; // Vráti detekčný box
}