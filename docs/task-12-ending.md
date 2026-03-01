# 任务12: 结局判定系统

## 任务目标

实现结局判定系统，包括多结局触发条件、结局判定逻辑、结局展示等。

## 依赖关系

- **前置依赖**: Task 9, 10, 11
- **后续依赖**: Task 13, 14

## 实现内容

### 12.1 结局类型定义

创建 `src/games/data/EndingTypes.ts`:

```typescript
/**
 * 结局类型
 */
export enum EndingType {
    // 成功结局
    Normal = 'normal',             // 平凡小镇
    Model = 'model',              // 模范示范区
    MushroomKingdom = 'mushroom_kingdom',  // 蘑菇王国
    LaborTown = 'labor_town',      // 劳务之乡
    IndustrialTown = 'industrial_town',  // 工业化城镇
    
    // 失败结局
    Failed = 'failed',             // 村庄衰败
    Abandoned = 'abandoned',       // 废弃
    
    // 隐藏结局
    MountainSea = 'mountain_sea',  // 山海情深
    Pioneer = 'pioneer',           // 弄潮儿
    Original = 'original',        // 不忘初心
}

/**
 * 结局配置
 */
export interface EndingConfig {
    type: EndingType;
    title: string;
    description: string;
    
    // 触发条件
    conditions: {
        minYear?: number;
        maxYear?: number;
        minSatisfaction?: number;
        minHope?: number;
        minPopulation?: number;
        minMoney?: number;
        requiredBuildings?: string[];
        requiredIndustry?: string[];
        noFailureState?: boolean;
    };
    
    // 评分因素
    scoreFactors: {
        satisfaction: number;
        hope: number;
        population: number;
        money: number;
        development: number;
    };
    
    // 结局文本
    endingText: string;
    
    // 结局图片
    image?: string;
}
```

### 12.2 结局配置

创建 `src/games/data/Endings.ts`:

```typescript
import { EndingConfig, EndingType } from './EndingTypes';

export const EndingConfigs: EndingConfig[] = [
    {
        type: EndingType.Normal,
        title: '平凡小镇',
        description: '闽宁镇成为了一个普通的小镇',
        conditions: {
            minYear: 2000,
            minSatisfaction: 40,
            minPopulation: 30,
        },
        scoreFactors: {
            satisfaction: 1,
            hope: 1,
            population: 1,
            money: 1,
            development: 1,
        },
        endingText: '虽然没有特别的发展，但闽宁镇的人们过上了安定的生活...',
    },
    
    {
        type: EndingType.Model,
        title: '模范示范区',
        description: '闽宁镇成为扶贫工作的典范',
        conditions: {
            minSatisfaction: 80,
            minHope: 70,
            minPopulation: 50,
            requiredBuildings: ['school', 'clinic'],
        },
        scoreFactors: {
            satisfaction: 3,
            hope: 2,
            population: 2,
            money: 1,
            development: 2,
        },
        endingText: '闽宁镇的脱贫经验被推广到全国，成为精准扶贫的典范...',
    },
    
    {
        type: EndingType.MushroomKingdom,
        title: '蘑菇王国',
        description: '双孢菇产业成为当地经济支柱',
        conditions: {
            requiredIndustry: ['mushroom_farming'],
        },
        scoreFactors: {
            satisfaction: 2,
            hope: 2,
            population: 1,
            money: 3,
            development: 2,
        },
        endingText: '如今，金滩村成了远近闻名的蘑菇之乡...',
    },
    
    {
        type: EndingType.LaborTown,
        title: '劳务之乡',
        description: '劳务输出成为主要收入来源',
        conditions: {
            minPopulation: 40,
        },
        scoreFactors: {
            satisfaction: 1,
            hope: 2,
            population: 2,
            money: 3,
            development: 1,
        },
        endingText: '越来越多的村民通过外出打工改变了命运...',
    },
    
    {
        type: EndingType.Failed,
        title: '村庄衰败',
        description: '村庄无法继续发展',
        conditions: {
            minSatisfaction: 0,
            maxSatisfaction: 20,
        },
        scoreFactors: {
            satisfaction: -5,
            hope: -3,
            population: -3,
            money: -2,
            development: -2,
        },
        endingText: '越来越多的村民选择了离开，这里又变成了荒无人烟的干沙滩...',
    },
    
    {
        type: EndingType.MountainSea,
        title: '山海情深',
        description: '与福建建立了深厚情谊',
        conditions: {
            minMoney: 5000,
        },
        scoreFactors: {
            satisfaction: 2,
            hope: 3,
            population: 1,
            money: 1,
            development: 2,
        },
        endingText: '闽宁两地的情谊超越了山海，永远铭记在人们心中...',
    },
];
```

### 12.3 结局系统

创建 `src/games/system/ending/EndingSystem.ts:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { EndingConfig, EndingType } from '../../data/EndingTypes';
import { EndingConfigs } from '../../data/Endings';

export class EndingSystem extends System {
    private currentEnding?: EndingConfig;
    private isEndingTriggered: boolean = false;
    private finalScore: number = 0;
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    start() {
        console.log('[EndingSystem] 结局系统启动');
    }
    
    /**
     * 检查是否触发结局
     */
    checkEnding(
        year: number,
        satisfaction: number,
        hope: number,
        population: number,
        money: number,
        buildings: string[],
        industries: string[]
    ): EndingConfig | null {
        if (this.isEndingTriggered) return null;
        
        // 检查失败结局
        if (satisfaction < 20) {
            const failedEnding = EndingConfigs.find(e => e.type === EndingType.Failed);
            if (failedEnding && this.checkConditions(failedEnding.conditions, {
                year, satisfaction, hope, population, money, buildings, industries
            })) {
                return this.triggerEnding(failedEnding);
            }
        }
        
        // 检查成功结局
        for (const ending of EndingConfigs) {
            if (ending.type === EndingType.Failed) continue;
            
            if (this.checkConditions(ending.conditions, {
                year, satisfaction, hope, population, money, buildings, industries
            })) {
                return this.triggerEnding(ending);
            }
        }
        
        return null;
    }
    
    /**
     * 检查条件是否满足
     */
    private checkConditions(
        conditions: EndingConfig['conditions'],
        state: {
            year: number;
            satisfaction: number;
            hope: number;
            population: number;
            money: number;
            buildings: string[];
            industries: string[];
        }
    ): boolean {
        if (conditions.minYear && state.year < conditions.minYear) return false;
        if (conditions.maxYear && state.year > conditions.maxYear) return false;
        if (conditions.minSatisfaction && state.satisfaction < conditions.minSatisfaction) return false;
        if (conditions.minHope && state.hope < conditions.minHope) return false;
        if (conditions.minPopulation && state.population < conditions.minPopulation) return false;
        if (conditions.minMoney && state.money < conditions.minMoney) return false;
        
        if (conditions.requiredBuildings) {
            for (const b of conditions.requiredBuildings) {
                if (!state.buildings.includes(b)) return false;
            }
        }
        
        if (conditions.requiredIndustry) {
            for (const i of conditions.requiredIndustry) {
                if (!state.industries.includes(i)) return false;
            }
        }
        
        return true;
    }
    
    /**
     * 触发结局
     */
    private triggerEnding(ending: EndingConfig): EndingConfig {
        this.isEndingTriggered = true;
        this.currentEnding = ending;
        
        console.log(`[EndingSystem] 结局触发: ${ending.title}`);
        
        // 发送结局事件
        this.world.emit('game:ending', ending);
        
        return ending;
    }
    
    /**
     * 计算最终评分
     */
    calculateScore(
        satisfaction: number,
        hope: number,
        population: number,
        money: number,
        development: number
    ): number {
        this.finalScore = 
            satisfaction * 1.5 +
            hope * 1.5 +
            Math.log(population + 1) * 10 +
            Math.log(money + 1) * 0.5 +
            development * 20;
        
        return this.finalScore;
    }
    
    /**
     * 获取当前结局
     */
    getCurrentEnding(): EndingConfig | undefined {
        return this.currentEnding;
    }
    
    /**
     * 是否已触发结局
     */
    hasEnded(): boolean {
        return this.isEndingTriggered;
    }
}
```

---

## 验证机制

### 自动化测试
- 测试各种条件组合的结局判定

### 手动验证
- 触发不同结局
- 验证结局文本显示

---

## 预计工时

2-3小时
