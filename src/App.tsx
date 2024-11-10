import { useEffect, useRef, useState } from 'react';
import './App.css';
import { initScene, initTaskSystemList } from './engine/Scene';
import { Stage } from './engine/Stage';
import { TaskFlow } from './engine/flow/TaskFlow';
import { initMainThemeScene } from './games/scene/mainTheme/scene';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const [, setTaskFlow] = useState<TaskFlow|undefined>()
    useEffect(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        if (!canvas ||!mask) return;
        const world = new Stage();
        const taskFlow = initMainThemeScene({ world, canvas, mask });
        setTaskFlow(taskFlow);
        console.log('run taskFlow');
        taskFlow.run();
    }, []);
    return (
        <div className="App">
            <canvas ref={canvasRef} id='main' width={800} height={450}/>
            <div ref={maskRef} id='mask'></div>
        </div>
    );
}

export default App;
