function createDistanceSensor({
  origin = new THREE.Vector3(0, 0, 0),         // Počiatočná pozícia lúča
  direction = new THREE.Vector3(0, 0, -1),     // Smer (ak nie je zadaná rotácia)
  rotation = null,                             // Voliteľná rotácia (Euler), ktorá prepíše direction
  length = 10,                                 // Max vzdialenosť lúča
  scene = null,                                // Scéna (pre vizualizáciu)
  targetObjects = [],                          // Objekty, ktoré senzor "vidí"
  showRay = false                              // Zobraziť lúč a značku vizuálne
})
{
  const sensor = {
    origin,
    direction: direction.clone().normalize(),
    length,
    rotation: rotation ? rotation.clone() : null,
    targetObjects,
    scene,
    raycaster: new THREE.Raycaster(),
    helper: null,
    marker: null,
    enabled: true,
    lastDistance: null, // posledná zaznamenaná vzdialenosť (null = žiadny zásah)

    update()
    {
      if (!this.enabled) return;

      // Aktualizuj smer podľa rotácie ak je zadaná
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
        this.lastDistance = hits[0].distance;
      }
      else
      {
        this.lastDistance = null;
      }

      // Aktualizácia vizualizácie
      if (this.helper)
      {
        this.helper.update(this.origin, this.direction, this.length);
      }

      if (this.marker)
      {
        this.marker.position.copy(this.origin);
      }
    },

    // Získaj aktuálnu vzdialenosť alebo null
    getDistance()
    {
      return this.lastDistance;
    },

    // Prepni viditeľnosť pomocnej grafiky
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

    // Zmeň rotáciu dynamicky
    setRotation(euler)
    {
      this.rotation = euler.clone();
    },

    setTargets(targets)
    {
      this.targetObjects = targets;
    }
  };

  // Vizuálna reprezentácia (ak je povolená)
  if (showRay && scene && typeof window.showRay === "function")
  {
    sensor.helper = window.showRay(origin, sensor.direction, length, scene);

    const marker = createStaticCube({
      scene: scene,
      position: [origin.x, origin.y, origin.z],
      rotation: [0, 0, 0],
      size: [0.5, 0.5, 0.5],
      color: 0x8888ff
    }, 'DistanceSensorMarker');

    sensor.marker = marker.mesh;
  }

  return sensor;
}