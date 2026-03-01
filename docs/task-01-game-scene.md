# 任务1: 游戏主场景框架搭建

## 任务目标

创建游戏主场景框架，包括游戏入口、场景初始化、系统注册。

## 依赖关系

- **前置依赖**: 无
- **后续依赖**: Task 2-16

## 实现内容

### 1.1 创建游戏主场景文件

创建 `src/games/scene/gamePlay/scene.ts`:

```typescript
import { initScene, initTaskSystemList } from '../../../engine/Scene';
import { Stage } from '../../../engine/Stage';
import { SystemIndex } from '../../interface/Task';
import { EntityName } from '../../interface/Entity';
import { HitTestName } from '../../../engine/modules/hitTest/HitTest';

export interface InitGamePlaySceneProps {
    world: Stage;
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
}

export function initGamePlayScene(props: InitGamePlaySceneProps) {
    const { world, canvas, mask } = props;
    
    // 游戏核心系统列表
    const systemList = initTaskSystemList({
        world,
        systemList: [
            // TODO: 添加游戏系统
        ],
        canvas,
        mask,
        hitTestOptions: {
            extendHitTestGroup: {
                [HitTestName.Pointer]: EntityName.GameBackground,
            }
        }
    });
    
    const taskFlow = initScene({
        world,
        systemList,
        name: 'gamePlay',
    });
    
    return taskFlow;
}
```

### 1.2 扩展实体枚举

修改 `src/games/interface/Entity.ts`:

```typescript
export enum EntityName {
    // 现有实体
    MainThemeBackground = 'MainThemeBackground',
    
    // 游戏场景实体
    GameBackground = 'GameBackground',
    GameHUD = 'GameHUD',
    GameMap = 'GameMap',
    
    // 游戏实体
    Village = 'Village',
    Building = 'Building',
    Villager = 'Villager',
}
```

### 1.3 扩展系统索引

修改 `src/games/interface/Task.ts`:

```typescript
export enum SystemIndex {
    // 现有系统
    MainThemeSystem = 1,
    
    // 游戏核心系统 (1000开始)
    GameManagerSystem = 1000,
    TimeSystem = 1001,
    IndicatorSystem = 1002,
    ResourceSystem = 1003,
    PopulationSystem = 1004,
    BuildingSystem = 1005,
    IndustrySystem = 1006,
    MissionSystem = 1007,
    EventSystem = 1008,
    PolicySystem = 1009,
    EndingSystem = 1010,
    UISystem = 1011,
}
```

### 1.4 创建游戏管理器系统

创建 `src/games/system/game/GameManagerSystem.ts`:

```typescript
import { System, SystemProps } from '../../../engine/System';
import { GameState, GamePhase } from '../../data/GameConfig';

export class GameManagerSystem extends System {
    private gameState: GameState;
    private gamePhase: GamePhase = GamePhase.Init;
    
    constructor(props: SystemProps) {
        super(props);
        this.gameState = this.createInitialState();
    }
    
    private createInitialState(): GameState {
        return {
            year: 1991,
            month: 1,
            day: 1,
            phase: GamePhase.Migration,
            isPaused: false,
            isGameOver: false,
        };
    }
    
    start() {
        console.log('[GameManager] 游戏初始化完成');
    }
    
    update() {
        // 游戏主循环逻辑
    }
    
    end() {
        console.log('[GameManager] 游戏结束');
    }
}
```

### 1.5 创建游戏配置数据

创建 `src/games/data/GameConfig.ts`:

```typescript
// 游戏阶段
export enum GamePhase {
    Init = 'init',
    Migration = 'migration',      // 移民阶段
    Foundation = 'foundation',    // 建设阶段
    Development = 'development',  // 发展阶段
    Prosperity = 'prosperity',    // 繁荣阶段
    Ending = 'ending',            // 结局阶段
}

// 游戏状态
export interface GameState {
    year: number;
    month: number;
    day: number;
    phase: GamePhase;
    isPaused: boolean;
    isGameOver: boolean;
}

// 游戏配置
export const GameConfig = {
    // 时间设置
    ticksPerDay: 10,          // 每天多少tick
    daysPerMonth: 30,         // 每月多少天
    monthsPerYear: 12,        // 每年多少月
    
    // 游戏平衡
    initialMoney: 1000,       // 初始资金
    initialFood: 500,         // 初始粮食
    initialPopulation: 10,   // 初始人口
    
    // 难度设置
    difficulty: 'normal',     // 难度
};
```

---

## 验证机制

### 自动化测试
- 测试GameManagerSystem创建和初始化
- 测试GameState状态转换

### 手动验证
1. 运行 `npm start`
2. 访问游戏场景
3. 验证控制台输出 `[GameManager] 游戏初始化完成`

---

## 预计工时

2-3小时
