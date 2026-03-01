/**
 * 游戏配置数据
 * 包含游戏阶段、时间设置、平衡参数等
 */

// ==================== 游戏阶段 ====================

/**
 * 游戏阶段枚举
 */
export enum GamePhase {
    Init = 'init',
    Migration = 'migration',      // 移民阶段
    Foundation = 'foundation',    // 建设阶段
    Development = 'development',  // 发展阶段
    Prosperity = 'prosperity',   // 繁荣阶段
    Ending = 'ending',           // 结局阶段
}

/**
 * 游戏阶段配置
 */
export const GamePhaseConfig: Record<GamePhase, { name: string; description: string; startYear: number }> = {
    [GamePhase.Init]: {
        name: '初始化',
        description: '游戏初始化',
        startYear: 1991,
    },
    [GamePhase.Migration]: {
        name: '吊庄移民',
        description: '说服村民从西海固搬迁到金滩村',
        startYear: 1991,
    },
    [GamePhase.Foundation]: {
        name: '基础建设',
        description: '建设基础设施，通电、修建水利',
        startYear: 1993,
    },
    [GamePhase.Development]: {
        name: '产业发展',
        description: '发展双孢菇种植、劳务输出',
        startYear: 1996,
    },
    [GamePhase.Prosperity]: {
        name: '繁荣发展',
        description: '多元化发展，建设闽宁镇',
        startYear: 2000,
    },
    [GamePhase.Ending]: {
        name: '结局',
        description: '游戏结局',
        startYear: 2005,
    },
};

// ==================== 游戏状态 ====================

/**
 * 游戏状态接口
 */
export interface GameState {
    year: number;
    month: number;
    day: number;
    phase: GamePhase;
    isPaused: boolean;
    isGameOver: boolean;
    playTime: number;  // 游玩时长(秒)
}

// ==================== 时间配置 ====================

/**
 * 时间配置
 */
export const TimeConfig = {
    // 时间速度
    ticksPerDay: 10,           // 每天多少tick (帧)
    baseDaysPerMonth: 30,      // 每月多少天
    baseMonthsPerYear: 12,     // 每年多少月

    // 游戏内时间流速 (可由玩家调整)
    speedMultiplier: 1,        // 1x, 2x, 4x, 8x

    // 季节设置
    seasons: [
        { name: '春季', monthStart: 3, tempModifier: 0 },
        { name: '夏季', monthStart: 6, tempModifier: 20 },
        { name: '秋季', monthStart: 9, tempModifier: 5 },
        { name: '冬季', monthStart: 12, tempModifier: -30 },
    ],

    // 游戏开始时间
    startYear: 1991,
    startMonth: 1,
    startDay: 1,
};

/**
 * 季节类型
 */
export enum Season {
    Spring = 'spring',
    Summer = 'summer',
    Autumn = 'autumn',
    Winter = 'winter',
}

// ==================== 游戏配置 ====================

/**
 * 游戏配置
 */
export const GameConfig = {
    // 时间设置
    ticksPerDay: TimeConfig.ticksPerDay,
    daysPerMonth: TimeConfig.baseDaysPerMonth,
    monthsPerYear: TimeConfig.baseMonthsPerYear,

    // 游戏开始时间
    startYear: TimeConfig.startYear,
    startMonth: TimeConfig.startMonth,
    startDay: TimeConfig.startDay,

    // 游戏平衡 - 初始资源
    initialMoney: 1000,
    initialFood: 500,
    initialWood: 0,
    initialStone: 0,
    initialPopulation: 10,

    // 难度设置
    difficulty: 'normal',
};

// ==================== 难度配置 ====================

/**
 * 难度配置
 */
export const DifficultySettings = {
    easy: {
        name: '简单',
        resourceMultiplier: 1.5,
        disasterChance: 0.5,
        satisfactionLoss: 0.7,
        eventReward: 1.3,
    },

    normal: {
        name: '普通',
        resourceMultiplier: 1.0,
        disasterChance: 1.0,
        satisfactionLoss: 1.0,
        eventReward: 1.0,
    },

    hard: {
        name: '困难',
        resourceMultiplier: 0.7,
        disasterChance: 1.5,
        satisfactionLoss: 1.3,
        eventReward: 0.8,
    },
};
