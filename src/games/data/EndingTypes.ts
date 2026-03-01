/**
 * 结局类型定义
 */

export enum EndingType {
    Normal = 'normal',
    Model = 'model',
    MushroomKingdom = 'mushroom_kingdom',
    LaborTown = 'labor_town',
    IndustrialTown = 'industrial_town',
    Failed = 'failed',
    Abandoned = 'abandoned',
    MountainSea = 'mountain_sea',
    Pioneer = 'pioneer',
}

export interface EndingConfig {
    type: EndingType;
    title: string;
    description: string;
    conditions: {
        minYear?: number;
        maxYear?: number;
        minSatisfaction?: number;
        minHope?: number;
        minPopulation?: number;
        minMoney?: number;
        maxSatisfaction?: number;
        requiredBuildings?: string[];
        requiredIndustry?: string[];
    };
    endingText: string;
}

export const EndingConfigs: EndingConfig[] = [
    {
        type: EndingType.Normal,
        title: '平凡小镇',
        description: '闽宁镇成为了一个普通的小镇',
        conditions: { minYear: 2000, minSatisfaction: 40, minPopulation: 30 },
        endingText: '虽然没有特别的发展，但闽宁镇的人们过上了安定的生活...',
    },
    {
        type: EndingType.Model,
        title: '模范示范区',
        description: '闽宁镇成为扶贫工作的典范',
        conditions: { minSatisfaction: 80, minHope: 70, minPopulation: 50, requiredBuildings: ['school', 'clinic'] },
        endingText: '闽宁镇的脱贫经验被推广到全国，成为精准扶贫的典范...',
    },
    {
        type: EndingType.MushroomKingdom,
        title: '蘑菇王国',
        description: '双孢菇产业成为当地经济支柱',
        conditions: { requiredIndustry: ['mushroom_farming'] },
        endingText: '如今，金滩村成了远近闻名的蘑菇之乡...',
    },
    {
        type: EndingType.LaborTown,
        title: '劳务之乡',
        description: '劳务输出成为主要收入来源',
        conditions: { minPopulation: 40 },
        endingText: '越来越多的村民通过外出打工改变了命运...',
    },
    {
        type: EndingType.Failed,
        title: '村庄衰败',
        description: '村庄无法继续发展',
        conditions: { maxSatisfaction: 20 },
        endingText: '越来越多的村民选择了离开，这里又变成了荒无人烟的干沙滩...',
    },
    {
        type: EndingType.MountainSea,
        title: '山海情深',
        description: '与福建建立了深厚情谊',
        conditions: { minMoney: 5000 },
        endingText: '闽宁两地的情谊超越了山海，永远铭记在人们心中...',
    },
];
