/**
 * 政策类型定义
 */

export enum PolicyType {
    Migration = 'migration',
    Industry = 'industry',
    Diplomacy = 'diplomacy',
    Social = 'social',
    Emergency = 'emergency',
}

export interface PolicyEffect {
    satisfaction?: number;
    hope?: number;
    stability?: number;
    money?: number;
    food?: number;
    productionBonus?: number;
    trust?: number;
    tech?: number;
}

export interface PolicyOption {
    id: string;
    title: string;
    description: string;
    immediateEffect: PolicyEffect;
    longTermEffect: PolicyEffect;
    cost: number;
    risk?: number;
    requires?: { year?: number; tech?: number; trust?: number };
}

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
