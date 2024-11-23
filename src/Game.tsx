import { useLayoutEffect, useRef, useState } from 'react';
import './Game.css';
import { Stage } from './engine/Stage';
import { TaskFlow } from './engine/flow/TaskFlow';
import { initMainThemeScene } from './games/scene/mainTheme/scene';

function Game() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const [, setTaskFlow] = useState<TaskFlow|undefined>()
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        if (!canvas ||!mask) return;
        const container = canvas.parentElement;
        const size = container?.getBoundingClientRect();
        if (!size) return;
        console.log('init canvas', size)
        canvas.width = Math.floor(size.width);
        canvas.height = Math.floor(size.height);
        const world = new Stage();
        const taskFlow = initMainThemeScene({ world, canvas, mask });
        setTaskFlow(taskFlow);
        console.log('run taskFlow');
        taskFlow.run();
    }, []);
    return (
        <>
            <canvas ref={canvasRef} id='main'/>
            <div ref={maskRef} id='mask'></div>
        </>
    );
}

export default Game;
