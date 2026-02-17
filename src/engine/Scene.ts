import { SystemInfo } from './flow/Task';
import { instanceTaskEntity } from './flow/TaskEntity';
import { TaskFlow } from './flow/TaskFlow';
import { DefaultEntityName } from './interface/Entity';
import { DefaultSystemIndex } from './interface/Task';
import { DragSystem } from './modules/drag/DragSystem';
import { EventSystem } from './modules/event/EventSystem';
import { HistorySystem } from './modules/history/HistorySystem';
import { GuideSystem } from './modules/guide/GuideSystem';
import { GridRenderSystem } from './modules/guide/GridRenderSystem';
import { HitTestSystem, HitTestSystemProps } from './modules/hitTest/HitTestSystem';
import { LayerSystem } from './modules/layer/LayerSystem';
import { InteractSystem } from './modules/interact/InteractSystem';
import { KeyboardSystem } from './modules/keyboard/KeyboardSystem';
import { LayoutSystem } from './modules/layout/LayoutSystem';
import { PointerSystem } from './modules/pointer/PointerSystem';
import { RenderSystem } from './modules/render/RenderSystem';
import { SelectSystem } from './modules/select/SelectSystem';
import { SelectionRenderSystem } from './modules/select/SelectionRenderSystem';
import { ResizeSystem } from './modules/select/ResizeSystem';
import { TextEditSystem } from './modules/text/TextEditSystem';
import { MindMapCommandSystem } from './modules/mindmap/MindMapCommandSystem';
import { MindMapLayoutSystem } from './modules/mindmap/MindMapLayoutSystem';
import { MindMapConnectionSystem } from './modules/mindmap/MindMapConnectionSystem';
import { ToolSystem } from './modules/tool/ToolSystem';
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
    hitTestOptions?: HitTestSystemProps['hitTestOptions'];
}

export function initTaskSystemList(props: InitTaskSystemListProps) {
    const { world, systemList, canvas, mask, hitTestOptions } = props;

    // 创建需要互相引用的系统实例
    const selectionRenderSystem = new SelectionRenderSystem({ world });
    const resizeSystem = new ResizeSystem({ world, mask });
    resizeSystem.setSelectionRenderSystem(selectionRenderSystem);

    // 思维导图系统：MindMapLayoutSystem 需要读取 MindMapCommandSystem 的 needsRelayout 标志
    const mindMapCommandSystem = new MindMapCommandSystem({ world });
    const mindMapLayoutSystem = new MindMapLayoutSystem({ world });
    mindMapLayoutSystem.setCommandSystem(mindMapCommandSystem);

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
        // 交互动作 System（ResizeSystem 必须在 SelectSystem 之前）
        {
            system: resizeSystem,
            systemIndex: DefaultSystemIndex.ResizeSystem,
        },
        {
            system: new SelectSystem({ world }),
            systemIndex: DefaultSystemIndex.SelectSystem,
        },
        {
            system: new DragSystem({ world }),
            systemIndex: DefaultSystemIndex.DragSystem,
        },
        {
            system: new HistorySystem({ world }),
            systemIndex: DefaultSystemIndex.HistorySystem,
        },
        {
            system: new GuideSystem({ world }),
            systemIndex: DefaultSystemIndex.GuideSystem,
        },
        {
            system: new ToolSystem({ world }),
            systemIndex: DefaultSystemIndex.ToolSystem,
        },
        {
            system: new TextEditSystem({ world, mask }),
            systemIndex: DefaultSystemIndex.TextEditSystem,
        },
        {
            system: mindMapCommandSystem,
            systemIndex: DefaultSystemIndex.MindMapCommandSystem,
        },
        {
            system: mindMapLayoutSystem,
            systemIndex: DefaultSystemIndex.MindMapLayoutSystem,
        },
        {
            system: new MindMapConnectionSystem({ world }),
            systemIndex: DefaultSystemIndex.MindMapConnectionSystem,
        },
        // 排版和渲染 System
        {
            system: new LayerSystem({ world }),
            systemIndex: DefaultSystemIndex.LayerSystem,
        },
        {
            system: new LayoutSystem({ world }),
            systemIndex: DefaultSystemIndex.LayoutSystem,
        },
        {
            system: new RenderSystem({ world, canvas }),
            systemIndex: DefaultSystemIndex.RenderSystem,
        },
        {
            system: selectionRenderSystem,
            systemIndex: DefaultSystemIndex.SelectionRenderSystem,
        },
        {
            system: new GridRenderSystem({ world }),
            systemIndex: DefaultSystemIndex.GridRenderSystem,
        },
        {
            system: new ViewportSystem({ world, canvas, mask }),
            systemIndex: DefaultSystemIndex.ViewportSystem,
        }
    ];

    return [
        ...defaultSystemList,
        ...systemList,
    ];
}
