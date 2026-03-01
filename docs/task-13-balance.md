# 任务13: 数值平衡调整

## 任务目标

调整游戏数值平衡，确保游戏体验流畅、有挑战性但不至于过于困难。

## 依赖关系

- **前置依赖**: Task 1-12 (所有核心系统)
- **后续依赖**: Task 14, 15, 16

## 实现内容

### 13.1 数值体系设计

创建 `src/games/data/BalanceConfig.ts`:

```typescript
/**
 * 数值平衡配置
 */
export const BalanceConfig = {
    // === 游戏速度 ===
    gameSpeed: {
        tickPerDay: 10,           // 每天tick数
        dayPerMonth: 30,          // 每月天数
        monthPerYear: 12,         // 每年月数
    },
    
    // === 资源平衡 ===
    resources: {
        // 初始资源
        initialMoney: 1000,
        initialFood: 500,
        initialWood: 0,
        
        // 每日消耗
        dailyFoodPerPerson: 1,
        dailyWaterPerPerson: 0.5,
        
        // 存储上限
        maxFoodStorage: 10000,
        maxMoneyStorage: 100000,
    },
    
    // === 人口平衡 ===
    population: {
        // 初始人口
        initialPopulation: 10,
        
        // 增长
        birthRate: 0.01,          // 出生率
        naturalDeathRate: 0.005,  // 自然死亡率
        
        // 迁移
        immigrationRate: 0.05,   // 迁入率
        emigrationRate: 0.03,    // 迁出率 (满意度过低时增加)
        
        // 劳动力
        laborParticipationRate: 0.8,  // 劳动参与率
    },
    
    // === 指标平衡 ===
    indicators: {
        // 初始值
        initialSatisfaction: 50,
        initialHope: 40,
        initialStability: 50,
        
        // 临界值
        dangerThreshold: 20,      // 危险临界值
        warningThreshold: 40,    // 警告临界值
        
        // 恢复速度
        satisfactionRecoveryPerDay: 1,
        hopeRecoveryPerDay: 0.5,
        
        // 下降速度
        satisfactionDropPerDay: 2,
        hopeDropPerDay: 1,
    },
    
    // === 建筑平衡 ===
    buildings: {
        // 建造时间
        baseBuildTime: 5,        // 基础建造时间(天)
        
        // 维护成本
        maintenanceCostPerLevel: 10,
    },
    
    // === 产业平衡 ===
    industries: {
        // 蘑菇种植
        mushroom: {
            cycleDays: 15,
            baseOutput: 50,
            baseCost: 100,
            baseIncome: 150,
        },
        
        // 劳务输出
        laborExport: {
            cycleDays: 30,
            baseIncome: 250,
            riskRate: 0.1,
        },
    },
    
    // === 事件平衡 ===
    events: {
        // 基础事件概率
        baseEventChance: 0.1,
        
        // 季节调整
        winterEventChance: 0.2,
        
        // 自然灾害
        disasterChance: 0.05,
    },
};
```

### 13.2 难度配置

```typescript
/**
 * 难度配置
 */
export const DifficultySettings = {
    easy: {
        name: '简单',
        resourceMultiplier: 1.5,
        disasterChance: 0.5,
        satisfactionLoss: 0.7,
        eventReward: 1.3,
    },
    
    normal: {
        name: '普通',
        resourceMultiplier: 1.0,
        disasterChance: 1.0,
        satisfactionLoss: 1.0,
        eventReward: 1.0,
    },
    
    hard: {
        name: '困难',
        resourceMultiplier: 0.7,
        disasterChance: 1.5,
        satisfactionLoss: 1.3,
        eventReward: 0.8,
    },
};
```

### 13.3 数值调整工具

```typescript
/**
 * 数值调整系统
 */
export class BalanceTuner {
    private config: typeof BalanceConfig;
    
    constructor(difficulty: keyof typeof DifficultySettings = 'normal') {
        this.config = this.applyDifficulty(difficulty);
    }
    
    private applyDifficulty(difficulty: keyof typeof DifficultySettings) {
        const diff = DifficultySettings[difficulty];
        return {
            ...BalanceConfig,
            resources: {
                ...BalanceConfig.resources,
                initialMoney: Math.floor(BalanceConfig.resources.initialMoney * diff.resourceMultiplier),
            },
            events: {
                ...BalanceConfig.events,
                disasterChance: BalanceConfig.events.disasterChance * diff.disasterChance,
            },
        };
    }
    
    /**
     * 获取调整后的产出
     */
    getAdjustedOutput(baseOutput: number, difficulty: string): number {
        const diff = DifficultySettings[difficulty as keyof typeof DifficultySettings];
        return Math.floor(baseOutput * diff.eventReward);
    }
}
```

---

## 验证方法

### 自动化测试
- 运行压力测试模拟多周目
- 验证资源不会耗尽
- 验证人口不会异常增长/减少

### 手动测试清单
- [ ] 新手教程流程顺畅
- [ ] 困难模式有挑战性但可完成
- [ ] 各产业收益相对平衡
- [ ] 随机事件不会导致游戏崩溃

---

## 预计工时

3-4小时
