/**
 * 建筑类型定义
 */

/**
 * 建筑类型
 */
export enum BuildingType {
    // 基础设施
    Well = 'well',              // 井窖
    Road = 'road',              // 道路
    PowerStation = 'power',     // 发电站
    WaterStation = 'water',     // 扬水站

    // 生产建筑
    MushroomShed = 'mushroom_shed', // 菇棚
    FarmField = 'farm_field',       // 农田
    Barn = 'barn',                  // 粮仓

    // 居住建筑
    House = 'house',              // 民居

    // 公共建筑
    School = 'school',            // 学校
    Clinic = 'clinic',            // 卫生站
    Government = 'government',    // 村委会

    // 特殊建筑
    FujianOffice = 'fujian_office', // 福建办事处
}

/**
 * 建筑状态
 */
export enum BuildingStatus {
    UnderConstruction = 'under_construction', // 建设中
    Active = 'active',                        // 运营中
    Damaged = 'damaged',                      // 损坏
    Destroyed = 'destroyed',                  // 销毁
}

/**
 * 建筑配置
 */
export interface BuildingConfig {
    type: BuildingType;
    name: string;
    description: string;
    cost: number;
    laborCost: number;
    buildTime: number;
    maxLevel: number;
    unlockYear?: number;
    unlockTech?: number;
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
        buildTime: 3,
        maxLevel: 3,
    },
    [BuildingType.MushroomShed]: {
        type: BuildingType.MushroomShed,
        name: '菇棚',
        description: '种植双孢菇的主要设施',
        cost: 500,
        laborCost: 3,
        buildTime: 7,
        maxLevel: 5,
        unlockYear: 1996,
    },
    [BuildingType.House]: {
        type: BuildingType.House,
        name: '民居',
        description: '村民居住场所',
        cost: 200,
        laborCost: 2,
        buildTime: 5,
        maxLevel: 3,
    },
    [BuildingType.FarmField]: {
        type: BuildingType.FarmField,
        name: '农田',
        description: '种植粮食作物',
        cost: 150,
        laborCost: 2,
        buildTime: 5,
        maxLevel: 3,
    },
    [BuildingType.Barn]: {
        type: BuildingType.Barn,
        name: '粮仓',
        description: '储存粮食',
        cost: 300,
        laborCost: 1,
        buildTime: 7,
        maxLevel: 3,
    },
    [BuildingType.PowerStation]: {
        type: BuildingType.PowerStation,
        name: '发电站',
        description: '提供电力供应',
        cost: 800,
        laborCost: 2,
        buildTime: 14,
        maxLevel: 3,
        unlockYear: 1994,
    },
    [BuildingType.WaterStation]: {
        type: BuildingType.WaterStation,
        name: '扬水站',
        description: '从远处取水',
        cost: 2000,
        laborCost: 5,
        buildTime: 30,
        maxLevel: 3,
        unlockYear: 1998,
    },
    [BuildingType.School]: {
        type: BuildingType.School,
        name: '学校',
        description: '提高教育水平',
        cost: 1000,
        laborCost: 3,
        buildTime: 21,
        maxLevel: 3,
        unlockYear: 1997,
    },
    [BuildingType.Clinic]: {
        type: BuildingType.Clinic,
        name: '卫生站',
        description: '提供医疗保障',
        cost: 600,
        laborCost: 2,
        buildTime: 10,
        maxLevel: 3,
        unlockYear: 1996,
    },
    [BuildingType.Road]: {
        type: BuildingType.Road,
        name: '道路',
        description: '连接各地点',
        cost: 200,
        laborCost: 1,
        buildTime: 2,
        maxLevel: 1,
    },
    [BuildingType.Government]: {
        type: BuildingType.Government,
        name: '村委会',
        description: '村庄行政中心',
        cost: 500,
        laborCost: 2,
        buildTime: 10,
        maxLevel: 1,
    },
    [BuildingType.FujianOffice]: {
        type: BuildingType.FujianOffice,
        name: '福建办事处',
        description: '福建援宁联络处',
        cost: 800,
        laborCost: 2,
        buildTime: 14,
        maxLevel: 1,
        unlockYear: 1996,
    },
};

/**
 * 建筑类型标签
 */
export const BuildingTypeLabels: Record<BuildingType, string> = {
    [BuildingType.Well]: '井窖',
    [BuildingType.MushroomShed]: '菇棚',
    [BuildingType.House]: '民居',
    [BuildingType.FarmField]: '农田',
    [BuildingType.Barn]: '粮仓',
    [BuildingType.PowerStation]: '发电站',
    [BuildingType.WaterStation]: '扬水站',
    [BuildingType.School]: '学校',
    [BuildingType.Clinic]: '卫生站',
    [BuildingType.Road]: '道路',
    [BuildingType.Government]: '村委会',
    [BuildingType.FujianOffice]: '福建办事处',
};
