import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Game from './Game';
import Canvas from './canvas/Canvas';

function App() {
    return (
        <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path="/games" element={<Game />} />
                    <Route path="/canvas" element={<Canvas />} />
                    <Route path="*" element={<Navigate to="/canvas" />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
