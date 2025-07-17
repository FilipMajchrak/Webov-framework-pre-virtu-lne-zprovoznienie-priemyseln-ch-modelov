window.onload = () =>
{
    window.globalInput = {};
    let initialGlobals = {};
    let loopId = null;

    function renderGlobals(variables)
    {
        const tableBody = document.querySelector("#globals-table tbody");
        tableBody.innerHTML = "";

        for (const [name, value] of Object.entries(variables))
        {
            const row = document.createElement("tr");
            row.dataset.name = name;

            if (typeof value === "boolean")
            {
                row.innerHTML = `
                    <td class="align-middle">${name}</td>
                    <td>
                        <button 
                            type="button" 
                            class="btn btn-sm w-100"
                            id="global-${name}"
                            name="${name}"
                            data-name="${name}">
                        </button>
                    </td>`;

                const btn = row.querySelector("button");
                updateBoolButton(btn, value);

                btn.addEventListener("click", () =>
                {
                    window.globalInput[name] = !window.globalInput[name];
                    updateBoolButton(btn, window.globalInput[name]);
                });
            }
            else
            {
                row.innerHTML = `
                    <td class="align-middle">
                        <label for="global-${name}" class="form-label mb-0">${name}</label>
                    </td>
                    <td>
                        <input 
                            type="text" 
                            class="form-control form-control-sm"
                            data-name="${name}"
                            id="global-${name}"
                            name="${name}">
                    </td>`;

                const input = row.querySelector("input");
                input.value = value;

                input.addEventListener("input", e =>
                {
                    window.globalInput[name] = isNaN(e.target.value) ? e.target.value : parseFloat(e.target.value);
                });
            }

            tableBody.appendChild(row);
        }
    }

    function updateBoolButton(btn, val)
    {
        if (val)
        {
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-success");
            btn.textContent = "TRUE";
        }
        else
        {
            btn.classList.remove("btn-success");
            btn.classList.add("btn-danger");
            btn.textContent = "FALSE";
        }
    }

    document.getElementById("run").addEventListener("click", () =>
    {
        if (loopId) return;

        window.editor.setOption("readOnly", true);

        // Ulož snapshot pôvodného stavu
        initialGlobals = JSON.parse(JSON.stringify(window.globalInput));

        loopId = setInterval(() =>
        {
            try
            {
                const code = window.editor.getValue();
                const result = runST(code, window.globalInput);

                window.globalInput = result.globalVariables;

                renderGlobals(window.globalInput);

                const outputDiv = document.getElementById("output");
                outputDiv.innerHTML = "<pre>" + JSON.stringify({
                    locals: result.variables,
                    globals: result.globalVariables
                }, null, 2) + "</pre>";
            }
            catch (e)
            {
                console.error("Chyba počas simulácie:", e);
            }
        }, 500);

        const runBtn = document.getElementById("run");
        runBtn.classList.remove("btn-primary");
        runBtn.classList.add("btn-success");
    });

    document.getElementById("stop").addEventListener("click", () =>
    {
        clearInterval(loopId);
        loopId = null;

        window.editor.setOption("readOnly", false);

        // Obnov pôvodný stav
        window.globalInput = JSON.parse(JSON.stringify(initialGlobals));

        renderGlobals(window.globalInput);

        const outputDiv = document.getElementById("output");
        outputDiv.innerHTML = "<pre>" + JSON.stringify({
            locals: {},
            globals: window.globalInput
        }, null, 2) + "</pre>";

        const runBtn = document.getElementById("run");
        runBtn.classList.remove("btn-success");
        runBtn.classList.add("btn-primary");
    });
};