function renderIOTable()
{
  const tbody = document.querySelector('#io-table tbody');
  if (!tbody || !window.IO) return;

  tbody.innerHTML = '';

  const renderRow = (name, type, value, editable) =>
  {
    const row = document.createElement('tr');
    const isBoolean = typeof value === 'boolean';

    row.innerHTML = `
      <td class="align-middle text-truncate" title="${name}" style="max-width: 120px;">${name}</td>
      <td class="align-middle text-center">${type}</td>
      <td class="align-middle text-center">
        ${
          isBoolean
            ? `<button class="btn btn-sm ${value ? 'btn-success' : 'btn-danger'}"
                      data-name="${name}" 
                      data-type="${type}" 
                      ${editable ? '' : 'disabled'}>
                ${value ? '1' : '0'}
              </button>`
            : `<input 
                type="number"
                id="io-${type.toLowerCase()}-${name}"
                name="${name}"
                class="form-control form-control-sm text-center"
                style="width: 100%; height: 100%; box-sizing: border-box; text-align: center; vertical-align: middle; padding: 0.25rem; font-size: 0.875rem;"
                value="${value}" 
                data-name="${name}" 
                data-type="${type}" 
                ${editable ? '' : 'readonly'}>
              `
        }
      </td>
    `;

    // Boolean vstup – kliknutie prepína true/false
    if (editable && isBoolean)
    {
      const btn = row.querySelector('button');
      btn.addEventListener('click', () =>
      {
        IO.inputs[name] = !IO.inputs[name];
        renderIOTable();
      });
    }

    // Číselný vstup – umožni ručne prepísať hodnotu
    if (editable && !isBoolean)
    {
      const input = row.querySelector('input');
      input.addEventListener('change', (e) =>
      {
        const newVal = parseFloat(e.target.value);
        if (!isNaN(newVal))
        {
          IO.inputs[name] = newVal;
          renderIOTable();
        }
      });
    }

    tbody.appendChild(row);
  };

  // Vstupy – editable
  for (const [name, val] of Object.entries(IO.inputs || {}))
  {
    renderRow(name, 'IN', val, true);
  }

  // Výstupy – readonly
  for (const [name, val] of Object.entries(IO.outputs || {}))
  {
    renderRow(name, 'OUT', val, false);
  }
}

// pravidelná aktualizácia I/O zobrazenia
setInterval(renderIOTable, 300);