// Pole pre uloženie všetkých vytvorených piestov
const Pistons = [];

// Hlavná funkcia na vytvorenie piestu
function createPiston(
  scene, // THREE.js scéna, do ktorej sa piest pridá
  {
    name = "piston",              // názov piestu (voliteľný)
    position = [0, 5, 0],         // začiatočná pozícia [x, y, z]
    size = [1, 1, 1],             // rozmery piestu [šírka, výška, hĺbka]
    color = 0x00ff00,             // farba piestu (zelená ako predvolené)
    moveDistance = 2,            // vzdialenosť, o ktorú sa piest vysunie
    speed = 2,                   // rýchlosť pohybu piestu
    direction = [0, 0, 1],       // smer pohybu (predvolene pozdĺž osi Z)
    getInputFn = () => false,    // funkcia na čítanie vstupu (napr. IO.inputs.p1)
    setOutputFn = (v) => {},     // funkcia na nastavenie výstupu (napr. IO.outputs.pistonExtended)
    setRetractedFn = (v) => {},  // funkcia na nastavenie výstupu (napr. IO.outputs.pistonRetracted)
    affectedObjects = []         // zoznam objektov, ktoré môže piest zhodiť pri kontakte
  }
)
{
  // Vytvorenie geometrie a materiálu pre piest
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial({ color });

  // Vytvorenie samotného mesh objektu
  const piston = new THREE.Mesh(geometry, material);
  piston.position.set(...position);         // Nastavenie pozície
  piston.rotation.set(0, 0, 0);             // Žiadna rotácia
  piston.name = name;                       // Priradenie názvu

  // Pridanie piestu do scény
  scene.add(piston);

  // Zobrazenie okrajového rámu pre debugovanie (voliteľné)
  showHitbox(piston, scene);

  // Výpočet začiatočnej a koncovej pozície piestu
  const start = new THREE.Vector3(...position);
  const dir = new THREE.Vector3(...direction).normalize(); // normalizovaný smer pohybu
  const end = start.clone().addScaledVector(dir, moveDistance); // cieľová pozícia

  // Aktuálna pozícia piestu (kopíruje začiatok)
  let current = start.clone();

  // Stav piestu – "extending", "retracting", alebo "idle"
  let state = "idle";

  // Hlavná aktualizačná funkcia, volaná každý frame
  function update(delta)
  {
    const extend = getInputFn();                   // získať aktuálny stav vstupu
    const target = extend ? end : start;           // cieľ je end alebo start podľa vstupu

    const distance = current.distanceTo(target);   // vzdialenosť do cieľa
    const reached = distance < 0.01;               // považuj za "dokončené", ak je veľmi blízko

    if (reached)
    {
      state = "idle";               // ak je v cieli, nehybne čaká
      setOutputFn(extend);          // výstup hovorí, či je práve vysunutý
      return;
    }

    // Nastavenie stavu podľa smeru
    state = extend ? "extending" : "retracting";

    // Vypočítaj posun (maximálne o 'speed * delta', ale nie viac ako zostávajúca vzdialenosť)
    const step = Math.min(speed * delta, distance);
    const directionVec = target.clone().sub(current).normalize(); // smer k cieľu
    current.addScaledVector(directionVec, step);                  // posuň sa bližšie

    piston.position.copy(current);                                // aplikuj novú pozíciu

    // Nastav výstup len ak si takmer v koncovej pozícii (vysunutý)
    setOutputFn(extend && current.distanceTo(end) < 0.01);
    setRetractedFn(!extend && current.distanceTo(start) < 0.01);

    //Kolízna detekcia pri vysúvaní
    if (extend)
    {
      const pistonBox = new THREE.Box3().setFromObject(piston);

      for (const obj of affectedObjects)
      {
        // kontroluj iba fyzikálne objekty (Physijs)
        if (!obj || typeof obj.setLinearVelocity !== "function") continue;

        const objBox = new THREE.Box3().setFromObject(obj);

        if (pistonBox.intersectsBox(objBox))
        {
          // aplikuj odtlačnú silu smerom od piestu
          const force = dir.clone().multiplyScalar(5);
          obj.setLinearVelocity(force);
        }
      }
    }
  }

  // Objekt reprezentujúci piest (vrátený volajúcemu)
  const pistonObj = {name,mesh: piston, update};

  // Uloženie do zoznamu všetkých piestov
  Pistons.push(pistonObj);

  // Vrátenie piestu na ďalšie použitie
  return pistonObj;
}