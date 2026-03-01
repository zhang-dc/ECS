/**
 * 资源类型定义
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';

/**
 * 资源类型枚举
 */
export enum ResourceType {
    // 基础资源
    Money = 'money',           // 金钱
    Food = 'food',             // 粮食
    Wood = 'wood',             // 木材
    Stone = 'stone',           // 石头
    Water = 'water',           // 水

    // 生产资源
    Mushroom = 'mushroom',     // 蘑菇
    Grass = 'grass',           // 菌草
    Labor = 'labor',           // 劳动力

    // 特殊资源
    Tech = 'tech',             // 技术点
    Trust = 'trust',           // 信任度 (与福建的关系)
    Power = 'power',           // 电力
}

/**
 * 资源条目
 */
export interface ResourceEntry {
    type: ResourceType;
    amount: number;
    maxStorage?: number;       // 最大存储量
    productionRate?: number;   // 生产速率
    dailyChange?: number;      // 每日变化量
}

/**
 * 资源变动记录
 */
export interface ResourceChange {
    type: ResourceType;
    amount: number;
    reason: string;
    timestamp: number;
}

/**
 * 资源类型标签映射
 */
export const ResourceLabels: Record<ResourceType, string> = {
    [ResourceType.Money]: '资金',
    [ResourceType.Food]: '粮食',
    [ResourceType.Wood]: '木材',
    [ResourceType.Stone]: '石头',
    [ResourceType.Water]: '水',
    [ResourceType.Mushroom]: '蘑菇',
    [ResourceType.Grass]: '菌草',
    [ResourceType.Labor]: '劳动力',
    [ResourceType.Tech]: '技术点',
    [ResourceType.Trust]: '信任度',
    [ResourceType.Power]: '电力',
};
