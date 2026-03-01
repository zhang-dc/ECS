# 任务5: 人口管理系统

## 任务目标

实现人口管理系统，包括村民类型、属性、满意度、工作分配等。

## 依赖关系

- **前置依赖**: Task 2 (核心指标系统), Task 3 (基础资源系统)
- **后续依赖**: Task 6, 7, 8, 10

## 实现内容

### 5.1 村民类型定义

创建 `src/games/data/VillagerTypes.ts`:

```typescript
/**
 * 村民类型
 */
export enum VillagerType {
    Normal = 'normal',         // 普通村民
    Skilled = 'skilled',      // 技术人才
    Cadre = 'cadre',         // 干部
    Troublemaker = 'troublemaker',  // 刺头/钉子户
    Elder = 'elder',         // 老人
    Child = 'child',         // 儿童
}

/**
 * 工作类型
 */
export enum WorkType {
    Idle = 'idle',            // 闲置
    Farming = 'farming',      // 农业
    Mushroom = 'mushroom',   // 蘑菇种植
    Construction = 'construction',  // 建筑
    Labor = 'labor',         // 劳务输出
    Guard = 'guard',         // 治安
    Education = 'education', // 教育
}

/**
 * 村民属性
 */
export interface VillagerAttributes {
    age: number;              // 年龄
    health: number;          // 健康度 0-100
    satisfaction: number;     // 个人满意度 0-100
    skill: number;            // 技能等级 1-5
    workEfficiency: number;   // 工作效率 0-200%
}
```

### 5.2 村民组件

创建 `src/games/components/VillagerComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';
import { VillagerType, WorkType, VillagerAttributes } from '../data/VillagerTypes';

export interface VillagerData extends BaseComponentProps {
    id: string;
    name: string;
    type: VillagerType;
    attributes: VillagerAttributes;
    currentWork: WorkType;
    homeId?: string;         // 住所ID
}

export class VillagerComponent extends BaseComponent {
    id: string;
    name: string;
    type: VillagerType;
    attributes: VillagerAttributes;
    currentWork: WorkType = WorkType.Idle;
    homeId?: string;
    
    constructor(props: VillagerData) {
        super(props);
        
        this.id = props.id;
        this.name = props.name;
        this.type = props.type;
        this.attributes = props.attributes || this.createDefaultAttributes();
        this.currentWork = props.currentWork || WorkType.Idle;
        this.homeId = props.homeId;
    }
    
    private createDefaultAttributes(): VillagerAttributes {
        return {
            age: 30,
            health: 80,
            satisfaction: 50,
            skill: 1,
            workEfficiency: 100,
        };
    }
    
    /**
     * 分配工作
     */
    assignWork(work: WorkType): void {
        this.currentWork = work;
    }
    
    /**
     * 获取工作产出
     */
    getWorkOutput(): number {
        return this.attributes.workEfficiency / 100;
    }
    
    /**
     * 每日状态更新
     */
    dailyUpdate() {
        // 健康度自然变化
        // 满意度变化
    }
}
```

### 5.3 人口组件 (管理所有村民)

创建 `src/games/components/PopulationComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';
import { VillagerComponent } from './VillagerComponent';
import { VillagerType } from '../data/VillagerTypes';

export class PopulationComponent extends BaseComponent {
    villagers: VillagerComponent[] = [];
    
    // 人口统计
    totalPopulation: number = 0;
    workingPopulation: number = 0;
    idlePopulation: number = 0;
    
    constructor(props: BaseComponentProps) {
        super(props);
    }
    
    /**
     * 添加村民
     */
    addVillager(villager: VillagerComponent): void {
        this.villagers.push(villager);
        this.updateStatistics();
    }
    
    /**
     * 移除村民
     */
    removeVillager(villagerId: string): boolean {
        const index = this.villagers.findIndex(v => v.id === villagerId);
        if (index > -1) {
            this.villagers.splice(index, 1);
            this.updateStatistics();
            return true;
        }
        return false;
    }
    
    /**
     * 获取特定类型的村民
     */
    getVillagersByType(type: VillagerType): VillagerComponent[] {
        return this.villagers.filter(v => v.type === type);
    }
    
    /**
     * 获取可用劳动力
     */
    getAvailableLabor(): number {
        return this.villagers.filter(
            v => v.currentWork === 'idle' && v.attributes.age >= 16
        ).length;
    }
    
    /**
     * 更新统计信息
     */
    private updateStatistics(): void {
        this.totalPopulation = this.villagers.length;
        this.workingPopulation = this.villagers.filter(
            v => v.currentWork !== 'idle'
        ).length;
        this.idlePopulation = this.totalPopulation - this.workingPopulation;
    }
    
    /**
     * 获取平均满意度
     */
    getAverageSatisfaction(): number {
        if (this.villagers.length === 0) return 0;
        const total = this.villagers.reduce((sum, v) => sum + v.attributes.satisfaction, 0);
        return Math.round(total / this.villagers.length);
    }
}
```

### 5.4 人口系统

创建 `src/games/system/population/PopulationSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { PopulationComponent } from '../../components/PopulationComponent';
import { VillagerComponent } from '../../components/VillagerComponent';
import { VillagerType, WorkType } from '../../data/VillagerTypes';

export class PopulationSystem extends System {
    private populationComponent?: PopulationComponent;
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    private getOrCreatePopulation(): PopulationComponent {
        if (!this.populationComponent) {
            const components = this.world.findComponents(PopulationComponent);
            if (components.length > 0) {
                this.populationComponent = components[0];
            } else {
                this.populationComponent = new PopulationComponent({});
            }
        }
        return this.populationComponent;
    }
    
    start() {
        console.log('[PopulationSystem] 人口系统启动');
        this.initializeStartingPopulation();
    }
    
    /**
     * 初始化起始人口 (1991年, 10户移民)
     */
    private initializeStartingPopulation() {
        const population = this.getOrCreatePopulation();
        
        // 创建10个初始村民
        const names = [
            '马得福', '马喊水', '李水花', '白校长', '陈金山',
            '凌一农', '李大有', '马得宝', '白麦苗', '水旺'
        ];
        
        names.forEach((name, index) => {
            const villager = new VillagerComponent({
                id: `villager_${index}`,
                name,
                type: index < 2 ? VillagerType.Cadre : 
                      index < 4 ? VillagerType.Skilled : VillagerType.Normal,
                attributes: {
                    age: 25 + Math * 30),
                    health:.floor(Math.random() 70 + Math.floor(Math.random() * 30),
                    satisfaction: 40 + Math.floor(Math.random() * 20),
                    skill: 1 + Math.floor(Math.random() * 2),
                    workEfficiency: 90 + Math.floor(Math.random() * 20),
                },
                currentWork: WorkType.Farming,
            });
            
            population.addVillager(villager);
        });
        
        console.log(`[PopulationSystem] 初始人口: ${population.totalPopulation}`);
    }
    
    update() {
        // 每日人口更新
    }
    
    /**
     * 分配工作
     */
    assignWork(villagerId: string, work: WorkType): boolean {
        const population = this.getOrCreatePopulation();
        const villager = population.villagers.find(v => v.id === villagerId);
        
        if (villager) {
            villager.assignWork(work);
            return true;
        }
        return false;
    }
    
    /**
     * 批量分配工作
     */
    batchAssignWork(villagerIds: string[], work: WorkType): number {
        let assigned = 0;
        for (const id of villagerIds) {
            if (this.assignWork(id, work)) assigned++;
        }
        return assigned;
    }
    
    /**
     * 获得人口统计
     */
    getStatistics() {
        const population = this.getOrCreatePopulation();
        return {
            total: population.totalPopulation,
            working: population.workingPopulation,
            idle: population.idlePopulation,
            averageSatisfaction: population.getAverageSatisfaction(),
        };
    }
}
```

---

## 验证机制

### 自动化测试
```typescript
describe('PopulationSystem', () => {
    test('初始化人口正确', () => {
        const population = new PopulationComponent({});
        expect(population.totalPopulation).toBe(0);
    });
    
    test('添加和移除村民', () => {
        const population = new PopulationComponent({});
        const villager = new VillagerComponent({
            id: 'test_1',
            name: '测试村民',
            type: VillagerType.Normal,
            attributes: { age: 30, health: 80, satisfaction: 50, skill: 1, workEfficiency: 100 },
            currentWork: WorkType.Idle,
        });
        
        population.addVillager(villager);
        expect(population.totalPopulation).toBe(1);
        
        population.removeVillager('test_1');
        expect(population.totalPopulation).toBe(0);
    });
});
```

### 手动验证
```javascript
const population = world.findComponents(PopulationComponent)[0];
console.log('总人口:', population.totalPopulation);
console.log('劳动力:', population.getAvailableLabor());
console.log('平均满意度:', population.getAverageSatisfaction());
```

---

## 预计工时

4-5小时
