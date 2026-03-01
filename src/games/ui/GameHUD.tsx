/**
 * 游戏HUD主组件
 * 游戏界面的顶层UI
 */
import React from 'react';
import { Stage } from '../../engine/Stage';
import { IndicatorPanel } from './components/IndicatorPanel';
import { ResourcePanel } from './components/ResourcePanel';
import { TimeDisplay } from './components/TimeDisplay';
import './GameHUD.css';

interface GameHUDProps {
    world: Stage;
}

/**
 * 游戏HUD（平视显示器）
 * 显示游戏中的核心信息
 */
export const GameHUD: React.FC<GameHUDProps> = ({ world }) => {
    return (
        <div className="game-hud">
            {/* 顶部时间栏 */}
            <div className="hud-top">
                <TimeDisplay world={world} />
            </div>

            {/* 左侧指标栏 */}
            <div className="hud-left">
                <IndicatorPanel world={world} />
            </div>

            {/* 右侧资源栏 */}
            <div className="hud-right">
                <ResourcePanel world={world} />
            </div>

            {/* 底部状态栏 */}
            <div className="hud-bottom">
                <div className="game-title">山海情 - 模拟经营</div>
                <div className="game-controls">
                    <button className="control-btn" title="暂停/继续">⏸</button>
                    <button className="control-btn" title="存档">💾</button>
                    <button className="control-btn" title="设置">⚙️</button>
                </div>
            </div>
        </div>
    );
};
