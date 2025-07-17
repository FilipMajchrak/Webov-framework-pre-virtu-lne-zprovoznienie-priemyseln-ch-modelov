import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const allHitboxes = [];
const defaultToggle = true;

/**
* Vytvor helper pre detection box.
* Detection box je priehľadný Mesh, ale toto zvýrazní jeho AABB.
*
* @param {object} detection - detection helper { mesh, box3, update(), contains() }
* @param {THREE.Scene} scene - scéna, do ktorej sa vloží helper
* @returns {object} helper { boxHelper, setVisible(), dispose() }
*/

export function showHitbox(object3D, scene, physicsBody)
{
  const box = new THREE.Box3();
  const yellowHelper = new THREE.Box3Helper(box, 0xffff00);
  yellowHelper.visible = defaultToggle;
  scene.add(yellowHelper);

  let greenHelper = null;
  let greenBox = null;

  if (physicsBody && physicsBody.mesh)
  {
    greenBox = new THREE.Box3();
    greenHelper = new THREE.Box3Helper(greenBox, 0x00ff00);
    greenHelper.visible = defaultToggle;
    scene.add(greenHelper);
  }

  function update()
  {
    object3D.updateMatrixWorld(true);
    box.setFromObject(object3D);

    if (greenHelper && physicsBody.mesh)
    {
      physicsBody.mesh.updateMatrixWorld(true);
      greenBox.setFromObject(physicsBody.mesh);
    }
  }

  const helpers = {
    yellowHelper,
    greenHelper,
    update,   // Vráť update funkciu!
    setVisible(visible)
    {
      yellowHelper.visible = visible;
      if (greenHelper)
        greenHelper.visible = visible;
    },
    dispose()
    {
      scene.remove(yellowHelper);
      yellowHelper.geometry.dispose();
      yellowHelper.material.dispose();

      if (greenHelper)
      {
        scene.remove(greenHelper);
        greenHelper.geometry.dispose();
        greenHelper.material.dispose();
      }

      const index = allHitboxes.indexOf(helpers);
      if (index !== -1)
        allHitboxes.splice(index, 1);
    }
  };

  allHitboxes.push(helpers);

  return helpers;
}

export function showDetectionBoxHelper(detection, scene)
{
  const helper = new THREE.Box3Helper(detection.box3, 0xff00ff);
  helper.visible = defaultToggle;
  scene.add(helper);

  const update = () => {
    detection.update();
    helper.box.copy(detection.box3);
  };

  const helperObj = {
    update,
    setVisible(state) {
      helper.visible = state;
    },
    dispose() {
      scene.remove(helper);
    }
  };

  allHitboxes.push(helperObj);
  return helperObj;
}


// Funkcia na prepínanie viditeľnosti hitboxov
window.toggleHitbox = function(state, index = null)
{
  if (allHitboxes.length === 0)
  {
    console.warn('Hitboxy ešte nie sú inicializované.');
    return;
  }

  if (index === null)
  {
    // Hromadné prepnutie všetkých
    if (typeof state !== 'boolean')
    {
      // Prepni na opačný stav všetkých
      const newState = !allHitboxes[0].yellowHelper.visible;
      allHitboxes.forEach(h => h.setVisible(newState));
      console.log(`Všetky hitboxy prepnuté na ${newState ? 'zapnuté' : 'vypnuté'}`);
    }
    else
    {
      // Nastav všetky na zadaný stav
      allHitboxes.forEach(h => h.setVisible(state));
      console.log(`Všetky hitboxy nastavené na ${state ? 'zapnuté' : 'vypnuté'}`);
    }
  }
  else
  {
    // Prepni konkrétny podľa indexu
    if (index < 0 || index >= allHitboxes.length)
    {
      console.warn('Neplatný index hitboxu:', index);
      return;
    }

    if (typeof state !== 'boolean')
    {
      // Prepni na opačný stav
      const current = allHitboxes[index].yellowHelper.visible;
      allHitboxes[index].setVisible(!current);
      console.log(`Hitbox ${index} prepnutý na ${!current ? 'vypnutý' : 'zapnutý'}`);
    }
    else
    {
      allHitboxes[index].setVisible(state);
      console.log(`Hitbox ${index} nastavený na ${state ? 'zapnutý' : 'vypnutý'}`);
    }
  }
};

/*
    toggleHitbox();      // prepne stav
    toggleHitbox(true);  // zapne
    toggleHitbox(false); // vypne
*/