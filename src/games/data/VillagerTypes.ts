/**
 * 人口管理数据类型定义
 */

/**
 * 村民类型
 */
export enum VillagerType {
    Normal = 'normal',              // 普通村民
    Skilled = 'skilled',           // 技术人才
    Cadre = 'cadre',              // 干部
    Troublemaker = 'troublemaker', // 刺头/钉子户
    Elder = 'elder',              // 老人
    Child = 'child',              // 儿童
}

/**
 * 工作类型
 */
export enum WorkType {
    Idle = 'idle',                // 闲置
    Farming = 'farming',          // 农业
    Mushroom = 'mushroom',        // 蘑菇种植
    Construction = 'construction', // 建筑
    Labor = 'labor',             // 劳务输出
    Guard = 'guard',             // 治安
    Education = 'education',     // 教育
    Government = 'government',   // 行政管理
}

/**
 * 村民属性
 */
export interface VillagerAttributes {
    age: number;                  // 年龄
    health: number;               // 健康度 0-100
    satisfaction: number;        // 个人满意度 0-100
    skill: number;               // 技能等级 1-5
    workEfficiency: number;      // 工作效率 0-200%
}

/**
 * 村民类型标签
 */
export const VillagerTypeLabels: Record<VillagerType, string> = {
    [VillagerType.Normal]: '普通村民',
    [VillagerType.Skilled]: '技术人才',
    [VillagerType.Cadre]: '干部',
    [VillagerType.Troublemaker]: '刺头',
    [VillagerType.Elder]: '老人',
    [VillagerType.Child]: '儿童',
};

/**
 * 工作类型标签
 */
export const WorkTypeLabels: Record<WorkType, string> = {
    [WorkType.Idle]: '待业',
    [WorkType.Farming]: '农业',
    [WorkType.Mushroom]: '蘑菇种植',
    [WorkType.Construction]: '建筑',
    [WorkType.Labor]: '劳务输出',
    [WorkType.Guard]: '治安',
    [WorkType.Education]: '教育',
    [WorkType.Government]: '行政管理',
};
