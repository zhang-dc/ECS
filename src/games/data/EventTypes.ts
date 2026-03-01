/**
 * 随机事件类型定义
 */

export enum EventType {
    Sandstorm = 'sandstorm',
    Drought = 'drought',
    Escape = 'escape',
    Merchant = 'merchant',
    Newcomer = 'newcomer',
    FujianGuest = 'fujian_guest',
    Government = 'government',
    Festival = 'festival',
}

export interface EventImpact {
    satisfaction?: number;
    hope?: number;
    stability?: number;
    hunger?: number;
    money?: number;
    food?: number;
    populationChange?: number;
    buildingDamage?: string[];
    special?: string;
}

export interface EventChoice {
    id: string;
    title: string;
    effect: EventImpact;
}

export interface EventConfig {
    id: string;
    type: EventType;
    title: string;
    description: string;
    triggerYear: number;
    triggerMonth?: number;
    probability: number;
    conditions?: { minPopulation?: number; minMoney?: number };
    impact: EventImpact;
    choices?: EventChoice[];
    storyText?: string;
}

export const RandomEvents: EventConfig[] = [
    {
        id: 'event_sandstorm',
        type: EventType.Sandstorm,
        title: '沙尘暴来袭',
        description: '一场严重的沙尘暴席卷而来',
        triggerYear: 1991,
        probability: 0.1,
        conditions: { minPopulation: 5 },
        impact: { food: -50, satisfaction: -10 },
        storyText: '漫天的黄沙让人睁不开眼...',
    },
    {
        id: 'event_drought',
        type: EventType.Drought,
        title: '持续干旱',
        description: '长时间没有降雨，井窖干涸',
        triggerYear: 1992,
        probability: 0.15,
        impact: { food: -30, hunger: -20, satisfaction: -15 },
    },
    {
        id: 'event_escape',
        type: EventType.Escape,
        title: '村民逃跑',
        description: '有村民不堪艰苦环境，决定逃回原籍',
        triggerYear: 1991,
        probability: 0.2,
        conditions: { minPopulation: 8 },
        impact: { populationChange: -1, satisfaction: -10, hope: -5 },
        choices: [
            { id: 'choice_1', title: '劝说挽留', effect: { satisfaction: 5, money: -50 } },
            { id: 'choice_2', title: '放任离开', effect: { populationChange: -1 } },
        ],
    },
    {
        id: 'event_merchant',
        type: EventType.Merchant,
        title: '蘑菇商人',
        description: '商人来收购蘑菇',
        triggerYear: 1996,
        probability: 0.25,
        conditions: { minPopulation: 10 },
        impact: { money: 200 },
        choices: [
            { id: 'sell_normal', title: '正常出售', effect: { money: 100 } },
            { id: 'sell_high', title: '囤积居奇', effect: { money: 200 } },
        ],
    },
    {
        id: 'event_fujian_expert',
        type: EventType.FujianGuest,
        title: '福建专家到达',
        description: '福建派来了农业专家',
        triggerYear: 1996,
        probability: 0.5,
        impact: { hope: 15, satisfaction: 10 },
        storyText: '凌一农教授带着菌草技术来到了金滩村...',
    },
    {
        id: 'event_fujian_visit',
        type: EventType.FujianGuest,
        title: '福建领导考察',
        description: '福建省领导来考察对口帮扶工作',
        triggerYear: 1998,
        probability: 0.3,
        impact: { money: 500, satisfaction: 10 },
    },
    {
        id: 'event_spring',
        type: EventType.Festival,
        title: '春节',
        description: '新春佳节，村里举办庆祝活动',
        triggerYear: 1992,
        triggerMonth: 1,
        probability: 1.0,
        impact: { satisfaction: 15, hope: 10, food: -20 },
    },
];
