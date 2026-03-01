import { SystemInfo } from './flow/Task';
import { instanceTaskEntity } from './flow/TaskEntity';
import { TaskFlow } from './flow/TaskFlow';
import { DefaultEntityName } from './interface/Entity';
import { DefaultSystemIndex, SceneType } from './interface/Task';
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
    /**
     * 场景类型，用于根据路径初始化不同的系统组合
     * - Canvas: 画布编辑场景，包含完整的交互系统
     * - MainTheme: 游戏主菜单场景，仅包含主菜单显示
     * - GamePlay: 游戏主场景，包含游戏逻辑系统
     */
    sceneType?: SceneType;
}

export function initTaskSystemList(props: InitTaskSystemListProps) {
    const { world, systemList, canvas, mask, hitTestOptions, sceneType = SceneType.Canvas } = props;

    // 创建需要互相引用的系统实例
    const selectionRenderSystem = new SelectionRenderSystem({ world });
    const resizeSystem = new ResizeSystem({ world, mask });
    resizeSystem.setSelectionRenderSystem(selectionRenderSystem);

    // 思维导图系统：MindMapLayoutSystem 需要读取 MindMapCommandSystem 的 needsRelayout 标志
    const mindMapCommandSystem = new MindMapCommandSystem({ world });
    const mindMapLayoutSystem = new MindMapLayoutSystem({ world });
    mindMapLayoutSystem.setCommandSystem(mindMapCommandSystem);

    /**
     * 基础系统：所有场景都需要的基础事件系统和渲染系统
     */
    const baseSystemList: SystemInfo[] = [
        {
            system: new EventSystem({ world }),
            systemIndex: DefaultSystemIndex.EventSystem,
        },
        {
            system: new RenderSystem({ world, canvas }),
            systemIndex: DefaultSystemIndex.RenderSystem,
        },
    ];

    /**
     * 交互系统：画布编辑场景（Canvas）需要的交互功能
     * 包含：HitTest, Pointer, Interact, Keyboard, Resize, Select, Drag, History, Guide, Tool, TextEdit
     */
    const interactSystemList: SystemInfo[] = [
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
        // ResizeSystem 必须在 SelectSystem 之前
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
    ];

    /**
     * 思维导图系统：Canvas 场景需要的思维导图功能
     */
    const mindMapSystemList: SystemInfo[] = [
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
    ];

    /**
     * 布局和渲染扩展系统
     */
    const layoutRenderSystemList: SystemInfo[] = [
        {
            system: new LayerSystem({ world }),
            systemIndex: DefaultSystemIndex.LayerSystem,
        },
        {
            system: new LayoutSystem({ world }),
            systemIndex: DefaultSystemIndex.LayoutSystem,
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

    /**
     * 根据场景类型组合系统列表
     */
    let defaultSystemList: SystemInfo[];

    switch (sceneType) {
        case SceneType.MainTheme:
            // 游戏主菜单场景：只需要基础系统 + 渲染
            defaultSystemList = [
                ...baseSystemList,
            ];
            break;

        case SceneType.GamePlay:
            // 游戏主场景：基础系统 + 游戏专用系统
            // 注意：游戏场景可能需要部分交互功能（如点击建筑），但不需要完整的编辑功能
            defaultSystemList = [
                ...baseSystemList,
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
                ...layoutRenderSystemList,
            ];
            break;

        case SceneType.Canvas:
        default:
            // 画布编辑场景：完整的系统列表
            defaultSystemList = [
                ...baseSystemList,
                ...interactSystemList,
                ...mindMapSystemList,
                ...layoutRenderSystemList,
            ];
            break;
    }

    return [
        ...defaultSystemList,
        ...systemList,
    ];
}
