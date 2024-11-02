import { useRef } from 'react';
import './App.css';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    return (
        <div className="App">
            <canvas ref={canvasRef} id='main'/>
        </div>
    );
}

export default App;
