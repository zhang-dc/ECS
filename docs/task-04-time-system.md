# 任务4: 时间推进系统

## 任务目标

实现游戏内时间推进系统，包括年月日推进、季节变化、时间加速等机制。

## 依赖关系

- **前置依赖**: Task 1 (游戏主场景框架)
- **后续依赖**: Task 8 (任务系统), Task 10 (事件系统)

## 实现内容

### 4.1 时间配置

在 `src/games/data/GameConfig.ts` 中扩展时间配置:

```typescript
// 时间相关配置
export const TimeConfig = {
    // 时间速度
    ticksPerDay: 10,           // 每天多少tick (帧)
    baseDaysPerMonth: 30,      // 每月多少天
    baseMonthsPerYear: 12,     // 每年多少月
    
    // 游戏内时间流速 (可由玩家调整)
    speedMultiplier: 1,         // 1x, 2x, 4x, 8x
    
    // 季节设置
    seasons: [
        { name: '春季', monthStart: 3, tempModifier: 0 },
        { name: '夏季', monthStart: 6, tempModifier: 20 },
        { name: '秋季', monthStart: 9, tempModifier: 5 },
        { name: '冬季', monthStart: 12, tempModifier: -30 },
    ],
    
    // 游戏开始时间
    startYear: 1991,
    startMonth: 1,
    startDay: 1,
};

/**
 * 季节类型
 */
export enum Season {
    Spring = 'spring',
    Summer = 'summer', 
    Autumn = 'autumn',
    Winter = 'winter',
}
```

### 4.2 时间组件

创建 `src/games/components/TimeComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';
import { TimeConfig } from '../data/GameConfig';

export interface TimeComponentProps extends BaseComponentProps {
    year?: number;
    month?: number;
    day?: number;
    tick?: number;
    speed?: number;
}

export class TimeComponent extends BaseComponent {
    // 当前时间
    year: number = TimeConfig.startYear;
    month: number = TimeConfig.startMonth;
    day: number = TimeConfig.startDay;
    tick: number = 0;
    
    // 时间速度 (1=正常, 2=2倍, etc.)
    speed: number = 1;
    
    // 暂停状态
    isPaused: boolean = false;
    
    // 总天数 (从游戏开始计算)
    totalDays: number = 0;
    
    constructor(props: TimeComponentProps) {
        super(props);
        const data = props as TimeComponentProps;
        
        if (data.year !== undefined) this.year = data.year;
        if (data.month !== undefined) this.month = data.month;
        if (data.day !== undefined) this.day = data.day;
        if (data.tick !== undefined) this.tick = data.tick;
        if (data.speed !== undefined) this.speed = data.speed;
        
        this.calculateTotalDays();
    }
    
    /**
     * 计算总天数
     */
    private calculateTotalDays() {
        const yearsPassed = this.year - TimeConfig.startYear;
        const monthsPassed = this.month - TimeConfig.startMonth;
        this.totalDays = yearsPassed * TimeConfig.baseDaysPerMonth * TimeConfig.baseMonthsPerYear +
                        monthsPassed * TimeConfig.baseDaysPerMonth +
                        this.day;
    }
    
    /**
     * 获取当前季节
     */
    getSeason(): string {
        const seasonIndex = Math.floor((this.month - 3) / 3) % 4;
        const seasons = ['春季', '夏季', '秋季', '冬季'];
        return seasons[seasonIndex];
    }
    
    /**
     * 获取时间描述
     */
    getDateString(): string {
        return `${this.year}年${this.month}月${this.day}日 ${this.getSeason()}`;
    }
    
    /**
     * 推进一天
     */
    advanceDay() {
        this.day++;
        this.totalDays++;
        
        if (this.day > TimeConfig.baseDaysPerMonth) {
            this.day = 1;
            this.month++;
        }
        
        if (this.month > TimeConfig.baseMonthsPerYear) {
            this.month = 1;
            this.year++;
        }
    }
}
```

### 4.3 时间系统

创建 `src/games/system/time/TimeSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { TimeComponent } from '../../components/TimeComponent';
import { TimeConfig } from '../data/GameConfig';

/**
 * 时间系统
 * 负责游戏内时间推进和季节变化
 */
export class TimeSystem extends System {
    private timeComponent?: TimeComponent;
    private tickCount: number = 0;
    
    // 时间事件回调
    private onDayChangeCallbacks: (() => void)[] = [];
    private onMonthChangeCallbacks: (() => void)[] = [];
    private onYearChangeCallbacks: (() => void)[] = [];
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    private getOrCreateTime(): TimeComponent {
        if (!this.timeComponent) {
            const components = this.world.findComponents(TimeComponent);
            if (components.length > 0) {
                this.timeComponent = components[0];
            } else {
                this.timeComponent = new TimeComponent({});
                // TODO: 添加到Entity
            }
        }
        return this.timeComponent;
    }
    
    start() {
        console.log('[TimeSystem] 时间系统启动');
        this.getOrCreateTime();
    }
    
    update() {
        const time = this.getOrCreateTime();
        
        if (time.isPaused) return;
        
        // 增加tick
        this.tickCount += time.speed;
        
        // 达到一天所需的tick数
        if (this.tickCount >= TimeConfig.ticksPerDay) {
            this.tickCount = 0;
            this.advanceDay();
        }
    }
    
    /**
     * 推进一天
     */
    private advanceDay() {
        const time = this.getOrCreateTime();
        const oldMonth = time.month;
        const oldYear = time.year;
        
        time.advanceDay();
        
        // 触发日期变化事件
        this.onDayChangeCallbacks.forEach(cb => cb());
        
        // 月份变化
        if (time.month !== oldMonth) {
            this.onMonthChangeCallbacks.forEach(cb => cb());
        }
        
        // 年份变化
        if (time.year !== oldYear) {
            this.onYearChangeCallbacks.forEach(cb => cb());
            console.log(`[TimeSystem] 新年快乐! 现在是 ${time.year}年`);
        }
    }
    
    /**
     * 注册日期变化回调
     */
    onDayChange(callback: () => void): () => void {
        this.onDayChangeCallbacks.push(callback);
        return () => {
            const index = this.onDayChangeCallbacks.indexOf(callback);
            if (index > -1) this.onDayChangeCallbacks.splice(index, 1);
        };
    }
    
    /**
     * 设置时间速度
     */
    setSpeed(speed: number) {
        const time = this.getOrCreateTime();
        time.speed = speed;
    }
    
    /**
     * 暂停/恢复时间
     */
    togglePause() {
        const time = this.getOrCreateTime();
        time.isPaused = !time.isPaused;
    }
    
    /**
     * 获取当前时间
     */
    getTime(): TimeComponent {
        return this.getOrCreateTime();
    }
}
```

### 4.4 时间系统与指标联动

扩展 `TimeSystem` 以支持与其他系统的联动:

```typescript
/**
 * 在时间推进时自动触发其他系统更新
 */
private setupTimeEventListeners(
    indicatorSystem: IndicatorSystem,
    resourceSystem: ResourceSystem,
    eventSystem: EventSystem
) {
    // 每天更新
    this.onDayChange(() => {
        // 人口消耗粮食
        this.dailyFoodConsumption(resourceSystem, indicatorSystem);
        
        // 检查随机事件
        eventSystem.checkDailyEvent();
    });
    
    // 每月更新
    this.onMonthChange(() => {
        // 月度统计
        this.monthlyReport();
    });
    
    // 每年更新
    this.onYearChange(() => {
        // 年度评估
        this.yearlyAssessment();
    });
}

/**
 * 每日粮食消耗
 */
private dailyFoodConsumption(
    resourceSystem: ResourceSystem,
    indicatorSystem: IndicatorSystem
) {
    const indicator = indicatorSystem.getIndicators();
    const population = indicator.population;
    
    // 每人每天消耗1单位粮食
    const dailyFood = population * 1;
    
    if (resourceSystem.spend('food', dailyFood, '每日消耗')) {
        // 粮食充足，饥饿度上升
        indicator.hunger = Math.min(100, indicator.hunger + 10);
    } else {
        // 粮食不足，饥饿度下降
        indicator.hunger = Math.max(0, indicator.hunger - 20);
        indicatorSystem.modifySatisfaction(-5);
    }
}
```

---

## 验证机制

### 自动化测试
```typescript
describe('TimeComponent', () => {
    test('时间初始化正确', () => {
        const time = new TimeComponent({});
        expect(time.year).toBe(1991);
        expect(time.month).toBe(1);
        expect(time.day).toBe(1);
    });
    
    test('推进日期正确', () => {
        const time = new TimeComponent({});
        time.advanceDay();
        expect(time.day).toBe(2);
    });
    
    test('月份和年份自动进位', () => {
        const time = new TimeComponent({ year: 1991, month: 12, day: 30 });
        time.advanceDay();
        expect(time.year).toBe(1992);
        expect(time.month).toBe(1);
        expect(time.day).toBe(1);
    });
    
    test('季节计算正确', () => {
        const time = new TimeComponent({ month: 1 });
        expect(time.getSeason()).toBe('冬季');
        
        time.month = 6;
        expect(time.getSeason()).toBe('夏季');
    });
});
```

### 手动验证
```javascript
// 获取时间组件
const time = world.findComponents(TimeComponent)[0];

// 验证时间显示
console.log('当前时间:', time.getDateString());
console.log('当前季节:', time.getSeason());

// 测试暂停
time.isPaused = true;
console.log('已暂停');
```

---

## 预计工时

2-3小时
