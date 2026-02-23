import { HitTestName } from '../../../engine/modules/hitTest/HitTest';
import { initScene, initTaskSystemList } from '../../../engine/Scene';
import { World } from '../../../engine/Stage';
import { EntityName } from '../../interface/Entity';
import { SystemIndex } from '../../interface/Task';
import { MainThemeSystem } from './MainThemeSystem';

export interface InitMainThemeSceneProps {
    world: World,
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
}

export function initMainThemeScene(props: InitMainThemeSceneProps) {
    const { world, canvas, mask } = props;
    const systemList = initTaskSystemList({
        world,
        systemList: [
            {
                system: new MainThemeSystem({ world }),
                systemIndex: SystemIndex.MainThemeSystem,
            }
        ],
        canvas,
        mask,
        hitTestOptions: {
            extendHitTestGroup: {
                [HitTestName.Pointer]: EntityName.MainThemeBackground,
            }
        }
    });
    const taskFlow = initScene({
        world,
        systemList,
        name: 'mainTheme',
    });
    return taskFlow;
}
