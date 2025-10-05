// Pole pre uloženie všetkých vytvorených piestov
const Pistons = [];

// Hlavná funkcia na vytvorenie piestu – fyzikálne telo s riadeným pohybom (bez __dirtyPosition)
function createPiston(
  scene, // THREE.js scéna, do ktorej sa piest pridá
  {
    name = "piston",              // názov piestu (voliteľný)
    position = [0, 5, 0],         // začiatočná pozícia [x, y, z]
    size = [1, 1, 1],             // rozmery piestu [šírka, výška, hĺbka]
    color = 0x00ff00,             // farba piestu
    moveDistance = 2,             // vzdialenosť, o ktorú sa piest vysunie
    speed = 1.5,                  // rýchlosť pohybu piestu
    direction = [0, 0, 1],        // smer pohybu (predvolene pozdĺž osi Z)
    getInputFn = () => false,     // funkcia na čítanie vstupu (napr. IO.inputs.p1)
    setOutputFn = (v) => {},      // funkcia na nastavenie výstupu (napr. IO.outputs.p1_ex)
    setRetractedFn = (v) => {},   // funkcia na nastavenie výstupu (napr. IO.outputs.p1_rec)
    affectedObjects = []          // zoznam objektov, ktoré môže piest zhodiť pri kontakte
  }
)
{
  // Vytvorenie geometrie a materiálu pre piest (fyzikálne telo)
  const geometry = new THREE.BoxGeometry(...size);
  const physMat  = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color }), 0.9, 0.0);
  const piston   = new Physijs.BoxMesh(geometry, physMat, 1); // mass = 1 → riadené dynamické telo

  // Nastavenie počiatočných vlastností
  piston.position.set(...position);
  piston.rotation.set(0, 0, 0);
  piston.name = name;

  // Pridanie piestu do scény
  scene.add(piston);

  // Zobrazenie hitboxu (debug)
  showHitbox(piston, scene);

  // Výpočet začiatočnej a koncovej pozície piestu
  const start = new THREE.Vector3(...position);
  const dir   = new THREE.Vector3(...direction).normalize();
  const end   = start.clone().addScaledVector(dir, moveDistance);

  // Uzamknutie fyzikálnych stupňov voľnosti (povolený len pohyb v smere vysúvania)
  const moveMask = new THREE.Vector3(
    Math.abs(dir.x) > 0.5 ? 1 : 0,
    Math.abs(dir.y) > 0.5 ? 1 : 0,
    Math.abs(dir.z) > 0.5 ? 1 : 0
  );

  piston.setLinearFactor(moveMask);                   // povolený posun len v osi vysúvania
  piston.setAngularFactor(new THREE.Vector3(0,0,0));  // bez rotácie

  // Prahová hodnota na určenie, že piest je v cieľovej pozícii
  const stopEps = 0.01;

  // Stav piestu – "extending", "retracting", "extended", "retracted"
  let state = "idle";

  // Pomocná funkcia na presné zastavenie v cieľovej pozícii
  function snapTo(target)
  {
    piston.position.copy(target);
    piston.setLinearVelocity(new THREE.Vector3(0, 0, 0));
  }

  // Hlavná aktualizačná funkcia, volaná každý frame
  function update(_delta)
  {
    const extend = getInputFn();                 // aktuálny vstup z PLC
    const target = extend ? end : start;         // cieľová pozícia podľa vstupu

    const toTarget = target.clone().sub(piston.position); // vektor k cieľu
    const along    = toTarget.dot(dir);                   // vzdialenosť po osi vysúvania

    // zistí, či piest prešiel za cieľ alebo sa dostal dostatočne blízko
    const pastTarget = (extend && along <= 0) || (!extend && along >= 0);

    // keď je piest v cieli alebo ho prešiel → zastav ho a nastav výstupy
    if (pastTarget || Math.abs(along) <= stopEps)
    {
      snapTo(target);
      piston.setLinearVelocity(new THREE.Vector3(0, 0, 0));

      // výstupy sa nastavujú len teraz, keď je úplne zastavený
      if (extend)
      {
        state = "extended";
        setOutputFn(true);       // piest úplne vysunutý
        setRetractedFn(false);
      }
      else
      {
        state = "retracted";
        setOutputFn(false);
        setRetractedFn(true);    // piest úplne zasunutý
      }

      return;
    }

    // ak sa zmenil smer, povoľ nový pohyb
    if (extend && state !== "extending")
    {
      state = "extending";
    }

    if (!extend && state !== "retracting")
    {
      state = "retracting";
    }

    // počas pohybu sa výstupy deaktivujú (aby neboli aktívne predčasne)
    setOutputFn(false);
    setRetractedFn(false);

    // riadený pohyb podľa stavu
    if (state === "extending")
    {
      piston.setLinearVelocity(dir.clone().multiplyScalar(speed));
    }
    else if (state === "retracting")
    {
      piston.setLinearVelocity(dir.clone().multiplyScalar(-speed));
    }
  }

  // Vytvorenie objektu reprezentujúceho piest (pre scény a aktualizáciu)
  const pistonObj = 
  {
    name,
    mesh: piston,
    update
  };

  // Uloženie piestu do zoznamu všetkých piestov
  Pistons.push(pistonObj);

  // Vrátenie piestu pre ďalšie použitie
  return pistonObj;
}
