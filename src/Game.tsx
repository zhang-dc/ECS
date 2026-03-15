/**
 * 游戏入口组件
 * 用于启动山海情模拟经营游戏
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage } from './engine/Stage';
import { TaskFlow } from './engine/flow/TaskFlow';
import { initGamePlayScene } from './games/scene/gamePlay/scene';
import { GameHUD } from './games/ui/GameHUD';
import './Game.css';

export const Game: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<Stage | null>(null);
    const taskFlowRef = useRef<TaskFlow | null>(null);
    const [gameStarted, setGameStarted] = useState(false);

    const startGame = useCallback(() => {
        if (!canvasRef.current || !maskRef.current || worldRef.current) return;

        // 创建Stage
        const world = new Stage();
        worldRef.current = world;

        // 初始化游戏场景（内部会调用 taskFlow.run()）
        const taskFlow = initGamePlayScene({
            world,
            canvas: canvasRef.current,
            mask: maskRef.current,
            difficulty: 'normal',
        });
        taskFlowRef.current = taskFlow;

        setGameStarted(true);
        console.log('[Game] 游戏已启动');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && taskFlowRef.current) {
                const tf = taskFlowRef.current;
                if (tf.isRunning) {
                    tf.stop();
                    console.log('[Game] 游戏已暂停');
                } else {
                    tf.run();
                    console.log('[Game] 游戏已恢复');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            // 组件卸载时停止游戏循环
            taskFlowRef.current?.stop();
        };
    }, []);

    return (
        <div className="game-container">
            {/* 游戏画布 */}
            <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="game-canvas"
            />

            {/* 交互遮罩 */}
            <div ref={maskRef} className="game-mask" />

            {/* 游戏UI */}
            {gameStarted && worldRef.current && (
                <GameHUD world={worldRef.current} />
            )}

            {/* 开始菜单 */}
            {!gameStarted && (
                <div className="game-start-menu">
                    <h1>山海情</h1>
                    <h2>模拟经营游戏</h2>
                    <p className="game-description">
                        体验中国农村脱贫工作的艰辛与成就
                    </p>
                    <button className="start-button" onClick={startGame}>
                        开始游戏
                    </button>
                    <div className="game-version">v1.0.0</div>
                </div>
            )}
        </div>
    );
};

export default Game;
