/**
 * 产业类型定义
 */

export enum IndustryType {
    MushroomFarming = 'mushroom_farming',
    Agriculture = 'agriculture',
    LaborExport = 'labor_export',
}

export enum IndustryStatus {
    Locked = 'locked',
    Available = 'available',
    Active = 'active',
    Paused = 'paused',
}

export interface IndustryConfig {
    type: IndustryType;
    name: string;
    description: string;
    unlockYear: number;
    unlockTech: number;
    laborRequired: number;
    cycleDays: number;
    income: number;
}

export const IndustryConfigs: Record<IndustryType, IndustryConfig> = {
    [IndustryType.MushroomFarming]: {
        type: IndustryType.MushroomFarming,
        name: '双孢菇种植',
        description: '在福建专家指导下学习蘑菇种植技术',
        unlockYear: 1996,
        unlockTech: 1,
        laborRequired: 3,
        cycleDays: 15,
        income: 150,
    },
    [IndustryType.Agriculture]: {
        type: IndustryType.Agriculture,
        name: '传统农业',
        description: '种植粮食作物',
        unlockYear: 1991,
        unlockTech: 1,
        laborRequired: 5,
        cycleDays: 30,
        income: 100,
    },
    [IndustryType.LaborExport]: {
        type: IndustryType.LaborExport,
        name: '劳务输出',
        description: '组织村民赴福建打工',
        unlockYear: 1997,
        unlockTech: 1,
        laborRequired: 5,
        cycleDays: 30,
        income: 250,
    },
};

export const IndustryLabels: Record<IndustryType, string> = {
    [IndustryType.MushroomFarming]: '双孢菇种植',
    [IndustryType.Agriculture]: '传统农业',
    [IndustryType.LaborExport]: '劳务输出',
};
