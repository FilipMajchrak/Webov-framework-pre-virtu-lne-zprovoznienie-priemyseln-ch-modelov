// Predchádzajúce hodnoty vstupov a výstupov pre porovnanie – aby sme predišli zbytočnému renderovaniu
let previousInputs = {};
let previousOutputs = {};

// Funkcia na porovnanie dvoch objektov – pomocou JSON serializácie
function deepEqual(a, b)
{
  return JSON.stringify(a) === JSON.stringify(b);
}

// Pomocná funkcia na zmenu hodnoty vstupu + automatické prekreslenie tabuľky
function updateInput(name, value)
{
  // Ak IO nie je definované alebo meno neexistuje medzi vstupmi, nič nerob
  if (!window.IO || !(name in IO.inputs)) return;

  IO.inputs[name] = value;  // Zmeň hodnotu vstupu
  renderIOTable();          // Prekresli tabuľku
}

// Hlavná funkcia na vykreslenie tabuľky vstupov a výstupov
function renderIOTable()
{
  const tbody = document.querySelector('#io-table tbody'); // Nájde <tbody> v tabuľke
  if (!tbody || !window.IO) return;                        // Ak chýba, nič nerob

  // Ak sa vstupy a výstupy nezmenili od posledného volania, tabuľku nevykresľuj znova
  if (deepEqual(IO.inputs, previousInputs) && deepEqual(IO.outputs, previousOutputs)) return;

  // Ulož nové stavy ako predchádzajúce (hlboká kópia)
  previousInputs = structuredClone(IO.inputs);
  previousOutputs = structuredClone(IO.outputs);

  tbody.innerHTML = ''; // Vymaž obsah tabuľky

  // Funkcia na vykreslenie jedného riadka (vstupu alebo výstupu)
  const renderRow = (name, type, value, editable) =>
  {
    const row = document.createElement('tr');
    const isBoolean = typeof value === 'boolean'; // Určí, či ide o boolean hodnotu

    // HTML štruktúra riadka (podľa typu hodnoty)
    row.innerHTML = `
      <td class="align-middle text-truncate" title="${name}" style="max-width: 120px;">${name}</td>
      <td class="align-middle text-center">${type}</td>
      <td class="align-middle text-center">
        ${
          isBoolean
            // Boolean typ: zobraz tlačidlo
            ? `<button class="btn btn-sm ${value ? 'btn-success' : 'btn-danger'}"
                      data-name="${name}" 
                      data-type="${type}" 
                      ${editable ? '' : 'disabled'}>
                ${value ? '1' : '0'}
              </button>`
            // Číselný typ: zobraz input
            : `<input 
                type="number"
                id="io-${type.toLowerCase()}-${name}"
                name="${name}"
                class="form-control form-control-sm text-center"
                style="width: 100%; height: 100%; box-sizing: border-box; text-align: center; vertical-align: middle; padding: 0.25rem; font-size: 0.875rem;"
                value="${value}" 
                data-name="${name}" 
                data-type="${type}" 
                ${editable ? '' : 'readonly'}>`
        }
      </td>
    `;

    // Ak ide o boolean vstup a je editable, pridaj klikací handler na prepnutie hodnoty
    if (editable && isBoolean)
    {
      const btn = row.querySelector('button');
      btn.addEventListener('click', () =>
      {
        updateInput(name, !value); // Prepnúť hodnotu a prekresliť
      });
    }

    // Ak ide o číselný vstup, pridaj zmenu pri prepísaní hodnoty
    if (editable && !isBoolean)
    {
      const input = row.querySelector('input');
      input.addEventListener('change', (e) =>
      {
        const newVal = parseFloat(e.target.value);
        if (!isNaN(newVal))
        {
          updateInput(name, newVal); // Uložiť novú hodnotu a prekresliť
        }
      });
    }

    tbody.appendChild(row); // Pridať riadok do tabuľky
  };

  // Vykresli všetky vstupy (editable = true)
  for (const [name, val] of Object.entries(IO.inputs || {}))
  {
    renderRow(name, 'IN', val, true);
  }

  // Vykresli všetky výstupy (editable = false)
  for (const [name, val] of Object.entries(IO.outputs || {}))
  {
    renderRow(name, 'OUT', val, false);
  }
}

window.renderIOTable = renderIOTable;

window.resetIOPanel = function ()
{
  previousInputs = {};
  previousOutputs = {};
  renderIOTable();
};