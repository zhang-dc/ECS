import { initScene, initTaskSystemList } from '../../../engine/Scene';
import { Stage } from '../../../engine/Stage';
import { SystemIndex } from '../../interface/Task';
import { MainThemeSystem } from './MainThemeSystem';

export interface InitMainThemeSceneProps {
    world: Stage,
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
    });
    const taskFlow = initScene({
        world,
        systemList,
        name: 'mainTheme',
    });
    return taskFlow;
}
