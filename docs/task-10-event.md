# 任务10: 随机事件系统

## 任务目标

实现随机事件系统，包括自然灾害、社会事件、特殊事件等。

## 依赖关系

- **前置依赖**: Task 4 (时间系统), Task 8 (任务系统)
- **后续依赖**: Task 11, 12

## 实现内容

### 10.1 事件类型定义

创建 `src/games/data/EventTypes.ts`:

```typescript
/**
 * 事件类型
 */
export enum EventType {
    // 自然灾害
    Sandstorm = 'sandstorm',     // 沙尘暴
    Drought = 'drought',         // 干旱
    Pest = 'pest',               // 病虫害
    
    // 社会事件
    Escape = 'escape',           // 村民逃跑
    Merchant = 'merchant',       // 商人到来
    Newcomer = 'newcomer',       // 新移民
    Dispute = 'dispute',         // 纠纷
    
    // 特殊事件
    FujianGuest = 'fujian_guest', // 福建来客
    Government = 'government',   // 政府检查
    Media = 'media',             // 媒体采访
    
    // 节日事件
    Festival = 'festival',       // 节日
}

/**
 * 事件影响
 */
export interface EventImpact {
    // 指标影响
    satisfaction?: number;
    hope?: number;
    stability?: number;
    hunger?: number;
    
    // 资源影响
    money?: number;
    food?: number;
    mushroom?: number;
    
    // 建筑影响
    buildingDamage?: string[];   // 损坏的建筑类型
    
    // 特殊
    populationChange?: number;   // 人口变化
    special?: string;           // 特殊效果描述
}

/**
 * 事件配置
 */
export interface EventConfig {
    id: string;
    type: EventType;
    title: string;
    description: string;
    
    // 触发条件
    triggerYear: number;        // 触发年份
    triggerMonth?: number;       // 触发月份
    probability: number;         // 触发概率 (0-1)
    conditions?: {               // 触发条件
        minPopulation?: number;
        minMoney?: number;
        activeIndustry?: string;
    };
    
    // 影响
    impact: EventImpact;
    
    // 选项
    choices?: {
        id: string;
        title: string;
        effect: EventImpact;
    }[];
    
    // 剧情
    storyText?: string;
}
```

### 10.2 事件库

创建 `src/games/data/Events.ts`:

```typescript
import { EventConfig, EventType } from './EventTypes';

export const RandomEvents: EventConfig[] = [
    // 自然灾害
    {
        id: 'event_sandstorm',
        type: EventType.Sandstorm,
        title: '沙尘暴来袭',
        description: '一场严重的沙尘暴席卷而来',
        triggerYear: 1991,
        probability: 0.1,
        conditions: { minPopulation: 5 },
        impact: {
            food: -50,
            satisfaction: -10,
            buildingDamage: ['mushroom_shed'],
        },
        storyText: '漫天的黄沙让人睁不开眼，菇棚被毁坏了...',
    },
    
    {
        id: 'event_drought',
        type: EventType.Drought,
        title: '持续干旱',
        description: '长时间没有降雨，井窖干涸',
        triggerYear: 1992,
        probability: 0.15,
        impact: {
            food: -30,
            hunger: -20,
            satisfaction: -15,
        },
    },
    
    // 社会事件
    {
        id: 'event_escape_01',
        type: EventType.Escape,
        title: '村民逃跑',
        description: '有村民不堪艰苦环境，决定逃回原籍',
        triggerYear: 1991,
        probability: 0.2,
        conditions: { minPopulation: 8 },
        impact: {
            populationChange: -1,
            satisfaction: -10,
            hope: -5,
        },
        choices: [
            {
                id: 'choice_1',
                title: '劝说挽留',
                effect: { satisfaction: 5, money: -50 },
            },
            {
                id: 'choice_2',
                title: '放任离开',
                effect: { populationChange: -1 },
            },
        ],
    },
    
    {
        id: 'event_merchant',
        type: EventType.Merchant,
        title: '蘑菇商人',
        description: '商人来收购蘑菇',
        triggerYear: 1996,
        probability: 0.25,
        conditions: { minPopulation: 10 },
        impact: {
            money: 200,
            mushroom: -50,
        },
        choices: [
            {
                id: 'sell_normal',
                title: '正常出售',
                effect: { money: 100 },
            },
            {
                id: 'sell_high',
                title: '囤积居奇',
                effect: { money: 200, risk: 0.3 },
            },
        ],
    },
    
    // 福建来客
    {
        id: 'event_fujian_expert',
        type: EventType.FujianGuest,
        title: '福建专家到达',
        description: '福建派来了农业专家',
        triggerYear: 1996,
        probability: 0.5,
        impact: {
            tech: 10,
            trust: 10,
            hope: 15,
            satisfaction: 10,
        },
        storyText: '凌一农教授带着菌草技术来到了金滩村...',
    },
    
    {
        id: 'event_fujian_visit',
        type: EventType.FujianGuest,
        title: '福建领导考察',
        description: '福建省领导来考察对口帮扶工作',
        triggerYear: 1998,
        probability: 0.3,
        impact: {
            trust: 20,
            money: 500,
            satisfaction: 10,
        },
    },
    
    // 节日
    {
        id: 'event_spring',
        type: EventType.Festival,
        title: '春节',
        description: '新春佳节，村里举办庆祝活动',
        triggerYear: 1992,
        triggerMonth: 1,
        probability: 1.0,
        impact: {
            satisfaction: 15,
            hope: 10,
            food: -20,
        },
    },
];
```

### 10.3 事件系统

创建 `src/games/system/event/EventSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { EventConfig, EventType } from '../../data/EventTypes';
import { RandomEvents } from '../../data/Events';

interface ActiveEvent {
    config: EventConfig;
    choices: boolean;  // 是否有选项需要玩家选择
    resolved: boolean;
}

export class EventSystem extends System {
    private eventPool: EventConfig[] = [];
    private activeEvent?: ActiveEvent;
    private eventHistory: EventConfig[] = [];
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    start() {
        console.log('[EventSystem] 事件系统启动');
        this.initializeEventPool();
    }
    
    private initializeEventPool() {
        // 加载所有事件
        this.eventPool = [...RandomEvents];
    }
    
    /**
     * 检查是否触发事件
     */
    checkEventTrigger(year: number, month?: number): EventConfig | null {
        // 过滤符合条件的事件
        const availableEvents = this.eventPool.filter(event => {
            // 检查年份
            if (event.triggerYear > year) return false;
            
            // 检查月份
            if (event.triggerMonth && event.triggerMonth !== month) return false;
            
            // 检查概率
            if (Math.random() > event.probability) return false;
            
            // 检查条件
            if (event.conditions) {
                // TODO: 检查实际条件
            }
            
            // 检查是否已触发过
            if (this.eventHistory.some(e => e.id === event.id)) return false;
            
            return true;
        });
        
        // 随机选择一个事件
        if (availableEvents.length > 0) {
            const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
            this.triggerEvent(event);
            return event;
        }
        
        return null;
    }
    
    /**
     * 触发事件
     */
    triggerEvent(config: EventConfig) {
        this.activeEvent = {
            config,
            choices: !!(config.choices && config.choices.length > 0),
            resolved: false,
        };
        
        this.eventHistory.push(config);
        
        // 记录事件日志
        console.log(`[EventSystem] 事件触发: ${config.title}`);
        
        // 发送事件通知到UI
        this.world.emit('game:event', config);
    }
    
    /**
     * 处理事件选项
     */
    handleChoice(choiceId: string): boolean {
        if (!this.activeEvent || !this.activeEvent.config.choices) {
            return false;
        }
        
        const choice = this.activeEvent.config.choices.find(c => c.id === choiceId);
        if (!choice) return false;
        
        // 应用选择效果
        this.applyImpact(choice.effect);
        
        this.activeEvent.resolved = true;
        this.activeEvent = undefined;
        
        return true;
    }
    
    /**
     * 应用事件影响
     */
    private applyImpact(impact: any) {
        // TODO: 调用指标系统和资源系统
    }
    
    /**
     * 获取当前事件
     */
    getActiveEvent(): EventConfig | null {
        return this.activeEvent?.config || null;
    }
    
    /**
     * 获取事件历史
     */
    getEventHistory(): EventConfig[] {
        return this.eventHistory;
    }
}
```

---

## 验证机制

### 自动化测试
- 测试事件触发概率
- 测试事件效果应用

### 手动验证
- 观察事件触发
- 选择不同选项验证效果

---

## 预计工时

3-4小时
