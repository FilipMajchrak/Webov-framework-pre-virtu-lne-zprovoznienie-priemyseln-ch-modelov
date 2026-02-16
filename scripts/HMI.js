document.querySelectorAll('.toolbox button').forEach(btn =>
{
    btn.addEventListener('click', () =>
    {
        const type = btn.dataset.type;

        if (type === 'button')
        {
            const newBtn = document.createElement('button');
            newBtn.textContent = 'Nové tlačidlo';
            newBtn.className = 'btn btn-primary hmi-element';
            newBtn.style.position = 'absolute';
            newBtn.style.top = '50px';
            newBtn.style.left = '50px';

            makeDraggable(newBtn);
            addResizer(newBtn);

            newBtn.addEventListener('click', function(event)
            {
                event.stopPropagation();

                // === DOPLNENÉ: Ak má priradenú BOOL premennú, prepni ju ===
                const varName = newBtn.dataset.bool;
                if (varName && typeof window.globalInput?.[varName] === 'boolean')
                {
                    window.globalInput[varName] = !window.globalInput[varName];
                }

                selectElement(newBtn);
            });

            document.getElementById('hmi-canvas').appendChild(newBtn);
        }
    });
});

function makeDraggable(element)
{
    element.onmousedown = function(event)
    {
        if (event.target.classList.contains('resizer')) return;

        event.preventDefault();

        let shiftX = event.clientX - element.getBoundingClientRect().left;
        let shiftY = event.clientY - element.getBoundingClientRect().top;

        const parent = element.parentElement;
        const parentRect = parent.getBoundingClientRect();

        function moveAt(pageX, pageY)
        {
            let newLeft = pageX - shiftX - parentRect.left;
            let newTop = pageY - shiftY - parentRect.top;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft + element.offsetWidth > parent.clientWidth)
            {
                newLeft = parent.clientWidth - element.offsetWidth;
            }
            if (newTop + element.offsetHeight > parent.clientHeight)
            {
                newTop = parent.clientHeight - element.offsetHeight;
            }

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        }

        function onMouseMove(event)
        {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);

        element.onmouseup = function()
        {
            document.removeEventListener('mousemove', onMouseMove);
            element.onmouseup = null;
        };
    };

    element.ondragstart = function()
    {
        return false;
    };
}

function addResizer(element)
{
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    element.appendChild(resizer);

    resizer.addEventListener('mousedown', function(event)
    {
        event.stopPropagation();
        event.preventDefault();

        const parent = element.parentElement;
        const parentRect = parent.getBoundingClientRect();

        let startX = event.clientX;
        let startY = event.clientY;
        let startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
        let startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

        function doDrag(event)
        {
            let newWidth = startWidth + (event.clientX - startX);
            let newHeight = startHeight + (event.clientY - startY);

            if (newWidth < 30) newWidth = 30;
            if (newHeight < 20) newHeight = 20;

            if (element.offsetLeft + newWidth > parent.clientWidth)
            {
                newWidth = parent.clientWidth - element.offsetLeft;
            }
            if (element.offsetTop + newHeight > parent.clientHeight)
            {
                newHeight = parent.clientHeight - element.offsetTop;
            }

            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
        }

        function stopDrag()
        {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        }

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });
}

let selectedElement = null;

function selectElement(lelement)
{
    if (selectedElement)
    {
        selectedElement.classList.remove('selected');
    }

    selectedElement = lelement;
    selectedElement.classList.add('selected');

    document.getElementById('properties-panel').style.display = 'block';
    document.getElementById('prop-text').value = lelement.innerText;

    // === DOPLNENÉ: Priprav BOOL select ===
    const boolSelect = document.getElementById('prop-bool');
    boolSelect.innerHTML = '';

    Object.entries(window.globalInput || {}).forEach(([name, value]) =>
    {
        if (typeof value === 'boolean')
        {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            boolSelect.appendChild(option);
        }
    });

    if (selectedElement.dataset.bool)
    {
        boolSelect.value = selectedElement.dataset.bool;
    }

    boolSelect.onchange = () =>
    {
        selectedElement.dataset.bool = boolSelect.value;
    };
}

document.getElementById('prop-text').addEventListener('input', function(event)
{
    if (selectedElement)
    {
        selectedElement.innerText = event.target.value;
    }
});

document.getElementById('hmi-canvas').addEventListener('click', () =>
{
    if (selectedElement)
    {
        selectedElement.classList.remove('selected');
        selectedElement = null;
    }

    document.getElementById('properties-panel').style.display = 'none';
});