/**
 * 游戏主场景
 * 《山海情》模拟经营游戏的核心场景
 */
import { initScene, initTaskSystemList } from '../../../engine/Scene';
import { Stage } from '../../../engine/Stage';
import { SceneType } from '../../../engine/interface/Task';
import { SystemIndex } from '../../interface/Task';
import { EntityName } from '../../interface/Entity';
import { HitTestName } from '../../../engine/modules/hitTest/HitTest';
import { initGameStateEntity } from '../../entity/GameStateEntity';
import { ResourceType } from '../../data/ResourceTypes';

// 游戏系统
import { GameManagerSystem } from '../../system/game/GameManagerSystem';
import { TimeSystem } from '../../system/time/TimeSystem';
import { IndicatorSystem } from '../../system/indicator/IndicatorSystem';
import { ResourceSystem } from '../../system/resource/ResourceSystem';
import { PopulationSystem } from '../../system/population/PopulationSystem';
import { BuildingSystem } from '../../system/building/BuildingSystem';
import { MissionSystem } from '../../system/mission/MissionSystem';
import { PolicySystem } from '../../system/policy/PolicySystem';
import { EventSystem } from '../../system/event/EventSystem';
import { EndingSystem } from '../../system/ending/EndingSystem';

/**
 * 游戏主场景初始化参数
 */
export interface InitGamePlaySceneProps {
    world: Stage;
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
    difficulty?: 'easy' | 'normal' | 'hard';
}

/**
 * 初始化游戏主场景
 */
export function initGamePlayScene(props: InitGamePlaySceneProps) {
    const { world, canvas, mask, difficulty = 'normal' } = props;

    // 创建游戏状态实体，将核心组件注册到 ECS
    initGameStateEntity({ world });

    // 创建所有游戏系统
    const gameManagerSystem = new GameManagerSystem({ world, difficulty });
    const timeSystem = new TimeSystem({ world });
    const indicatorSystem = new IndicatorSystem({ world });
    const resourceSystem = new ResourceSystem({ world });
    const populationSystem = new PopulationSystem({ world });
    const buildingSystem = new BuildingSystem({ world });
    const missionSystem = new MissionSystem({ world });
    const policySystem = new PolicySystem({ world });
    const eventSystem = new EventSystem({ world });
    const endingSystem = new EndingSystem({ world });

    // 注册系统间通信：时间系统驱动其他系统的每日/每月/每年更新
    timeSystem.onDayChange(() => {
        // 通知 GameManager 更新时间
        gameManagerSystem.updateTime(
            timeSystem.getYear(),
            timeSystem.getMonth(),
            timeSystem.getDay()
        );
        // 每日更新各系统
        indicatorSystem.dailyUpdate();
        populationSystem.dailyUpdate();
        missionSystem.dailyUpdate();
        // 更新建筑建造进度
        buildingSystem.dailyUpdate();
        // 每日资源消耗（人口吃饭）
        const stats = populationSystem.getStatistics();
        resourceSystem.consumeFood(stats.total);
        // 通知 UI 更新
        world.emit('game:dayChange');
    });

    timeSystem.onMonthChange(() => {
        // 每月检查随机事件
        const stats = populationSystem.getStatistics();
        const money = resourceSystem.getAmount(ResourceType.Money);
        eventSystem.checkEventTrigger(
            timeSystem.getYear(),
            timeSystem.getMonth(),
            stats.total,
            money
        );
        // 每月检查结局
        const indicators = indicatorSystem.getIndicators();
        const buildings = buildingSystem.getAllBuildings().map(b => b.type);
        endingSystem.checkEnding(
            timeSystem.getYear(),
            indicators.satisfaction,
            indicators.hope,
            stats.total,
            indicators.money,
            buildings,
            []
        );
        // 通知 UI 更新
        world.emit('game:monthChange');
    });

    timeSystem.onYearChange(() => {
        // 每年检查任务解锁
        missionSystem.checkMissionUnlocks(timeSystem.getYear());
        world.emit('game:yearChange');
    });

    // 游戏核心系统列表
    const systemList = initTaskSystemList({
        world,
        systemList: [
            // 游戏核心系统 - 按优先级排序
            { system: gameManagerSystem, systemIndex: SystemIndex.GameManagerSystem },
            { system: timeSystem, systemIndex: SystemIndex.TimeSystem },
            { system: indicatorSystem, systemIndex: SystemIndex.IndicatorSystem },
            { system: resourceSystem, systemIndex: SystemIndex.ResourceSystem },
            { system: populationSystem, systemIndex: SystemIndex.PopulationSystem },
            { system: buildingSystem, systemIndex: SystemIndex.BuildingSystem },
            { system: missionSystem, systemIndex: SystemIndex.MissionSystem },
            { system: policySystem, systemIndex: SystemIndex.PolicySystem },
            { system: eventSystem, systemIndex: SystemIndex.GameEventSystem },
            { system: endingSystem, systemIndex: SystemIndex.EndingSystem },
        ],
        canvas,
        mask,
        sceneType: SceneType.GamePlay,
        hitTestOptions: {
            extendHitTestGroup: {
                [HitTestName.Pointer]: EntityName.GameBackground,
            }
        }
    });

    // 初始化场景
    const taskFlow = initScene({
        world,
        systemList,
        name: 'gamePlay',
    });

    // 启动游戏循环
    taskFlow.run();

    // 打印系统启动摘要
    console.log('%c[Scene] 游戏主场景初始化完成', 'color: #4caf50; font-weight: bold;');
    console.log(`%c  └── 难度: ${  difficulty}`, 'color: #2196f3;');
    console.log('%c  └── 年份: 1991年', 'color: #2196f3;');
    console.log('%c  └── 人口: 10人', 'color: #2196f3;');

    return taskFlow;
}

/**
 * 切换到游戏主场景
 */
export function switchToGamePlayScene(
    world: Stage,
    canvas: HTMLCanvasElement,
    mask: HTMLDivElement,
    difficulty?: 'easy' | 'normal' | 'hard'
) {
    return initGamePlayScene({ world, canvas, mask, difficulty });
}

/**
 * 退出游戏主场景
 */
export function exitGamePlayScene(world: Stage) {
    console.log('[Scene] 退出游戏主场景');
}
