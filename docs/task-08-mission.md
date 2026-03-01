# 任务8: 任务系统

## 任务目标

实现任务系统，包括主线任务、支线任务、任务链和任务奖励机制。

## 依赖关系

- **前置依赖**: Task 1-7 (所有基础系统)
- **后续依赖**: Task 9, 10, 11, 12

## 实现内容

### 8.1 任务类型定义

创建 `src/games/data/MissionTypes.ts`:

```typescript
/**
 * 任务类型
 */
export enum MissionType {
    Main = 'main',           // 主线任务
    Side = 'side',          // 支线任务
    Daily = 'daily',        // 每日任务
    Event = 'event',        // 事件任务
}

/**
 * 任务状态
 */
export enum MissionStatus {
    Locked = 'locked',      // 未解锁
    Available = 'available',// 可接取
    InProgress = 'in_progress',  // 进行中
    Completed = 'completed',    // 已完成
    Failed = 'failed',      // 失败
}

/**
 * 任务目标类型
 */
export enum MissionTargetType {
    Build = 'build',        // 建造建筑
    Collect = 'collect',    // 收集资源
    Reach = 'reach',       // 达到指标
    Unlock = 'unlock',     // 解锁功能
    Talk = 'talk',         // 对话
    Survive = 'survive',   // 生存天数
}

/**
 * 任务目标
 */
export interface MissionTarget {
    type: MissionTargetType;
    targetId?: string;     // 目标ID (如建筑类型)
    current: number;       // 当前进度
    required: number;      // 目标数量
}

/**
 * 任务配置
 */
export interface MissionConfig {
    id: string;
    type: MissionType;
    title: string;
    description: string;
    
    // 解锁条件
    unlockYear: number;   // 解锁年份
    prerequisiteMissions: string[];  // 前置任务
    
    // 目标
    targets: MissionTarget[];
    
    // 奖励
    rewards: {
        money?: number;
        food?: number;
        tech?: number;
        trust?: number;
        items?: string[];
    };
    
    // 时间限制
    timeLimit?: number;    // 天数限制 (-1 表示无限制)
    
    // 剧情
    storyText?: string;    // 剧情文本
}
```

### 8.2 主线任务链

创建 `src/games/data/Missions.ts`:

```typescript
import { MissionConfig, MissionType, MissionTargetType } from './MissionTypes';

export const MainMissions: MissionConfig[] = [
    // 第一章: 逃离西海固
    {
        id: 'main_01_migration',
        type: MissionType.Main,
        title: '吊庄移民',
        description: '说服首批村民从西海固搬迁到金滩村',
        unlockYear: 1991,
        prerequisiteMissions: [],
        targets: [
            { type: MissionTargetType.Reach, targetId: 'population', current: 0, required: 10 },
        ],
        rewards: { money: 500, food: 200 },
        timeLimit: 180,
        storyText: '这里是西海固，自古以来就是最贫困的地区之一...',
    },
    
    {
        id: 'main_02_electricity',
        type: MissionType.Main,
        title: '通电工程',
        description: '争取为金滩村通电',
        unlockYear: 1991,
        prerequisiteMissions: ['main_01_migration'],
        targets: [
            { type: MissionTargetType.Build, targetId: 'power', current: 0, required: 1 },
        ],
        rewards: { money: 300, trust: 10 },
        timeLimit: 365,
    },
    
    // 第二章: 干沙滩上建家园
    {
        id: 'main_03_mushroom',
        type: MissionType.Main,
        title: '双孢菇种植',
        description: '在福建专家指导下学习蘑菇种植',
        unlockYear: 1996,
        prerequisiteMissions: ['main_02_electricity'],
        targets: [
            { type: MissionTargetType.Build, targetId: 'mushroom_shed', current: 0, required: 3 },
            { type: MissionTargetType.Collect, targetId: 'mushroom', current: 0, required: 100 },
        ],
        rewards: { money: 1000, tech: 50 },
    },
    
    // 第三章: 走向富裕
    {
        id: 'main_04_labor',
        type: MissionType.Main,
        title: '劳务输出',
        description: '组织村民赴福建打工',
        unlockYear: 1997,
        prerequisiteMissions: ['main_03_mushroom'],
        targets: [
            { type: MissionTargetType.Reach, targetId: 'labor_export', current: 0, required: 20 },
        ],
        rewards: { money: 2000, trust: 20 },
    },
    
    {
        id: 'main_05_water',
        type: MissionType.Main,
        title: '扬水工程',
        description: '建设三级扬水站，解决用水问题',
        unlockYear: 1998,
        prerequisiteMissions: ['main_04_labor'],
        targets: [
            { type: MissionTargetType.Build, targetId: 'water_station', current: 0, required: 1 },
        ],
        rewards: { money: 1500 },
    },
    
    // 第四章: 新时代
    {
        id: 'main_06_town',
        type: MissionType.Main,
        title: '闽宁镇成立',
        description: '将金滩村建设成为闽宁镇',
        unlockYear: 2000,
        prerequisiteMissions: ['main_05_water'],
        targets: [
            { type: MissionTargetType.Reach, targetId: 'population', current: 0, required: 100 },
            { type: MissionTargetType.Build, targetId: 'government', current: 0, required: 1 },
        ],
        rewards: { money: 5000 },
    },
];
```

### 8.3 任务系统

创建 `src/games/system/mission/MissionSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { MissionConfig, MissionStatus, MissionType } from '../../data/MissionTypes';
import { MainMissions } from '../../data/Missions';

interface MissionInstance {
    config: MissionConfig;
    status: MissionStatus;
    progress: number;  // 0-100
}

export class MissionSystem extends System {
    private missions: Map<string, MissionInstance> = new Map();
    private currentMission?: MissionInstance;
    
    constructor(props: SystemProps) {
        super(props);
    }
    
    start() {
        console.log('[MissionSystem] 任务系统启动');
        this.initializeMissions();
    }
    
    private initializeMissions() {
        // 加载主线任务
        MainMissions.forEach(config => {
            this.missions.set(config.id, {
                config,
                status: MissionStatus.Locked,
                progress: 0,
            });
        });
        
        // 解锁首批任务
        this.checkMissionUnlocks(1991);
    }
    
    /**
     * 检查任务解锁
     */
    checkMissionUnlocks(year: number) {
        this.missions.forEach((instance, id) => {
            if (instance.status === MissionStatus.Locked) {
                if (this.canUnlock(instance.config, year)) {
                    instance.status = MissionStatus.Available;
                    console.log(`[MissionSystem] 任务解锁: ${instance.config.title}`);
                }
            }
        });
    }
    
    /**
     * 检查是否可以解锁任务
     */
    private canUnlock(config: MissionConfig, year: number): boolean {
        if (year < config.unlockYear) return false;
        
        // 检查前置任务
        for (const prereqId of config.prerequisiteMissions) {
            const prereq = this.missions.get(prereqId);
            if (!prereq || prereq.status !== MissionStatus.Completed) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 接受任务
     */
    acceptMission(missionId: string): boolean {
        const mission = this.missions.get(missionId);
        if (!mission || mission.status !== MissionStatus.Available) {
            return false;
        }
        
        mission.status = MissionStatus.InProgress;
        this.currentMission = mission;
        return true;
    }
    
    /**
     * 更新任务进度
     */
    updateMissionProgress(targetType: string, targetId: string, amount: number) {
        if (!this.currentMission) return;
        
        this.currentMission.config.targets.forEach(target => {
            if (target.type === targetType && target.targetId === targetId) {
                target.current += amount;
                
                // 检查是否完成
                if (target.current >= target.required) {
                    this.completeMission();
                }
            }
        });
    }
    
    /**
     * 完成任务
     */
    private completeMission() {
        if (!this.currentMission) return;
        
        this.currentMission.status = MissionStatus.Completed;
        this.currentMission.progress = 100;
        
        console.log(`[MissionSystem] 任务完成: ${this.currentMission.config.title}`);
        
        // 发放奖励
        this发放奖励(this.currentMission.config.rewards);
        
        // 检查下一任务
        this.checkMissionUnlocks(0);  // TODO: 获取当前年份
    }
    
    private发放奖励(rewards: any) {
        // TODO: 奖励发放逻辑
    }
    
    /**
     * 获取当前任务
     */
    getCurrentMission(): MissionConfig | undefined {
        return this.currentMission?.config;
    }
    
    /**
     * 获取所有任务状态
     */
    getAllMissions(): MissionInstance[] {
        return Array.from(this.missions.values());
    }
}
```

---

## 验证机制

### 自动化测试
- 测试任务解锁条件
- 测试任务完成判定

### 手动验证
- 完成任务链
- 验证奖励发放

---

## 预计工时

3-4小时
