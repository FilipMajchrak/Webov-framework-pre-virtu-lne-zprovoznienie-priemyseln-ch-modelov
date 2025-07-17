export class SceneManager 
{
  constructor(renderer, camera)
  {
    this.renderer = renderer;
    this.camera = camera;
    this.currentScene = null;
  }

  loadScene(newScene)
  {
    if (this.currentScene) {
      this.currentScene.dispose();
    }
    this.currentScene = newScene;
    this.currentScene.init();
  }

  update(delta)
  {
    if (this.currentScene) {
      this.currentScene.update(delta);
      this.renderer.render(this.currentScene.scene, this.camera);
    }
  }
}