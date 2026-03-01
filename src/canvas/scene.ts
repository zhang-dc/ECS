import { HitTestName } from '../engine/modules/hitTest/HitTest';
import { initScene, initTaskSystemList } from '../engine/Scene';
import { Stage } from '../engine/Stage';
import { SceneType } from '../engine/interface/Task';

export interface InitCanvasSceneProps {
    world: Stage;
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
}

/**
 * 初始化无边画布场景
 * 与 games 场景不同，这里不加载任何游戏实体，
 * 并且将 Pointer 碰撞检测配置为 ANY_HIT_TEST_ENTITY，
 * 使得通过 ElementFactory 创建的所有元素都可以被点选和拖拽。
 */
export function initCanvasScene(props: InitCanvasSceneProps) {
    const { world, canvas, mask } = props;
    const systemList = initTaskSystemList({
        world,
        systemList: [],
        canvas,
        mask,
        sceneType: SceneType.Canvas,
        hitTestOptions: {
            extendHitTestGroup: {
                [HitTestName.Pointer]: HitTestName.ANY_HIT_TEST_ENTITY,
            },
        },
    });
    const taskFlow = initScene({
        world,
        systemList,
        name: 'canvas',
    });
    return taskFlow;
}
