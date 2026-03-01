# 任务9: 政策决策系统

## 任务目标

实现政策决策系统，包括政策树、决策选项、多路线选择等机制。

## 依赖关系

- **前置依赖**: Task 8 (任务系统)
- **后续依赖**: Task 10, 11, 12

## 实现内容

### 9.1 政策类型定义

创建 `src/games/data/PolicyTypes.ts`:

```typescript
/**
 * 政策类型
 */
export enum PolicyType {
    Migration = 'migration',     // 移民政策
    Industry = 'industry',      // 产业政策
    Diplomacy = 'diplomacy',    // 对外政策
    Social = 'social',          // 社会政策
    Emergency = 'emergency',    // 紧急政策
}

/**
 * 政策效果
 */
export interface PolicyEffect {
    // 指标影响
    satisfaction?: number;
    hope?: number;
    stability?: number;
    
    // 资源影响
    money?: number;
    food?: number;
    
    // 产出影响
    productionBonus?: number;   // 生产加成
    costBonus?: number;         // 成本加成
}

/**
 * 政策选项
 */
export interface PolicyOption {
    id: string;
    title: string;
    description: string;
    
    // 效果
    immediateEffect: PolicyEffect;
    longTermEffect: PolicyEffect;
    
    // 成本
    cost: number;
    
    // 风险
    risk?: number;
    riskDescription?: string;
    
    // 条件
    requires?: {
        year?: number;
        tech?: number;
        trust?: number;
    };
}
```

### 9.2 政策树

创建 `src/games/data/Policies.ts`:

```typescript
import { PolicyType, PolicyOption } from './PolicyTypes';

export const PolicyTree: Record<PolicyType, PolicyOption[]> = {
    [PolicyType.Migration]: [
        {
            id: 'migration_01',
            title: '强制搬迁',
            description: '强制村民搬迁到新地区',
            immediateEffect: { satisfaction: -20, hope: -10 },
            longTermEffect: { productionBonus: 0.2 },
            cost: 0,
            risk: 0.4,
            riskDescription: '可能导致村民逃跑',
        },
        {
            id: 'migration_02',
            title: '激励搬迁',
            description: '提供补贴鼓励搬迁',
            immediateEffect: { satisfaction: 10, money: -200 },
            longTermEffect: { productionBonus: 0.1 },
            cost: 200,
        },
        {
            id: 'migration_03',
            title: '渐进搬迁',
            description: '逐步引导村民搬迁',
            immediateEffect: { satisfaction: 5 },
            longTermEffect: { stability: 10 },
            cost: 100,
        },
    ],
    
    [PolicyType.Industry]: [
        {
            id: 'industry_01',
            title: '专注农业',
            description: '集中发展粮食生产',
            immediateEffect: { food: 100 },
            longTermEffect: { productionBonus: 0.3, hope: 10 },
            cost: 0,
            requires: { year: 1991 },
        },
        {
            id: 'industry_02',
            title: '蘑菇产业',
            description: '大力发展双孢菇种植',
            immediateEffect: {},
            longTermEffect: { productionBonus: 0.5, money: 200 },
            cost: 500,
            requires: { year: 1996, tech: 1 },
        },
        {
            id: 'industry_03',
            title: '劳务输出',
            description: '组织村民外出打工',
            immediateEffect: { stability: -5 },
            longTermEffect: { money: 500, hope: 10 },
            cost: 100,
            requires: { year: 1997, trust: 10 },
        },
    ],
    
    [PolicyType.Diplomacy]: [
        {
            id: 'diplomacy_01',
            title: '福建合作',
            description: '加强与福建的对口协作',
            immediateEffect: { trust: 20 },
            longTermEffect: { productionBonus: 0.2 },
            cost: 0,
            requires: { year: 1996 },
        },
        {
            id: 'diplomacy_02',
            title: '政府支持',
            description: '争取更多政策支持',
            immediateEffect: { money: 300 },
            longTermEffect: { stability: 15 },
            cost: 0,
            requires: { year: 1995 },
        },
    ],
    
    [PolicyType.Social]: [
        {
            id: 'social_01',
            title: '教育优先',
            description: '优先发展教育',
            immediateEffect: { money: -100, satisfaction: 10 },
            longTermEffect: { productionBonus: 0.3, hope: 15 },
            cost: 100,
            requires: { year: 1997 },
        },
        {
            id: 'social_02',
            title: '医疗保障',
            description: '建设卫生站',
            immediateEffect: { money: -50, satisfaction: 15 },
            longTermEffect: { stability: 10 },
            cost: 50,
            requires: { year: 1996 },
        },
    ],
    
    [PolicyType.Emergency]: [],
};
```

### 9.3 政策系统

创建 `src/games/system/policy/PolicySystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { PolicyType, PolicyOption } from '../../data/PolicyTypes';
import { PolicyTree } from '../../data/Policies';

export class PolicySystem extends System {
    private availablePolicies: Map<PolicyType, PolicyOption[]> = new Map();
    private activePolicies: Set<string> = new Set();
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    start() {
        console.log('[PolicySystem] 政策系统启动');
        this.initializePolicies();
    }
    
    private initializePolicies() {
        // 加载所有政策
        Object.entries(PolicyTree).forEach(([type, options]) => {
            this.availablePolicies.set(PolicyType[type], options);
        });
    }
    
    /**
     * 获取可用政策
     */
    getAvailablePolicies(type: PolicyType): PolicyOption[] {
        const policies = this.availablePolicies.get(type) || [];
        
        // 过滤已激活的政策
        return policies.filter(p => !this.activePolicies.has(p.id));
    }
    
    /**
     * 实施政策
     */
    implementPolicy(option: PolicyOption): boolean {
        if (this.activePolicies.has(option.id)) {
            console.warn(`[PolicySystem] 政策 ${option.id} 已激活`);
            return false;
        }
        
        // 应用即时效果
        this.applyEffect(option.immediateEffect);
        
        // 记录长期效果
        this.activePolicies.add(option.id);
        
        console.log(`[PolicySystem] 政策实施: ${option.title}`);
        return true;
    }
    
    /**
     * 应用政策效果
     */
    private applyEffect(effect: any) {
        // TODO: 调用指标系统和资源系统应用效果
    }
    
    /**
     * 获取所有已激活政策
     */
    getActivePolicies(): string[] {
        return Array.from(this.activePolicies);
    }
}
```

---

## 验证机制

### 自动化测试
- 测试政策解锁条件
- 测试政策效果应用

### 手动验证
- 选择不同政策路线
- 验证效果差异

---

## 预计工时

3-4小时
