document.querySelectorAll('[data-resize]').forEach(resizer => {
  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    document.body.style.cursor = resizer.dataset.resize === 'x' ? 'col-resize' : 'row-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const direction = resizer.dataset.resize;
    const target = resizer.previousElementSibling;

    if (!target) return;

    if (direction === 'x') 
    {
      const container = target.parentElement;  // split-container
      const containerWidth = container.getBoundingClientRect().width;

      const containerLeft = container.getBoundingClientRect().left;
      let newWidth = e.clientX - containerLeft;

      // MIN šírka editora
      const minLeft = 200;

      // MIN šírka pravého panelu
      const minRight = 300;

      // Vypočítaj šírku pravého panelu
      const rightWidth = containerWidth - newWidth - resizer.getBoundingClientRect().width;

      if (newWidth < minLeft) newWidth = minLeft;

      // Ak by pravý panel bol menší ako minimum, nedovoľ to
      if (rightWidth < minRight) newWidth = containerWidth - minRight - resizer.getBoundingClientRect().width;

      target.style.width = `${newWidth}px`;
      target.style.flex = 'none';
    }

    if (direction === 'y') 
    {
      const containerTop = target.parentElement.getBoundingClientRect().top;
      let newHeight = e.clientY - target.getBoundingClientRect().top;

      const minHeight = 100;
      if (newHeight < minHeight) newHeight = minHeight;

      target.style.height = `${newHeight}px`;
      target.style.flex = 'none';
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
  });
});