//=========================================
//Premenne pre PLC
let slot = 0;
let actionStarted = false;
let blockConv1 = false;
let waitingForMeasurement = false;
let lastConv1End = false;

function PLC_Update()
{
    //======================================
    //========== kontrola Sceny1 ===========
    //======================================
    const currentScene = window.sceneManager?.currentScene;

    if (!(currentScene instanceof Scene1 && currentScene.ready && window.IO))
    {
        return;
    }

    const IO = window.IO;

    //======================================
    //=============== PLC ==================
    //======================================

    if (IO.inputs.start)
    {
        // === 1. DETEKCIA PRÍCHODU NA CONV2 ===
        if (IO.outputs.conv1end && !lastConv1End && slot === 0)
        {
            waitingForMeasurement = true;
        }

        lastConv1End = IO.outputs.conv1end;

        // === 2. MERANIE pri príchode na CONV2 ===
        if (waitingForMeasurement && IO.outputs.dist1 < 5.7)
        {
            const diameter = 5.74 - IO.outputs.dist1;

            if (diameter < 1.0)
            {
                slot = 1;
            }
            else if (diameter < 1.45)
            {
                slot = 2;
            }
            else
            {
                slot = 3;
            }

            waitingForMeasurement = false;
            blockConv1 = true; // zastavíme CONV1 až po úspešnom meraní
        }

        // === 3. TRIEDENIE PODĽA SLOTU ===
        switch (slot)
        {
            case 0:
            {
                IO.inputs.conv2 = true;
                actionStarted = false;
                break;
            }

            case 1:
            {
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
                        slot = 0;
                        actionStarted = false;
                        blockConv1 = false;
                    }
                }
                break;
            }

            case 2:
            {
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
                        slot = 0;
                        actionStarted = false;
                        blockConv1 = false;
                    }
                }
                break;
            }

            case 3:
            {
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
                        slot = 0;
                        actionStarted = false;
                        blockConv1 = false;
                    }
                }
                break;
            }
        }

        // === 4. OVLÁDANIE CONV1 ===
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

        slot = 0;
        actionStarted = false;
        blockConv1 = false;
        waitingForMeasurement = false;
        lastConv1End = false;
    }
}