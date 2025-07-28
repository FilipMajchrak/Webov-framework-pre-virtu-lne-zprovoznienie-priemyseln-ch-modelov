function createRaySensor({
  origin = new THREE.Vector3(0, 0, 0),
  direction = new THREE.Vector3(0, 0, -1),
  rotation = null,
  length = 10,
  scene = null,
  targetObjects = [],
  onDetect = () => {},
  onClear = () => {},
  showRay = false
})
{
  const sensor = {
    origin,
    direction: direction.clone().normalize(),
    length,
    targetObjects,
    enabled: true,
    scene,
    raycaster: new THREE.Raycaster(),
    helper: null,
    marker: null,
    rotation: rotation ? rotation.clone() : null,

    update()
    {
      if (!this.enabled) return;

      // ak je definovaná rotácia, prepočíta smer lúča
      if (this.rotation instanceof THREE.Euler)
      {
        const quat = new THREE.Quaternion().setFromEuler(this.rotation);
        this.direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
      }

      this.raycaster.set(this.origin, this.direction);
      this.raycaster.far = this.length;

      const hits = this.raycaster.intersectObjects(this.targetObjects, true);

      if (hits.length > 0)
      {
        onDetect(hits[0]);
      }
      else
      {
        onClear();
      }

      if (this.helper)
      {
        this.helper.update(this.origin, this.direction, this.length);
      }

      if (this.marker)
      {
        this.marker.position.copy(this.origin);
      }
    },

    setRayVisible(state)
    {
      if (this.helper)
      {
        this.helper.setVisible(state);
      }

      if (this.marker)
      {
        this.marker.visible = state;
      }
    },

    setRotation(euler)
    {
      this.rotation = euler.clone();
    }
  };

  if (showRay && scene && typeof window.showRay === "function")
  {
    sensor.helper = window.showRay(origin, sensor.direction, length, scene);

    const marker = createStaticCube({
      scene: scene,
      position: [origin.x, origin.y, origin.z],
      rotation: [0, 0, 0],
      size: [0.5, 0.5, 0.5],
      color: 0x888888
    }, 'RaySensorStart');

    sensor.marker = marker.mesh;
  }

  return sensor;
}