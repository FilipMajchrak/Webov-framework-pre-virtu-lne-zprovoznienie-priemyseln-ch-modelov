function renderIOTable()
{
  const tbody = document.querySelector('#io-table tbody');
  if (!tbody || !window.IO) return;

  tbody.innerHTML = '';

  const renderRow = (name, type, value, editable) =>
  {
    const row = document.createElement('tr');
    const boolClass = value ? 'btn-success' : 'btn-danger';
    const label = value ? '1' : '0';

    row.innerHTML = `
      <td class="align-middle text-truncate" title="${name}" style="max-width: 120px;">${name}</td>
      <td class="align-middle text-center">${type}</td>
      <td class="align-middle text-center">
        <button 
          class="btn btn-sm ${boolClass}" 
          data-name="${name}" 
          data-type="${type}" 
          ${editable ? '' : 'disabled'}>
          ${label}
        </button>
      </td>
    `;

    if (editable)
    {
      const btn = row.querySelector('button');
      btn.addEventListener('click', () =>
      {
        const newVal = !IO.inputs[name];
        IO.inputs[name] = newVal;
        renderIOTable();
      });
    }

    tbody.appendChild(row);
  };

  for (const [name, val] of Object.entries(IO.inputs || {}))
  {
    renderRow(name, 'IN', val, true);
  }

  for (const [name, val] of Object.entries(IO.outputs || {}))
  {
    renderRow(name, 'OUT', val, false);
  }
}

// pravidelná aktualizácia I/O zobrazenia
setInterval(renderIOTable, 300);