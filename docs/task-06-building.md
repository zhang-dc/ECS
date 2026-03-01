# 任务6: 建筑系统

## 任务目标

实现建筑系统，包括建筑类型、建造、升级、产出等机制。

## 依赖关系

- **前置依赖**: Task 3 (基础资源系统), Task 5 (人口管理系统)
- **后续依赖**: Task 7, 11

## 实现内容

### 6.1 建筑类型定义

创建 `src/games/data/BuildingTypes.ts`:

```typescript
/**
 * 建筑类型
 */
export enum BuildingType {
    // 基础设施
    Well = 'well',            // 井窖
    Road = 'road',            // 道路
    PowerStation = 'power',   // 发电站
    WaterStation = 'water',   // 扬水站
    
    // 生产建筑
    MushroomShed = 'mushroom_shed',  // 菇棚
    FarmField = 'farm_field',        // 农田
    Barn = 'barn',                   // 粮仓
    
    // 居住建筑
    House = 'house',         // 民居
    
    // 公共建筑
    School = 'school',       // 学校
    Clinic = 'clinic',       // 卫生站
    Government = 'government', // 村委会
    
    // 特殊建筑
    FujianOffice = 'fujian_office',  // 福建办事处
}

/**
 * 建筑状态
 */
export enum BuildingStatus {
    UnderConstruction = 'under_construction',  // 建设中
    Active = 'active',                          // 运营中
    Damaged = 'damaged',                       // 损坏
    Destroyed = 'destroyed',                    // 销毁
}

/**
 * 建筑配置
 */
export interface BuildingConfig {
    type: BuildingType;
    name: string;
    description: string;
    
    // 成本
    cost: number;           // 建造成本 (金钱)
    laborCost: number;      // 人力成本
    materialCost: { type: string; amount: number }[];
    
    // 产出
    output: { type: string; amount: number }[];
    capacity: number;       // 容量 (如可容纳人口)
    
    // 时间
    buildTime: number;      // 建造时间 (天)
    
    // 等级
    maxLevel: number;       // 最大等级
    upgradeCost: number;    // 升级成本系数
    
    // 解锁条件
    unlockYear?: number;    // 解锁年份
    unlockTech?: number;    // 解锁技术等级
    prerequisite?: BuildingType[];  // 前置建筑
}

/**
 * 建筑配置数据
 */
export const BuildingConfigs: Record<BuildingType, BuildingConfig> = {
    [BuildingType.Well]: {
        type: BuildingType.Well,
        name: '井窖',
        description: '储存雨水，解决饮水问题',
        cost: 100,
        laborCost: 2,
        materialCost: [],
        output: [{ type: 'water', amount: 5 }],
        capacity: 0,
        buildTime: 3,
        maxLevel: 3,
        upgradeCost: 1.5,
    },
    
    [BuildingType.MushroomShed]: {
        type: BuildingType.MushroomShed,
        name: '菇棚',
        description: '种植双孢菇的主要设施',
        cost: 500,
        laborCost: 3,
        materialCost: [{ type: 'wood', amount: 20 }],
        output: [{ type: 'mushroom', amount: 30 }],
        capacity: 0,
        buildTime: 7,
        maxLevel: 5,
        upgradeCost: 2,
        unlockYear: 1996,
        unlockTech: 1,
    },
    
    [BuildingType.House]: {
        type: BuildingType.House,
        name: '民居',
        description: '村民居住场所',
        cost: 200,
        laborCost: 2,
        materialCost: [{ type: 'wood', amount: 10 }],
        output: [],
        capacity: 4,
        buildTime: 5,
        maxLevel: 3,
        upgradeCost: 1.5,
    },
    
    [BuildingType.FarmField]: {
        type: BuildingType.FarmField,
        name: '农田',
        description: '种植粮食作物',
        cost: 150,
        laborCost: 2,
        materialCost: [],
        output: [{ type: 'food', amount: 20 }],
        capacity: 0,
        buildTime: 5,
        maxLevel: 3,
        upgradeCost: 1.5,
    },
    
    [BuildingType.Barn]: {
        type: BuildingType.Barn,
        name: '粮仓',
        description: '储存粮食',
        cost: 300,
        laborCost: 1,
        materialCost: [{ type: 'wood', amount: 30 }],
        output: [],
        capacity: 500,
        buildTime: 7,
        maxLevel: 3,
        upgradeCost: 2,
    },
    
    [BuildingType.PowerStation]: {
        type: BuildingType.PowerStation,
        name: '发电站',
        description: '提供电力供应',
        cost: 800,
        laborCost: 2,
        materialCost: [{ type: 'stone', amount: 50 }],
        output: [{ type: 'power', amount: 100 }],
        capacity: 0,
        buildTime: 14,
        maxLevel: 3,
        upgradeCost: 2,
        unlockYear: 1994,
    },
    
    [BuildingType.WaterStation]: {
        type: BuildingType.WaterStation,
        name: '扬水站',
        description: '从远处取水',
        cost: 2000,
        laborCost: 5,
        materialCost: [{ type: 'stone', amount: 100 }],
        output: [{ type: 'water', amount: 50 }],
        capacity: 0,
        buildTime: 30,
        maxLevel: 3,
        upgradeCost: 2.5,
        unlockYear: 1998,
    },
    
    [BuildingType.School]: {
        type: BuildingType.School,
        name: '学校',
        description: '提高教育水平',
        cost: 1000,
        laborCost: 3,
        materialCost: [{ type: 'stone', amount: 30 }],
        output: [{ type: 'education', amount: 10 }],
        capacity: 30,
        buildTime: 21,
        maxLevel: 3,
        upgradeCost: 2,
        unlockYear: 1997,
    },
    
    [BuildingType.Clinic]: {
        type: BuildingType.Clinic,
        name: '卫生站',
        description: '提供医疗保障',
        cost: 600,
        laborCost: 2,
        materialCost: [{ type: 'wood', amount: 20 }],
        output: [{ type: 'health', amount: 15 }],
        capacity: 0,
        buildTime: 10,
        maxLevel: 3,
        upgradeCost: 1.5,
        unlockYear: 1996,
    },
    
    [BuildingType.Road]: {
        type: BuildingType.Road,
        name: '道路',
        description: '连接各地点',
        cost: 200,
        laborCost: 1,
        materialCost: [{ type: 'stone', amount: 10 }],
        output: [],
        capacity: 0,
        buildTime: 2,
        maxLevel: 1,
        upgradeCost: 1,
    },
    
    [BuildingType.Government]: {
        type: BuildingType.Government,
        name: '村委会',
        description: '村庄行政中心',
        cost: 500,
        laborCost: 2,
        materialCost: [{ type: 'stone', amount: 20 }],
        output: [],
        capacity: 10,
        buildTime: 10,
        maxLevel: 1,
        upgradeCost: 2,
    },
    
    [BuildingType.FujianOffice]: {
        type: BuildingType.FujianOffice,
        name: '福建办事处',
        description: '福建援宁联络处',
        cost: 800,
        laborCost: 2,
        materialCost: [{ type: 'stone', amount: 30 }],
        output: [{ type: 'trust', amount: 5 }],
        capacity: 5,
        buildTime: 14,
        maxLevel: 1,
        upgradeCost: 2,
        unlockYear: 1996,
    },
};
```

### 6.2 建筑组件

创建 `src/games/components/BuildingComponent.ts`:

```typescript
import { BaseComponent, BaseComponentProps } from '../../../engine/Component';
import { BuildingType, BuildingStatus, BuildingConfig } from '../data/BuildingTypes';

export interface BuildingData extends BaseComponentProps {
    id: string;
    type: BuildingType;
    level: number;
    status: BuildingStatus;
    position: { x: number; y: number };
    buildProgress: number;   // 建造进度 0-100
    workers: string[];      // 工作的村民ID
}

export class BuildingComponent extends BaseComponent {
    id: string;
    type: BuildingType;
    level: number = 1;
    status: BuildingStatus = BuildingStatus.UnderConstruction;
    position: { x: number; y: number };
    buildProgress: number = 0;
    workers: string[] = [];
    
    // 运行时数据
    dailyOutput: number = 0;
    
    constructor(props: BuildingData) {
        super(props);
        
        this.id = props.id;
        this.type = props.type;
        this.level = props.level || 1;
        this.status = props.status || BuildingStatus.UnderConstruction;
        this.position = props.position || { x: 0, y: 0 };
        this.buildProgress = props.buildProgress || 0;
        this.workers = props.workers || [];
    }
    
    /**
     * 获取配置
     */
    getConfig(): BuildingConfig {
        // TODO: 从配置中获取
        return {} as BuildingConfig;
    }
    
    /**
     * 开始运营
     */
    activate() {
        this.status = BuildingStatus.Active;
    }
    
    /**
     * 升级
     */
    upgrade(): boolean {
        const config = this.getConfig();
        if (this.level >= config.maxLevel) return false;
        
        this.level++;
        return true;
    }
    
    /**
     * 损坏
     */
    damage() {
        if (this.status === BuildingStatus.Active) {
            this.status = BuildingStatus.Damaged;
        }
    }
    
    /**
     * 修复
     */
    repair() {
        this.status = BuildingStatus.Active;
    }
}
```

### 6.3 建筑系统

创建 `src/games/system/building/BuildingSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { BuildingComponent } from '../../components/BuildingComponent';
import { BuildingType, BuildingStatus, BuildingConfigs } from '../../data/BuildingTypes';

export class BuildingSystem extends System {
    private buildings: Map<string, BuildingComponent> = new Map();
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    start() {
        console.log('[BuildingSystem] 建筑系统启动');
    }
    
    update() {
        // 1. 更新建造进度
        // 2. 计算产出
        // 3. 检查损坏
    }
    
    /**
     * 建造建筑
     */
    construct(
        type: BuildingType,
        position: { x: number; y: number },
        cost: number
    ): BuildingComponent | null {
        const config = BuildingConfigs[type];
        if (!config) {
            console.error(`[BuildingSystem] 未知的建筑类型: ${type}`);
            return null;
        }
        
        const building = new BuildingComponent({
            id: `building_${Date.now()}`,
            type,
            level: 1,
            status: BuildingStatus.UnderConstruction,
            position,
            buildProgress: 0,
            workers: [],
        });
        
        this.buildings.set(building.id, building);
        return building;
    }
    
    /**
     * 完成建造
     */
    completeConstruction(buildingId: string): boolean {
        const building = this.buildings.get(buildingId);
        if (!building) return false;
        
        building.buildProgress = 100;
        building.activate();
        return true;
    }
    
    /**
     * 获取所有建筑
     */
    getAllBuildings():        return Array.from BuildingComponent[] {
(this.buildings.values());
    }
    
    /**
     * 获取特定类型的建筑
     */
    getBuildingsByType(type: BuildingType): BuildingComponent[] {
        return Array.from(this.buildings.values()).filter(b => b.type === type);
    }
    
    /**
     * 获取建筑统计
     */
    getStatistics() {
        const buildings = this.getAllBuildings();
        return {
            total: buildings.length,
            active: buildings.filter(b => b.status === BuildingStatus.Active).length,
            underConstruction: buildings.filter(b => b.status === BuildingStatus.UnderConstruction).length,
            damaged: buildings.filter(b => b.status === BuildingStatus.Damaged).length,
        };
    }
}
```

---

## 验证机制

### 自动化测试
```typescript
describe('BuildingSystem', () => {
    test('建筑建造', () => {
        const system = new BuildingSystem({ world: mockWorld });
        const building = system.construct(BuildingType.Well, { x: 0, y: 0 }, 100);
        expect(building).not.toBeNull();
    });
});
```

### 手动验证
```javascript
const buildings = world.findComponents(BuildingComponent);
console.log('建筑数量:', buildings.length);
```

---

## 预计工时

4-5小时
