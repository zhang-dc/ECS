/**
 * 游戏模块导出
 * 《山海情》模拟经营游戏
 */

// 数据层
export * from './data/GameConfig';
export * from './data/ResourceTypes';
export * from './data/VillagerTypes';
export * from './data/BuildingTypes';
export * from './data/IndustryTypes';
export * from './data/MissionTypes';
export * from './data/PolicyTypes';
export * from './data/EventTypes';
export * from './data/EndingTypes';

// 组件层
export * from './components/IndicatorComponent';
export * from './components/ResourceComponent';
export * from './components/TimeComponent';
export * from './components/VillagerComponent';
export * from './components/PopulationComponent';
export * from './components/BuildingComponent';

// 系统层
export * from './system/index';

// 场景
export * from './scene/gamePlay/scene';

// 接口
export * from './interface/Entity';
export * from './interface/Task';

// UI层
export * from './ui/index';
