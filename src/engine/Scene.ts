import { SystemInfo } from './flow/Task';
import { instanceTaskEntity } from './flow/TaskEntity';
import { TaskFlow } from './flow/TaskFlow';
import { DefaultEntityName } from './interface/Entity';
import { DefaultSystemIndex } from './interface/Task';
import { DragSystem } from './modules/drag/DragSystem';
import { EventSystem } from './modules/event/EventSystem';
import { HitTestSystem, HitTestSystemProps } from './modules/hitTest/HitTestSystem';
import { InteractSystem } from './modules/interact/InteractSystem';
import { KeyboardSystem } from './modules/keyboard/KeyboardSystem';
import { LayoutSystem } from './modules/layout/LayoutSystem';
import { PointerSystem } from './modules/pointer/PointerSystem';
import { RenderSystem } from './modules/render/RenderSystem';
import { ViewportSystem } from './modules/viewport/ViewportSystem';
import { World } from './Stage';

export interface InitSceneProps {
    world: World;
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
    world: World;
    systemList: SystemInfo[];
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
    hitTestOptions?: HitTestSystemProps['hitTestOptions'];
}

export function initTaskSystemList(props: InitTaskSystemListProps) {
    const { world, systemList, canvas, mask, hitTestOptions } = props;
    const defaultSystemList: SystemInfo[] = [
        // 基础交互状态 System
        {
            system: new EventSystem({ world }),
            systemIndex: DefaultSystemIndex.EventSystem,
        },
        {
            system: new HitTestSystem({ world, hitTestOptions }),
            systemIndex: DefaultSystemIndex.HitTestSystem,
        },
        {
            system: new PointerSystem({ world, mask }),
            systemIndex: DefaultSystemIndex.PointerSystem,
        },
        {
            system: new InteractSystem({ world }),
            systemIndex: DefaultSystemIndex.InteractSystem,
        },
        {
            system: new KeyboardSystem({ world, mask }),
            systemIndex: DefaultSystemIndex.KeyboardSystem,
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
            system: new ViewportSystem({ world, canvas }),
            systemIndex: DefaultSystemIndex.ViewportSystem,
        }
    ];

    return [
        ...defaultSystemList,
        ...systemList,
    ];
}
