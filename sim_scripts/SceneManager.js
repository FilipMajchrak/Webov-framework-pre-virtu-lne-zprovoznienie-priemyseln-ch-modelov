function SceneManager(renderer, camera)
{
  this.renderer = renderer;
  this.camera = camera;
  this.currentScene = null;
}

SceneManager.prototype.loadScene = function(newScene)
{
  if (this.currentScene)
  {
    this.currentScene.dispose();
  }
  this.currentScene = newScene;
  this.currentScene.init();
};

SceneManager.prototype.update = function (delta)
{
  if (this.currentScene)
  {
    this.currentScene.update(delta);
    this.renderer.render(this.currentScene.scene, this.camera);
  }
};