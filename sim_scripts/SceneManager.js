// ============================
// SceneManager
// ============================
// Správca scén: stará sa o prepínanie, inicializáciu a renderovanie scén
function SceneManager(renderer, camera)
{
  this.renderer = renderer;   // THREE.WebGLRenderer – renderer pre vykresľovanie
  this.camera = camera;       // THREE.Camera – aktuálna kamera pre všetky scény
  this.currentScene = null;   // Aktívna (nahratá) scéna – inštancia napr. Scene1
}

SceneManager.prototype.loadScene = async function (newScene)
{
  // zruš starú scénu bezpečne
  if (this.currentScene && typeof this.currentScene.dispose === "function")
  {
    this.currentScene.dispose();
  }

  this.currentScene = newScene;

  // init môže byť sync alebo async → await zvládne oboje
  if (this.currentScene && typeof this.currentScene.init === "function")
  {
    await this.currentScene.init();
  }
};


SceneManager.prototype.update = function (delta)
{
  if (this.currentScene)
  {
    // Aktualizuj logiku aktuálnej scény (fyzika, interakcie, pohyby...)
    this.currentScene.update(delta);

    // Vykresli scénu pomocou renderera a kamery
    this.renderer.render(this.currentScene.scene, this.camera);
  }
};