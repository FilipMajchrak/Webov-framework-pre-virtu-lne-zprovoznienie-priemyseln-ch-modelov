// Funkcia na vytvorenie senzorového lúča (ray) pre detekciu objektov
function createRaySensor({
  origin = new THREE.Vector3(0, 0, 0),         // Počiatočný bod lúča
  direction = new THREE.Vector3(0, 0, -1),     // Východiskový smer (ak sa nepoužije rotácia)
  rotation = null,                             // Voliteľná rotácia, z ktorej sa vypočíta smer
  length = 10,                                 // Dĺžka lúča
  scene = null,                                // Scéna, kde sa ray a marker vykreslí
  targetObjects = [],                          // Zoznam objektov, ktoré ray deteguje
  onDetect = () => {},                         // Callback keď ray niečo trafí
  onClear = () => {},                          // Callback keď ray nič netrafí
  showRay = false                              // Ak true, ray a marker sa zobrazia vizuálne
})
{
  // Objekt senzor s metódami
  const sensor = {
    origin,                                    // Aktuálna pozícia začiatku lúča
    direction: direction.clone().normalize(), // Aktuálny smer lúča (aktualizuje sa podľa rotácie)
    length,
    targetObjects,
    enabled: true,
    scene,
    raycaster: new THREE.Raycaster(),         // THREE.js nástroj na raycasting
    helper: null,                              // Vizuálna reprezentácia lúča (line)
    marker: null,                              // Vizuálna kocka na začiatku lúča
    rotation: rotation ? rotation.clone() : null, // Uložená rotácia (ak je definovaná)

    // Hlavná metóda, ktorá sa volá každé frame
    update()
    {
      if (!this.enabled) return;

      // Ak je zadaná rotácia, prepočítaj smer lúča podľa nej
      if (this.rotation instanceof THREE.Euler)
      {
        const quat = new THREE.Quaternion().setFromEuler(this.rotation);
        this.direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
      }

      // Nastavenie raycastera podľa pozície a smeru
      this.raycaster.set(this.origin, this.direction);
      this.raycaster.far = this.length;

      // Detekcia prieniku lúča s cieľovými objektmi
      const hits = this.raycaster.intersectObjects(this.targetObjects, true);

      // Spustenie callbacku podľa výsledku
      if (hits.length > 0)
      {
        onDetect(hits[0]);
      }
      else
      {
        onClear();
      }

      // Ak existuje vizuálny lúč, aktualizuj jeho geometriu
      if (this.helper)
      {
        this.helper.update(this.origin, this.direction, this.length);
      }

      // Ak existuje vizuálny marker, posuň ho na aktuálny origin
      if (this.marker)
      {
        this.marker.position.copy(this.origin);
      }
    },

    // Zapnutie alebo vypnutie viditeľnosti lúča a značky
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

    // Dynamická zmena rotácie (napr. z iného modulu)
    setRotation(euler)
    {
      this.rotation = euler.clone();
    }
  };

  // Vytvorenie vizuálnej časti lúča a značky ak je zapnuté showRay
  if (showRay && scene && typeof window.showRay === "function")
  {
    // Vytvorí čiaru (line) reprezentujúcu lúč pomocou funkcie z debugtool.js
    sensor.helper = window.showRay(origin, sensor.direction, length, scene);

    // Vytvorí malú statickú kocku na začiatku lúča pomocou createStaticCube
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