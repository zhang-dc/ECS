import { SystemInfo } from './flow/Task';
import { instanceTaskEntity } from './flow/TaskEntity';
import { TaskFlow } from './flow/TaskFlow';
import { DefaultEntityName } from './interface/Entity';
import { DefaultSystemIndex } from './interface/Task';
import { DragSystem } from './modules/drag/DragSystem';
import { InteractSystem } from './modules/interact/InteractSystem';
import { KeyboardSystem } from './modules/keyboard/KeyboardSystem';
import { LayoutSystem } from './modules/layout/LayoutSystem';
import { PointerSystem } from './modules/pointer/PointerSystem';
import { RenderSystem } from './modules/render/RenderSystem';
import { ViewportSystem } from './modules/viewport/ViewportSystem';
import { Stage } from './Stage';

export interface InitSceneProps {
    world: Stage;
    systemList: SystemInfo[];
    name: string;
}

export function initScene(props: InitSceneProps) {
    const { world, systemList, name } = props;
    let task = world.findEntityByName(DefaultEntityName.Task);
    if (!task) {
        task = instanceTaskEntity({world, name, systemList});
    }
    const taskFlow = new TaskFlow({ world });
    return taskFlow;
}

export interface InitTaskSystemListProps {
    world: Stage;
    systemList: SystemInfo[];
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
}

export function initTaskSystemList(props: InitTaskSystemListProps) {
    const { world, systemList, canvas, mask } = props;
    const defaultSystemList: SystemInfo[] = [
        // 基础交互状态 System
        {
            system: new InteractSystem({ world }),
            systemIndex: DefaultSystemIndex.InteractSystem,
        },
        {
            system: new KeyboardSystem({ world, mask }),
            systemIndex: DefaultSystemIndex.KeyboardSystem,
        },
        {
            system: new PointerSystem({ world, mask }),
            systemIndex: DefaultSystemIndex.PointerSystem,
        },
        // 交互动作 System
        {
            system: new DragSystem({ world }),
            systemIndex: DefaultSystemIndex.DragSystem,
        },
        // 排版和渲染 System
        {
            system: new LayoutSystem({ world }),
            systemIndex: DefaultSystemIndex.LayoutSystem,
        },
        {
            system: new RenderSystem({ world, canvas }),
            systemIndex: DefaultSystemIndex.RenderSystem,
        },
        {
            system: new ViewportSystem({ world }),
            systemIndex: DefaultSystemIndex.ViewportSystem,
        }
    ];

    return [
        ...defaultSystemList,
        ...systemList,
    ];
}
