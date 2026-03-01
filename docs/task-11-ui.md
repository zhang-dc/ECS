# 任务11: 交互UI系统

## 任务目标

实现游戏交互UI系统，包括HUD、信息面板、决策弹窗等。

## 依赖关系

- **前置依赖**: Task 1-10 (所有游戏系统)
- **后续依赖**: Task 12, 13, 14

## 实现内容

### 11.1 UI组件结构

创建 `src/games/ui/GameHUD.tsx`:

```typescript
import React from 'react';
import './GameHUD.css';

/**
 * 游戏HUD组件
 * 显示核心指标、时间、任务等信息
 */
export const GameHUD: React.FC = () => {
    return (
        <div className="game-hud">
            {/* 顶部时间栏 */}
            <div className="hud-top">
                <TimeDisplay />
                <GamePhaseIndicator />
            </div>
            
            {/* 左侧指标栏 */}
            <div className="hud-left">
                <IndicatorPanel />
            </div>
            
            {/* 右侧信息栏 */}
            <div className="hud-right">
                <ResourcePanel />
                <PopulationPanel />
            </div>
            
            {/* 底部快捷栏 */}
            <div className="hud-bottom">
                <QuickActions />
            </div>
            
            {/* 任务提示 */}
            <MissionNotification />
            
            {/* 事件弹窗 */}
            <EventModal />
            
            {/* 决策弹窗 */}
            <DecisionModal />
        </div>
    );
};
```

### 11.2 指标面板

创建 `src/games/ui/components/IndicatorPanel.tsx`:

```typescript
import React from 'react';
import { IndicatorComponent } from '../../components/IndicatorComponent';

interface IndicatorPanelProps {
    indicators: IndicatorComponent;
}

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ indicators }) => {
    const getIndicatorColor = (value: number): string => {
        if (value >= 70) return '#4caf50';  // 绿色
        if (value >= 40) return '#ff9800';  // 橙色
        return '#f44336';                    // 红色
    };
    
    return (
        <div className="indicator-panel">
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
                <span className="indicator-value">{indicators.satisfaction}%</span>
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
                <span className="indicator-value">{indicators.hope}%</span>
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
                <span className="indicator-value">{indicators.stability}%</span>
            </div>
        </div>
    );
};
```

### 11.3 事件弹窗

创建 `src/games/ui/components/EventModal.tsx:

```typescript
import React from 'react';
import { EventConfig } from '../../data/EventTypes';

interface EventModalProps {
    event: EventConfig | null;
    onChoice: (choiceId: string) => void;
    onDismiss: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ 
    event, 
    onChoice, 
    onDismiss 
}) => {
    if (!event) return null;
    
    return (
        <div className="modal-overlay">
            <div className="event-modal">
                <h2 className="event-title">{event.title}</h2>
                
                <div className="event-description">
                    {event.storyText || event.description}
                </div>
                
                {event.choices ? (
                    <div className="event-choices">
                        {event.choices.map(choice => (
                            <button
                                key={choice.id}
                                className="choice-button"
                                onClick={() => onChoice(choice.id)}
                            >
                                <span className="choice-title">{choice.title}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <button className="dismiss-button" onClick={onDismiss}>
                        确定
                    </button>
                )}
            </div>
        </div>
    );
};
```

### 11.4 资源面板

创建 `src/games/ui/components/ResourcePanel.tsx`:

```typescript
import React from 'react';
import { ResourceType } from '../../data/ResourceTypes';

interface ResourcePanelProps {
    resources: Partial<Record<ResourceType, number>>;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ resources }) => {
    const formatResource = (type: ResourceType): string => {
        const labels: Record<ResourceType, string> = {
            [ResourceType.Money]: '资金',
            [ResourceType.Food]: '粮食',
            [ResourceType.Mushroom]: '蘑菇',
            [ResourceType.Labor]: '劳动力',
            [ResourceType.Tech]: '技术',
            [ResourceType.Trust]: '信任度',
        };
        return labels[type] || type;
    };
    
    return (
        <div className="resource-panel">
            {Object.entries(resources).map(([type, amount]) => (
                <div key={type} className="resource-item">
                    <span className="resource-label">{formatResource(type as ResourceType)}</span>
                    <span className="resource-value">{amount}</span>
                </div>
            ))}
        </div>
    );
};
```

---

## 验证机制

### 手动验证
- 验证所有UI组件正常显示
- 验证弹窗交互
- 验证响应式布局

---

## 预计工时

4-5小时
