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
