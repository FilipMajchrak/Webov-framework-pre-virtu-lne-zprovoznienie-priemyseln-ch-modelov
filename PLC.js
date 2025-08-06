let p1_actionStarted = false;

function PLC_Update() 
{
    const currentScene = window.sceneManager?.currentScene;

    if (!(currentScene instanceof Scene1 && currentScene.ready && window.IO))
    {
        return;
    }

    const IO = window.IO;

    if (IO.inputs.start)
    {
        // 1. Ak je objekt na s1 
  
        if (IO.outputs.s1 || p1_actionStarted)
        {   
            p1_actionStarted = true;
            IO.inputs.conv2 = false; // okamžité zastavenie pásu
            if(IO.outputs.p1_rec)
            {
                IO.inputs.p1 = true;
            }
            else if(IO.outputs.p1_ex)
            {
                IO.inputs.p1 = false;
                p1_actionStarted = false;
            }
        }
        else if(IO.outputs.p1_rec)
        {
            IO.inputs.conv2 = true;
            p1_actionStarted = false;
        }
        //console.log({s1: IO.outputs.s1,p1: IO.inputs.p1,p1_rec: IO.outputs.p1_rec,conv2: IO.inputs.conv2,p1_ex:IO.outputs.p1_ex,p1_actionStarted});
        IO.inputs.conv = !(IO.outputs.conv1end && !IO.inputs.conv2);
    }
    else
    {
        IO.inputs.conv = false;
        IO.inputs.conv2 = false;
        IO.inputs.p1 = false;

        p1_actionStarted = false;
    }

    // Debug log
    //console.log({s1: IO.outputs.s1,p1: IO.inputs.p1,p1_rec: IO.outputs.p1_rec,conv2: IO.inputs.conv2,p1_actionStarted});
}