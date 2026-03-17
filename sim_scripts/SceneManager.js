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
  if (!this.currentScene) return;

  if (typeof this.currentScene.update === "function")
  {
    this.currentScene.update(delta);
  }
  else
  {
    console.warn("[SceneManager] currentScene nemá update():", this.currentScene);
  }

  if (this.currentScene.scene)
  {
    this.renderer.render(this.currentScene.scene, this.camera);
  }
};

//zatial sa musia pridavat sceny manualne treba automatizovat
SceneManager.prototype.createSceneByName = function(sceneName)
{
  switch (sceneName)
  {
    case "scene2":
      return new Scene2(this.camera);

    case "scene1":
    default:
      return new Scene1(this.camera);
  }
};

SceneManager.prototype.switchScene = async function(sceneName)
{
  if (!this.camera) return;

  try
  {
    const newScene = this.createSceneByName(sceneName);

    window.activeSceneName = sceneName;
    window.isSceneSwitching = true;

    // okamžite nastav nové IO podľa novej scény
    if (typeof newScene.getDefaultIO === "function")
    {
      window.IO = newScene.getDefaultIO();
    }
    else if (typeof newScene.resetIO === "function")
    {
      newScene.resetIO();
    }
    else
    {
      window.IO = { inputs: {}, outputs: {} };
    }

    if (typeof window.resetIOPanel === "function")
    {
      window.resetIOPanel();
    }

    await this.loadScene(newScene);

    if (typeof sendSceneToServer === "function")
    {
      sendSceneToServer();
    }

    if (typeof sendSceneMapToGraphWindow === "function")
    {
      sendSceneMapToGraphWindow();
    }

    if (window.graphWindow && !window.graphWindow.closed)
    {
      window.graphWindow.postMessage({
        type: "DataIOScene",
        IO: window.IO,
        time: new Date().toLocaleTimeString()
      }, "*");
    }

    console.log("[SceneManager] IO po prepnutí:", window.IO);
    console.log("[SceneManager] Prepnuté na:", sceneName);

    // odblokuj sync až po krátkej chvíli
    setTimeout(() =>
    {
      window.isSceneSwitching = false;
    }, 300);
  }
  catch (e)
  {
    window.isSceneSwitching = false;
    console.error("[SceneManager] Chyba pri prepínaní scény:", e);
  }
};