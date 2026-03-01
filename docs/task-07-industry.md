# 任务7: 产业发展系统

## 任务目标

实现产业发展系统，包括双孢菇种植、劳务输出等核心产业机制。

## 依赖关系

- **前置依赖**: Task 5 (人口管理系统), Task 6 (建筑系统)
- **后续依赖**: Task 8, 9, 10

## 实现内容

### 7.1 产业类型定义

创建 `src/games/data/IndustryTypes.ts`:

```typescript
/**
 * 产业类型
 */
export enum IndustryType {
    // 第一产业
    MushroomFarming = 'mushroom_farming',  // 蘑菇种植
    Agriculture = 'agriculture',           // 传统农业
    AnimalHusbandry = 'animal_husbandry',  // 畜牧业
    
    // 第二产业
    LaborExport = 'labor_export',           // 劳务输出
    Manufacturing = 'manufacturing',       // 制造业
    
    // 第三产业
    Trade = 'trade',                        // 商业贸易
    Service = 'service',                   // 服务业
}

/**
 * 产业状态
 */
export enum IndustryStatus {
    Locked = 'locked',       // 未解锁
    Available = 'available', // 可用
    Active = 'active',       // 进行中
    Paused = 'paused',      // 暂停
    Failed = 'failed',      // 失败
}

/**
 * 产业配置
 */
export interface IndustryConfig {
    type: IndustryType;
    name: string;
    description: string;
    
    // 解锁条件
    unlockYear: number;
    unlockTech: number;
    prerequisiteBuildings: string[];
    
    // 资源需求
    laborRequired: number;   // 所需劳动力
    resourceInput: { type: string; amount: number }[];
    
    // 产出
    resourceOutput: { type: string; amount: number; probability?: number }[];
    income: number;         // 基础收入
    
    // 时间
    cycleDays: number;      // 生产周期(天)
    
    // 风险
    riskLevel: number;       // 风险等级 0-10
    riskFactors: string[];
}
```

### 7.2 蘑菇种植产业 (核心产业)

创建 `src/games/data/IndustryMushroom.ts`:

```typescript
import { IndustryConfig } from './IndustryTypes';

export const MushroomFarmingConfig: IndustryConfig = {
    type: 'mushroom_farming',
    name: '双孢菇种植',
    description: '在福建专家指导下学习蘑菇种植技术，获得第一桶金',
    
    unlockYear: 1996,
    unlockTech: 1,
    prerequisiteBuildings: ['mushroom_shed'],
    
    laborRequired: 3,
    resourceInput: [
        { type: 'grass', amount: 10 },   // 菌草
        { type: 'labor', amount: 3 },
    ],
    
    resourceOutput: [
        { type: 'mushroom', amount: 50, probability: 0.8 },
        { type: 'mushroom', amount: 80, probability: 0.15 },
        { type: 'mushroom', amount: 30, probability: 0.05 },  // 歉收
    ],
    
    income: 100,
    cycleDays: 15,
    riskLevel: 3,
    riskFactors: ['病虫害', '价格波动', '气候异常'],
};

export const LaborExportConfig: IndustryConfig = {
    type: 'labor_export',
    name: '劳务输出',
    description: '组织村民赴福建打工，获取工资收入',
    
    unlockYear: 1997,
    unlockTech: 1,
    prerequisiteBuildings: ['fujian_office'],
    
    laborRequired: 5,
    resourceInput: [
        { type: 'money', amount: 50 },  // 交通费用
    ],
    
    resourceOutput: [
        { type: 'money', amount: 300, probability: 0.9 },  // 月薪
        { type: 'money', amount: 500, probability: 0.1 }, // 高薪
    ],
    
    income: 250,
    cycleDays: 30,
    riskLevel: 2,
    riskFactors: ['思乡', '工伤', '歧视'],
};
```

### 7.3 产业系统

创建 `src/games/system/industry/IndustrySystem.ts:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { IndustryType, IndustryStatus, IndustryConfig } from '../../data/IndustryTypes';
import { MushroomFarmingConfig, LaborExportConfig } from '../../data/IndustryMushroom';

interface ActiveIndustry {
    type: IndustryType;
    status: IndustryStatus;
    startDay: number;
    progress: number;  // 0-100
    workers: string[];
}

export class IndustrySystem extends System {
    private industries: Map<IndustryType, IndustryConfig> = new Map();
    private activeIndustries: ActiveIndustry[] = [];
    
    constructor(props: SystemProps) {
        super(props);
        this.initializeIndustries();
    }
    
    private initializeIndustries() {
        // 注册所有产业配置
        this.industries.set(IndustryType.MushroomFarming, MushroomFarmingConfig);
        this.industries.set(IndustryType.LaborExport, LaborExportConfig);
    }
    
    start() {
        console.log('[IndustrySystem] 产业系统启动');
    }
    
    update() {
        // 更新产业进度
        // 计算产出
    }
    
    /**
     * 开启产业
     */
    startIndustry(type: IndustryType, workers: string[]): boolean {
        const config = this.industries.get(type);
        if (!config) return false;
        
        const industry: ActiveIndustry = {
            type,
            status: IndustryStatus.Active,
            startDay: 0,  // TODO: 获取当前天数
            progress: 0,
            workers,
        };
        
        this.activeIndustries.push(industry);
        return true;
    }
    
    /**
     * 获取产业配置
     */
    getConfig(type: IndustryType): IndustryConfig | undefined {
        return this.industries.get(type);
    }
    
    /**
     * 检查是否可解锁
     */
    canUnlock(type: IndustryType, year: number, techLevel: number): boolean {
        const config = this.industries.get(type);
        if (!config) return false;
        
        return year >= config.unlockYear && techLevel >= config.unlockTech;
    }
    
    /**
     * 计算产业产出
     */
    calculateOutput(type: IndustryType, workerCount: number): { type: string; amount: number }[] {
        const config = this.industries.get(type);
        if (!config) return [];
        
        // 根据配置计算产出
        const outputs = config.resourceOutput.map(output => ({
            type: output.type,
            amount: output.amount * workerCount,
        }));
        
        return outputs;
    }
}
```

---

## 验证机制

### 自动化测试
- 测试产业解锁条件
- 测试产出计算

### 手动验证
- 验证蘑菇种植获得产出
- 验证劳务输出收入

---

## 预计工时

4-5小时
