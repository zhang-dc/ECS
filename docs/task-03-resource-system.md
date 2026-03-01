# 任务3: 基础资源系统

## 任务目标

实现游戏基础资源管理系统，包括资金、粮食等经济资源的获取、消耗和存储。

## 依赖关系

- **前置依赖**: Task 2 (核心指标系统)
- **后续依赖**: Task 5, 6, 7

## 实现内容

### 3.1 资源类型定义

创建 `src/games/data/ResourceTypes.ts`:

```typescript
/**
 * 资源类型枚举
 */
export enum ResourceType {
    // 基础资源
    Money = 'money',           // 金钱
    Food = 'food',             // 粮食
    Wood = 'wood',             // 木材
    Stone = 'stone',           // 石头
    
    // 生产资源
    Mushroom = 'mushroom',     // 蘑菇
    Grass = 'grass',           // 菌草
    Labor = 'labor',           // 劳动力
    
    // 特殊资源
    Tech = 'tech',             // 技术点
    Trust = 'trust',           // 信任度 (与福建的关系)
}

/**
 * 资源条目
 */
export interface ResourceEntry {
    type: ResourceType;
    amount: number;
    maxStorage?: number;       // 最大存储量
    productionRate?: number;   // 生产速率
}

/**
 * 资源变动记录
 */
export interface ResourceChange {
    type: ResourceType;
    amount: number;
    reason: string;
    timestamp: number;
}
```

### 3.2 资源组件

创建 `src/games/components/ResourceComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';
import { ResourceType, ResourceEntry } from '../data/ResourceTypes';

/**
 * 资源组件
 * 管理游戏中的所有资源
 */
export interface ResourceData extends BaseComponentProps {
    resources: Partial<Record<ResourceType, ResourceEntry>>;
}

export class ResourceComponent extends BaseComponent {
    resources: Partial<Record<ResourceType, ResourceEntry>> = {};
    
    constructor(props: ResourceData) {
        super(props);
        this.initializeResources(props.resources);
    }
    
    private initializeResources(data?: Partial<Record<ResourceType, ResourceEntry>>) {
        // 初始化基础资源
        const defaults: Record<ResourceType, ResourceEntry> = {
            [ResourceType.Money]: { 
                type: ResourceType.Money, 
                amount: 1000,
                maxStorage: 100000
            },
            [ResourceType.Food]: { 
                type: ResourceType.Food, 
                amount: 500,
                maxStorage: 10000
            },
            [ResourceType.Wood]: { 
                type: ResourceType.Wood, 
                amount: 0,
                maxStorage: 5000
            },
            [ResourceType.Stone]: { 
                type: ResourceType.Stone, 
                amount: 0,
                maxStorage: 5000
            },
            [ResourceType.Mushroom]: { 
                type: ResourceType.Mushroom, 
                amount: 0,
                maxStorage: 1000
            },
            [ResourceType.Grass]: { 
                type: ResourceType.Grass, 
                amount: 0,
                maxStorage: 2000
            },
            [ResourceType.Labor]: { 
                type: ResourceType.Labor, 
                amount: 10,  // 可用劳动力
                maxStorage: 100
            },
            [ResourceType.Tech]: { 
                type: ResourceType.Tech, 
                amount: 0,
                maxStorage: 1000
            },
            [ResourceType.Trust]: { 
                type: ResourceType.Trust, 
                amount: 0,
                maxStorage: 100
            },
        };
        
        // 合并自定义数据和默认值
        if (data) {
            for (const [key, value] of Object.entries(data)) {
                if (value) {
                    defaults[key as ResourceType] = { ...defaults[key as ResourceType], ...value };
                }
            }
        }
        
        this.resources = defaults;
    }
    
    /**
     * 获取资源数量
     */
    getAmount(type: ResourceType): number {
        return this.resources[type]?.amount ?? 0;
    }
    
    /**
     * 获取资源信息
     */
    getResource(type: ResourceType): ResourceEntry | undefined {
        return this.resources[type];
    }
    
    /**
     * 检查是否有足够的资源
     */
    hasEnough(type: ResourceType, amount: number): boolean {
        return this.getAmount(type) >= amount;
    }
    
    /**
     * 添加资源
     */
    add(type: ResourceType, amount: number): boolean {
        const resource = this.resources[type];
        if (!resource) return false;
        
        const newAmount = resource.amount + amount;
        resource.amount = Math.min(
            newAmount, 
            resource.maxStorage ?? Infinity
        );
        
        return true;
    }
    
    /**
     * 消耗资源
     */
    consume(type: ResourceType, amount: number): boolean {
        if (!this.hasEnough(type, amount)) return false;
        
        const resource = this.resources[type];
        if (resource) {
            resource.amount -= amount;
            return true;
        }
        return false;
    }
    
    /**
     * 转移资源 (从一地到另一地)
     */
    transfer(
        fromType: ResourceType, 
        toType: ResourceType, 
        amount: number
    ): boolean {
        if (!this.consume(fromType, amount)) return false;
        return this.add(toType, amount);
    }
}
```

### 3.3 资源系统

创建 `src/games/system/resource/ResourceSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { ResourceComponent } from '../../components/ResourceComponent';
import { ResourceType, ResourceChange } from '../../data/ResourceTypes';

/**
 * 资源系统
 * 负责资源的生产、消耗、交易等逻辑
 */
export class ResourceSystem extends System {
    private resourceComponent?: ResourceComponent;
    private resourceHistory: ResourceChange[] = [];  // 资源变动历史
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    private getOrCreateResource(): ResourceComponent {
        if (!this.resourceComponent) {
            const components = this.world.findComponents(ResourceComponent);
            if (components.length > 0) {
                this.resourceComponent = components[0];
            } else {
                this.resourceComponent = new ResourceComponent({});
                // TODO: 添加到Entity
            }
        }
        return this.resourceComponent;
    }
    
    start() {
        console.log('[ResourceSystem] 资源系统启动');
        this.getOrCreateResource();
    }
    
    update() {
        // 1. 计算每日资源产出
        // 2. 计算每日资源消耗
        // 3. 处理资源存储上限
        
        this.calculateDailyProduction();
    }
    
    /**
     * 每日资源产出计算
     */
    private calculateDailyProduction() {
        const resource = this.getOrCreateResource();
        
        // 基础资源自然产出 (如被动采集)
        // 后续由产业系统补充
    }
    
    /**
     * 花费资源
     */
    spend(type: ResourceType, amount: number, reason: string): boolean {
        const resource = this.getOrCreateResource();
        
        if (!resource.consume(type, amount)) {
            console.warn(`[ResourceSystem] 资源不足: 需要 ${amount} ${type}, 当前 ${resource.getAmount(type)}`);
            return false;
        }
        
        this.recordChange(type, -amount, reason);
        return true;
    }
    
    /**
     * 获得资源
     */
    gain(type: ResourceType, amount: number, reason: string): boolean {
        const resource = this.getOrCreateResource();
        
        if (!resource.add(type, amount)) {
            console.warn(`[ResourceSystem] 资源存储已满: ${type}`);
            return false;
        }
        
        this.recordChange(type, amount, reason);
        return true;
    }
    
    /**
     * 记录资源变动
     */
    private recordChange(type: ResourceType, amount: number, reason: string) {
        this.resourceHistory.push({
            type,
            amount,
            reason,
            timestamp: Date.now(),
        });
        
        // 限制历史记录长度
        if (this.resourceHistory.length > 1000) {
            this.resourceHistory = this.resourceHistory.slice(-500);
        }
    }
    
    /**
     * 获取资源历史
     */
    getHistory(limit?: number): ResourceChange[] {
        if (limit) {
            return this.resourceHistory.slice(-limit);
        }
        return this.resourceHistory;
    }
    
    /**
     * 获取当前所有资源状态
     */
    getResources(): Partial<Record<ResourceType, number>> {
        const resource = this.getOrCreateResource();
        const result: Partial<Record<ResourceType, number>> = {};
        
        for (const [type, entry] of Object.entries(resource.resources)) {
            result[type as ResourceType] = entry.amount;
        }
        
        return result;
    }
}
```

---

## 验证机制

### 自动化测试
```typescript
describe('ResourceComponent', () => {
    test('初始资源正确', () => {
        const resource = new ResourceComponent({});
        expect(resource.getAmount(ResourceType.Money)).toBe(1000);
        expect(resource.getAmount(ResourceType.Food)).toBe(500);
    });
    
    test('资源添加和消耗', () => {
        const resource = new ResourceComponent({});
        resource.add(ResourceType.Money, 500);
        expect(resource.getAmount(ResourceType.Money)).toBe(1500);
        
        resource.consume(ResourceType.Money, 300);
        expect(resource.getAmount(ResourceType.Money)).toBe(1200);
    });
    
    test('资源不足时消耗失败', () => {
        const resource = new ResourceComponent({});
        const result = resource.consume(ResourceType.Money, 2000);
        expect(result).toBe(false);
    });
});
```

### 手动验证
```javascript
// 控制台验证
const resource = world.findComponents(ResourceComponent)[0];
console.log('资金:', resource.getAmount('money'));
console.log('粮食:', resource.getAmount('food'));

// 测试消费
resource.consume('money', 100);
console.log('消费后资金:', resource.getAmount('money'));
```

---

## 预计工时

3小时
