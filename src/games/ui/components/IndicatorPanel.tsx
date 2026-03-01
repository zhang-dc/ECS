/**
 * 指标面板组件
 * 显示游戏核心指标
 */
import React, { useEffect, useState } from 'react';
import { Stage } from '../../../engine/Stage';
import { IndicatorComponent } from '../../components/IndicatorComponent';
import './IndicatorPanel.css';

interface IndicatorPanelProps {
    world: Stage;
}

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ world }) => {
    const [indicators, setIndicators] = useState<IndicatorComponent | null>(null);

    useEffect(() => {
        // 获取指标组件
        const components = world.findComponents(IndicatorComponent);
        if (components.length > 0) {
            setIndicators(components[0]);
        }

        // 监听指标变化
        const unsubscribe = world.on('indicator:change', () => {
            const components = world.findComponents(IndicatorComponent);
            if (components.length > 0) {
                setIndicators({ ...components[0] } as IndicatorComponent);
            }
        });

        return () => unsubscribe();
    }, [world]);

    const getIndicatorColor = (value: number): string => {
        if (value >= 70) return '#4caf50';
        if (value >= 40) return '#ff9800';
        return '#f44336';
    };

    if (!indicators) {
        return <div className="indicator-panel loading">加载中...</div>;
    }

    return (
        <div className="indicator-panel">
            <h3>核心指标</h3>
            
            <div className="indicator-item">
                <span className="indicator-label">满意度</span>
                <div className="indicator-bar">
                    <div
                        className="indicator-fill"
                        style={{
                            width: `${indicators.satisfaction}%`,
                            backgroundColor: getIndicatorColor(indicators.satisfaction)
                        }}
                    />
                </div>
                <span className="indicator-value">{Math.round(indicators.satisfaction)}%</span>
            </div>

            <div className="indicator-item">
                <span className="indicator-label">希望值</span>
                <div className="indicator-bar">
                    <div
                        className="indicator-fill"
                        style={{
                            width: `${indicators.hope}%`,
                            backgroundColor: getIndicatorColor(indicators.hope)
                        }}
                    />
                </div>
                <span className="indicator-value">{Math.round(indicators.hope)}%</span>
            </div>

            <div className="indicator-item">
                <span className="indicator-label">安定度</span>
                <div className="indicator-bar">
                    <div
                        className="indicator-fill"
                        style={{
                            width: `${indicators.stability}%`,
                            backgroundColor: getIndicatorColor(indicators.stability)
                        }}
                    />
                </div>
                <span className="indicator-value">{Math.round(indicators.stability)}%</span>
            </div>

            <div className="indicator-item">
                <span className="indicator-label">饥饿度</span>
                <div className="indicator-bar">
                    <div
                        className="indicator-fill"
                        style={{
                            width: `${indicators.hunger}%`,
                            backgroundColor: getIndicatorColor(indicators.hunger)
                        }}
                    />
                </div>
                <span className="indicator-value">{Math.round(indicators.hunger)}%</span>
            </div>
        </div>
    );
};
