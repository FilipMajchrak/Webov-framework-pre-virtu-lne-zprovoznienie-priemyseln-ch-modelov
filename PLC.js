let sortQueue = [];
let slot = 0;
let actionStarted = false;
let awaitingSort = false;
let blockConv1 = false;
let waitingForMeasurement = false;
let lastConv1End = false;

function PLC_Update()
{
    const currentScene = window.sceneManager?.currentScene;
    if (!(currentScene instanceof Scene1 && currentScene.ready && window.IO)) return;

    const IO = window.IO;

    if (IO.inputs.start)
    {
        // === 1. DETEKCIA PRÍCHODU NA CONV2 (začiatok merania) ===
        if (IO.outputs.conv1end && !lastConv1End && !awaitingSort && slot === 0)
        {
            waitingForMeasurement = true;
            //console.log("[DEBUG] Objekt prišiel na začiatok conv2 – čaká sa na meranie");
        }
        lastConv1End = IO.outputs.conv1end;

        // === 2. MERANIE na začiatku conv2 ===
        if (waitingForMeasurement && IO.outputs.dist1 < 5.7)
        {
            const diameter = 5.74 - IO.outputs.dist1;
            let s = 0;

            if (diameter < 1.0) s = 1;
            else if (diameter < 1.4) s = 2;
            else s = 3;

            sortQueue.push(s);
            awaitingSort = true;
            waitingForMeasurement = false;
            blockConv1 = true;

            //console.log(`Nameraný priemer: ${diameter.toFixed(2)} → slot ${s}`);
            //console.log("[DEBUG] sortQueue PUSH →", [...sortQueue]);
            //console.log("[INFO] CONV1 zablokovaný po meraní");
        }

        // === 3. TRIEDENIE ===
        if (slot === 0 && sortQueue.length > 0)
        {
            slot = sortQueue[0];
        }

        switch (slot)
        {
            case 0:
                IO.inputs.conv2 = true;
                actionStarted = false;
                break;

            case 1:
                if (IO.outputs.s1 || actionStarted)
                {
                    actionStarted = true;
                    IO.inputs.conv2 = false;

                    if (IO.outputs.p1_rec)
                    {
                        IO.inputs.p1 = true;
                    }
                    else if (IO.outputs.p1_ex)
                    {
                        IO.inputs.p1 = false;
                        actionStarted = false;
                        sortQueue.shift();
                        slot = 0;
                        awaitingSort = false;
                        blockConv1 = false;
                        //console.log("[INFO] Slot 1 hotový → CONV1 odblokovaný");
                        //console.log("[DEBUG] sortQueue SHIFT →", [...sortQueue]);
                    }
                }
                break;

            case 2:
                if (IO.outputs.s2 || actionStarted)
                {
                    actionStarted = true;
                    IO.inputs.conv2 = false;

                    if (IO.outputs.p2_rec)
                    {
                        IO.inputs.p2 = true;
                    }
                    else if (IO.outputs.p2_ex)
                    {
                        IO.inputs.p2 = false;
                        actionStarted = false;
                        sortQueue.shift();
                        slot = 0;
                        awaitingSort = false;
                        blockConv1 = false;
                        //console.log("[INFO] Slot 2 hotový → CONV1 odblokovaný");
                        //console.log("[DEBUG] sortQueue SHIFT →", [...sortQueue]);
                    }
                }
                break;

            case 3:
                if (IO.outputs.s3 || actionStarted)
                {
                    actionStarted = true;
                    IO.inputs.conv2 = false;

                    if (IO.outputs.p3_rec)
                    {
                        IO.inputs.p3 = true;
                    }
                    else if (IO.outputs.p3_ex)
                    {
                        IO.inputs.p3 = false;
                        actionStarted = false;
                        sortQueue.shift();
                        slot = 0;
                        awaitingSort = false;
                        blockConv1 = false;
                        //console.log("[INFO] Slot 3 hotový → CONV1 odblokovaný");
                        //console.log("[DEBUG] sortQueue SHIFT →", [...sortQueue]);
                    }
                }
                break;
        }

        // === 4. LOGIKA PRE CONV1 ===
        IO.inputs.conv = !blockConv1;

    }
    else
    {
        // === RESET ===
        IO.inputs.conv = false;
        IO.inputs.conv2 = false;
        IO.inputs.p1 = false;
        IO.inputs.p2 = false;
        IO.inputs.p3 = false;

        sortQueue = [];
        slot = 0;
        actionStarted = false;
        awaitingSort = false;
        blockConv1 = false;
        waitingForMeasurement = false;
        lastConv1End = false;

        //console.log("[RESET] PLC vypnutý – všetky premenné resetované");
    }
}