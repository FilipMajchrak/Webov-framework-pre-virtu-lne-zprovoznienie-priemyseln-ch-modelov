function createDetectionBox({width,height,depth,scene,position = [0, 0, 0],color = 0x00ffff,opacity = 0.2})
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
  let inside = false;

  function update()
  {
    mesh.updateMatrixWorld(true);
    box3.setFromObject(mesh);
  }

  function contains(object3D)
  {
    const objectBox = new THREE.Box3().setFromObject(object3D);
    const nowInside = box3.intersectsBox(objectBox);

    const justEntered = nowInside && !inside;
    inside = nowInside;
    return justEntered;
  }

  const detection = { mesh, box3, update, contains};
  showDetectionBox(detection, scene);

  return {mesh,box3,update,contains};
}