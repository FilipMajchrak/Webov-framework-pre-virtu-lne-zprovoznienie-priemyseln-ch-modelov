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

SceneManager.prototype.loadScene = function(newScene)
{
  // Ak už nejaká scéna existuje → najprv ju zlikviduj (uvolni zdroje, objekty atď.)
  if (this.currentScene)
  {
    this.currentScene.dispose();
  }

  // Nastav novú scénu ako aktívnu
  this.currentScene = newScene;

  // Zavolaj jej inicializačnú metódu
  this.currentScene.init();
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