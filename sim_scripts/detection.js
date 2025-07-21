function createDetectionBox({width,height,depth,scene,position = [0, 0, 0],color = 0x00ffff,opacity = 0.2,moveDirection = new THREE.Vector3(1, 0, 0),moveSpeed = 5,inputCondition = null})
{
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({color,opacity,transparent: true,wireframe: true});

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;

  if (position instanceof THREE.Vector3)
  {
    mesh.position.copy(position);
  }
  else if (Array.isArray(position))
  {
    mesh.position.set(position[0], position[1], position[2]);
  }

  scene.add(mesh);

  const box3 = new THREE.Box3();
  const insideMap = new Map();

  function update()
  {
    mesh.updateMatrixWorld(true);
    box3.setFromObject(mesh);
  }

  // Vracia true len pri vstupe
  function contains(object3D)
  {
    const target = object3D.userData.detectionTarget ?? object3D;
    target.updateMatrixWorld(true);

    let objectBox = new THREE.Box3();

    if (target.geometry && target.geometry.boundingBox)
    {
      objectBox.copy(target.geometry.boundingBox).applyMatrix4(target.matrixWorld);
    }
    else if (target.geometry)
    {
      target.geometry.computeBoundingBox();
      objectBox.copy(target.geometry.boundingBox).applyMatrix4(target.matrixWorld);
    }
    else
    {
      objectBox.setFromObject(target);
    }

    const nowInside = box3.intersectsBox(objectBox);
    const wasInside = insideMap.get(object3D) === true;

    insideMap.set(object3D, nowInside);
    return nowInside && !wasInside;
  }

  // Vracia true pokiaľ je objekt stále vnútri (každý frame)
  function isInside(object3D)
  {
    const objectBox = new THREE.Box3().setFromObject(object3D);
    return box3.intersectsBox(objectBox);
  }

  const detection = {mesh,box3,update,contains,isInside,moveDirection,moveSpeed,inputCondition};

  showDetectionBox(detection, scene);
  return detection;
}