# 任务2: 核心指标系统

## 任务目标

实现游戏核心指标系统，包括满意度、饥饿度、希望值等冰汽时代风格的核心指标。

## 依赖关系

- **前置依赖**: Task 1 (游戏主场景框架)
- **后续依赖**: Task 3, 5, 8, 12

## 实现内容

### 2.1 定义指标组件

创建 `src/games/components/IndicatorComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';

/**
 * 核心游戏指标组件
 * 参考冰汽时代的温度/希望值系统
 */
export interface IndicatorComponentProps extends BaseComponentProps {
    // 生存指标 (0-100)
    satisfaction: number;    // 满意度 - 村民对生活的满意程度
    hunger: number;          // 饥饿度 - 食物储备水平 (越低越危险)
    warmth: number;          // 温暖度 - 冬季取暖保障
    hope: number;            // 希望值 - 对未来的信心
    stability: number;       // 安定度 - 社会秩序稳定性
    
    // 经济指标
    money: number;           // 资金
    food: number;            // 粮食储备
    population: number;      // 人口数量
    
    // 发展指标
    techLevel: number;       // 技术等级
    outsideConnection: number; // 外界联系 (与福建/政府的联系)
    educationLevel: number;  // 教育水平
}

export class IndicatorComponent extends BaseComponent {
    // 生存指标
    satisfaction: number = 50;    // 初始50
    hunger: number = 70;           // 初始70
    warmth: number = 60;           // 初始60
    hope: number = 40;             // 初始40 (贫困时期希望较低)
    stability: number = 50;        // 初始50
    
    // 经济指标
    money: number = 1000;          // 初始1000
    food: number = 500;            // 初始500
    population: number = 10;       // 初始10
    
    // 发展指标
    techLevel: number = 1;         // 初始Lv1
    outsideConnection: number = 0; // 初始0
    educationLevel: number = 1;    // 初始Lv1
    
    constructor(props: BaseComponentProps) {
        super(props);
        const data = props as IndicatorComponentProps;
        
        // 初始化所有属性
        if (data.satisfaction !== undefined) this.satisfaction = data.satisfaction;
        if (data.hunger !== undefined) this.hunger = data.hunger;
        if (data.warmth !== undefined) this.warmth = data.warmth;
        if (data.hope !== undefined) this.hope = data.hope;
        if (data.stability !== undefined) this.stability = data.stability;
        if (data.money !== undefined) this.money = data.money;
        if (data.food !== undefined) this.food = data.food;
        if (data.population !== undefined) this.population = data.population;
        if (data.techLevel !== undefined) this.techLevel = data.techLevel;
        if (data.outsideConnection !== undefined) this.outsideConnection = data.outsideConnection;
        if (data.educationLevel !== undefined) this.educationLevel = data.educationLevel;
    }
    
    /**
     * 获取总体生活质量评分
     */
    getLifeQuality(): number {
        return Math.floor(
            (this.satisfaction * 0.3 +
            this.hunger * 0.25 +
            this.warmth * 0.2 +
            this.hope * 0.15 +
            this.stability * 0.1)
        );
    }
    
    /**
     * 检查是否处于危险状态
     */
    isInDanger(): boolean {
        return this.satisfaction < 20 ||
               this.hunger < 20 ||
               this.hope < 20;
    }
    
    /**
     * 限制指标在有效范围内
     */
    clamp() {
        const clamp = (v: number, min: number, max: number) => 
            Math.max(min, Math.min(max, v));
            
        this.satisfaction = clamp(this.satisfaction, 0, 100);
        this.hunger = clamp(this.hunger, 0, 100);
        this.warmth = clamp(this.warmth, 0, 100);
        this.hope = clamp(this.hope, 0, 100);
        this.stability = clamp(this.stability, 0, 100);
        
        this.money = Math.max(0, this.money);
        this.food = Math.max(0, this.food);
        this.population = Math.max(0, this.population);
    }
}
```

### 2.2 创建指标系统

创建 `src/games/system/indicator/IndicatorSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { IndicatorComponent } from '../../components/IndicatorComponent';

/**
 * 指标系统
 * 负责计算、更新和管理所有核心指标
 */
export class IndicatorSystem extends System {
    private indicatorComponent?: IndicatorComponent;
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    /**
     * 获取指标组件
     */
    private getOrCreateIndicator(): IndicatorComponent {
        if (!this.indicatorComponent) {
            // 尝试获取已存在的指标组件
            const components = this.world.findComponents(IndicatorComponent);
            if (components.length > 0) {
                this.indicatorComponent = components[0];
            } else {
                // 创建新的指标组件
                this.indicatorComponent = new IndicatorComponent({});
                // TODO: 添加到某个Entity上
            }
        }
        return this.indicatorComponent;
    }
    
    start() {
        console.log('[IndicatorSystem] 指标系统启动');
        this.getOrCreateIndicator();
    }
    
    update() {
        // 每天更新指标
        // 1. 饥饿度自然衰减
        // 2. 温暖度随季节变化
        // 3. 满意度受多因素影响
        
        const indicator = this.getOrCreateIndicator();
        
        // 基础衰减
        indicator.hunger = Math.max(0, indicator.hunger - 0.1);
        indicator.warmth = Math.max(0, indicator.warmth - 0.05);
        
        indicator.clamp();
    }
    
    /**
     * 修改满意度
     */
    modifySatisfaction(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        indicator.satisfaction = Math.max(0, Math.min(100, 
            indicator.satisfaction + delta));
    }
    
    /**
     * 修改希望值
     */
    modifyHope(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        indicator.hope = Math.max(0, Math.min(100, 
            indicator.hope + delta));
    }
    
    /**
     * 获取当前指标状态
     */
    getIndicators(): IndicatorComponent {
        return this.getOrCreateIndicator();
    }
}
```

### 2.3 指标联动规则

在 `IndicatorSystem` 中实现指标间的联动关系：

```typescript
/**
 * 指标联动计算
 * 实现类似冰汽时代的连锁反应机制
 */
private calculateIndicatorChain() {
    const indicator = this.getOrCreateIndicator();
    
    // 1. 饥饿度影响满意度
    if (indicator.hunger < 30) {
        indicator.satisfaction -= 0.5;
    } else if (indicator.hunger > 70) {
        indicator.satisfaction += 0.2;
    }
    
    // 2. 满意度影响希望值
    if (indicator.satisfaction < 30) {
        indicator.hope -= 0.3;
    } else if (indicator.satisfaction > 70) {
        indicator.hope += 0.2;
    }
    
    // 3. 希望值影响安定度
    if (indicator.hope < 20) {
        indicator.stability -= 0.2;  // 可能发生动乱
    }
    
    // 4. 产出效率受满意度影响
    const efficiency = 1 + (indicator.satisfaction - 50) / 100;
    return efficiency;
}
```

---

## 验证机制

### 自动化测试
- 测试指标初始化值正确
- 测试指标修改边界限制
- 测试指标联动计算

```typescript
// 示例测试
describe('IndicatorSystem', () => {
    test('初始指标在有效范围内', () => {
        const indicator = new IndicatorComponent({});
        expect(indicator.satisfaction).toBeGreaterThanOrEqual(0);
        expect(indicator.satisfaction).toBeLessThanOrEqual(100);
    });
    
    test('修改满意度不超过边界', () => {
        const indicator = new IndicatorComponent({});
        indicator.satisfaction = 90;
        // 尝试增加超过100
        indicator.satisfaction = Math.min(100, indicator.satisfaction + 20);
        expect(indicator.satisfaction).toBe(100);
    });
});
```

### 手动验证
1. 打开浏览器开发者工具
2. 在控制台输入验证命令:
   ```javascript
   // 获取指标组件并检查
   const indicator = world.findComponents(IndicatorComponent)[0];
   console.log('满意度:', indicator.satisfaction);
   console.log('生活质量:', indicator.getLifeQuality());
   ```
3. 验证指标在合理范围内变化

---

## 预计工时

3-4小时
