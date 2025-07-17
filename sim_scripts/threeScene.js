import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { createCamera, setupPointerLockControls } from './camera.js';
import { SceneManager } from './SceneManager.js';
import { Scene1} from './Scenes/Scene1.js';

const clock = new THREE.Clock();

const camera = createCamera();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('three-container').appendChild(renderer.domElement);

const updateCameraPosition = setupPointerLockControls(camera, renderer);

const sceneManager = new SceneManager(renderer, camera);

// Načítaj Scene1
sceneManager.loadScene(new Scene1(camera));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate()
{
  requestAnimationFrame(animate);
  updateCameraPosition();

  const deltaTime = clock.getDelta();
  sceneManager.update(deltaTime);
}

animate();