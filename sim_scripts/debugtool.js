const allHitboxes = [];
const defaultToggle = true;

function showHitbox(object3D, scene, physicsBody) {
  const box = new THREE.Box3().setFromObject(object3D);
  const yellowHelper = new THREE.Box3Helper(box, 0xffff00);
  yellowHelper.visible = defaultToggle;
  scene.add(yellowHelper);

  let greenHelper = null;
  let greenBox = null;

  if (
    physicsBody &&
    physicsBody instanceof THREE.Object3D &&
    physicsBody !== object3D
  ) {
    greenBox = new THREE.Box3().setFromObject(physicsBody);
    greenHelper = new THREE.Box3Helper(greenBox, 0x00ff00);
    greenHelper.visible = defaultToggle;
    scene.add(greenHelper);
  }

  function update() {
    object3D.updateMatrixWorld(true);
    box.setFromObject(object3D);
    yellowHelper.box.copy(box);

    if (greenHelper && physicsBody) {
      physicsBody.updateMatrixWorld(true);
      greenBox.setFromObject(physicsBody);
      greenHelper.box.copy(greenBox);
    }
  }

  const helpers = {
    yellowHelper,
    greenHelper,
    update,
    setVisible(visible) {
      yellowHelper.visible = visible;
      if (greenHelper) greenHelper.visible = visible;
    },
    dispose() {
      scene.remove(yellowHelper);
      yellowHelper.geometry.dispose?.();
      yellowHelper.material.dispose?.();

      if (greenHelper) {
        scene.remove(greenHelper);
        greenHelper.geometry.dispose?.();
        greenHelper.material.dispose?.();
      }

      const index = allHitboxes.indexOf(helpers);
      if (index !== -1) allHitboxes.splice(index, 1);
    }
  };

  allHitboxes.push(helpers);
  helpers.update(); // okamžitá inicializácia
  console.log('[DEBUG] showHitbox registered:', helpers);
  return helpers;
}

function showDetectionBox(detectionBox, scene) {
  if (!detectionBox || !detectionBox.box3) {
    console.warn('Neplatný detectionBox objekt');
    return;
  }

  const helper = new THREE.Box3Helper(detectionBox.box3, 0xff00ff); // fialová
  helper.visible = defaultToggle;
  scene.add(helper);

  function update() {
    detectionBox.update();
    helper.box.copy(detectionBox.box3);
  }

  const helpers = {
    helper,
    update,
    setVisible(visible) {
      helper.visible = visible;
    },
    dispose() {
      scene.remove(helper);
      helper.geometry?.dispose?.();
      helper.material?.dispose?.();

      const index = allHitboxes.indexOf(helpers);
      if (index !== -1) allHitboxes.splice(index, 1);
    }
  };

  allHitboxes.push(helpers);
  helpers.update();
  console.log('[DEBUG] showDetectionBox registered:', helpers);
  return helpers;
}

// Globálny prepínač hitboxov (volaj cez F12 konzolu)
window.toggleHitbox = function (state, index = null) {
  if (allHitboxes.length === 0) {
    console.warn('Hitboxy ešte nie sú inicializované.');
    return;
  }

  const toggle = (h, i) => {
    // Zistí, či ide o štandardný hitbox (yellowHelper) alebo detection box (helper)
    const current = h.yellowHelper?.visible ?? h.helper?.visible ?? true;
    const newState = typeof state === 'boolean' ? state : !current;
    h.setVisible(newState);
    console.log(`Hitbox ${i} ${newState ? 'zapnutý' : 'vypnutý'}`);
  };

  if (index === null) {
    allHitboxes.forEach((h, i) => toggle(h, i));
  } else if (index >= 0 && index < allHitboxes.length) {
    toggle(allHitboxes[index], index);
  } else {
    console.warn('Neplatný index hitboxu:', index);
  }
};

// Priebežná aktualizácia všetkých hitboxov (aj detection boxov)
function updateAllHitboxes() {
  for (const h of allHitboxes) {
    h.update();
  }
  requestAnimationFrame(updateAllHitboxes);
}
updateAllHitboxes();