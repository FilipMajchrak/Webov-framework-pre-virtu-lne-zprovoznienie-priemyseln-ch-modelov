import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

export function createCamera()
{
  const camera = new THREE.PerspectiveCamera(
    75,     // FOV - zorný uhol kamery (Field of View) v stupňoch
    window.innerWidth / window.innerHeight, // Pomer strán (aspect ratio)
    0.1,    // Near Clipping Plane - najbližšia vzdialenosť, čo sa bude renderovať
    1000    // Near Clipping Plane - najbližšia vzdialenosť, čo sa bude renderovať
  );

  camera.position.set(0, 20, 30);

  return camera;
}

export function setupPointerLockControls(camera, renderer)
{
    const controls = new PointerLockControls(camera, renderer.domElement);

    renderer.domElement.addEventListener('click', () =>
    {
        controls.lock();
    });

    const keysPressed = {};

    window.addEventListener('keydown', (event) =>
    {
        keysPressed[event.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (event) =>
    {
        keysPressed[event.key.toLowerCase()] = false;
    });

    return function updateCameraPosition()
    {
        const moveSpeed = 0.1;

        // Vektor smeru pohľadu
        const direction = new THREE.Vector3();

        camera.getWorldDirection(direction);

        // Pohyb dopredu/dozadu vrátane osy Y
        if (keysPressed['w'])
        {
        camera.position.add(direction.clone().multiplyScalar(moveSpeed));
        }
        if (keysPressed['s'])
        {
        camera.position.add(direction.clone().multiplyScalar(-moveSpeed));
        }

        // Vektor vpravo
        const right = new THREE.Vector3();
        right.crossVectors(camera.up, direction).normalize();

        if (keysPressed['d'])
        {
        camera.position.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (keysPressed['a'])
        {
        camera.position.add(right.clone().multiplyScalar(moveSpeed));
        }
    };
}