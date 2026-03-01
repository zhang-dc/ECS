/**
 * 任务类型定义
 */

export enum MissionType {
    Main = 'main',
    Side = 'side',
    Daily = 'daily',
}

export enum MissionStatus {
    Locked = 'locked',
    Available = 'available',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed',
}

export enum MissionTargetType {
    Build = 'build',
    Collect = 'collect',
    Reach = 'reach',
    Unlock = 'unlock',
}

export interface MissionTarget {
    type: MissionTargetType;
    targetId?: string;
    current: number;
    required: number;
}

export interface MissionConfig {
    id: string;
    type: MissionType;
    title: string;
    description: string;
    unlockYear: number;
    prerequisiteMissions: string[];
    targets: MissionTarget[];
    rewards: { money?: number; food?: number; tech?: number; trust?: number };
    timeLimit?: number;
    storyText?: string;
}

// 主线任务数据
export const MainMissions: MissionConfig[] = [
    {
        id: 'main_01_migration',
        type: MissionType.Main,
        title: '吊庄移民',
        description: '说服首批村民从西海固搬迁到金滩村',
        unlockYear: 1991,
        prerequisiteMissions: [],
        targets: [{ type: MissionTargetType.Reach, targetId: 'population', current: 0, required: 10 }],
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
        targets: [{ type: MissionTargetType.Build, targetId: 'power', current: 0, required: 1 }],
        rewards: { money: 300, trust: 10 },
        timeLimit: 365,
    },
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
    {
        id: 'main_04_labor',
        type: MissionType.Main,
        title: '劳务输出',
        description: '组织村民赴福建打工',
        unlockYear: 1997,
        prerequisiteMissions: ['main_03_mushroom'],
        targets: [{ type: MissionTargetType.Reach, targetId: 'labor_export', current: 0, required: 20 }],
        rewards: { money: 2000, trust: 20 },
    },
    {
        id: 'main_05_water',
        type: MissionType.Main,
        title: '扬水工程',
        description: '建设三级扬水站，解决用水问题',
        unlockYear: 1998,
        prerequisiteMissions: ['main_04_labor'],
        targets: [{ type: MissionTargetType.Build, targetId: 'water_station', current: 0, required: 1 }],
        rewards: { money: 1500 },
    },
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
