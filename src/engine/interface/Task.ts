export enum DefaultTaskName {

}

/**
 * 场景类型枚举
 * 用于根据路径/场景类型初始化不同的系统组合
 */
export enum SceneType {
    /** 画布编辑场景 - 包含完整的交互系统 */
    Canvas = 'canvas',
    /** 游戏主菜单场景 - 仅包含主菜单显示系统 */
    MainTheme = 'mainTheme',
    /** 游戏主场景 - 包含游戏逻辑系统 */
    GamePlay = 'gamePlay',
}

export enum DefaultSystemName {
    InteractSystem = 'InteractSystem',
    KeyboardSystem = 'KeyboardSystem',
    PointerSystem = 'PointerSystem',
    SelectSystem = 'SelectSystem',
    DragSystem = 'DragSystem',
    LayoutSystem = 'LayoutSystem',
    RenderSystem = 'RenderSystem',
    ViewportSystem = 'ViewportSystem',
    SelectionRenderSystem = 'SelectionRenderSystem',
    ResizeSystem = 'ResizeSystem',
    GridRenderSystem = 'GridRenderSystem',
    TextEditSystem = 'TextEditSystem',
    MindMapCommandSystem = 'MindMapCommandSystem',
    MindMapLayoutSystem = 'MindMapLayoutSystem',
    MindMapConnectionSystem = 'MindMapConnectionSystem',
}

export enum DefaultSystemIndex {
    // 基础交互状态 System
    EventSystem = -100000,
    PointerSystem,
    HitTestSystem,
    InteractSystem,
    KeyboardSystem,

    // 交互动作 System
    ResizeSystem,       // 必须在 SelectSystem 之前，否则点击手柄时选中会被清除
    SelectSystem,
    DragSystem,
    HistorySystem,
    GuideSystem,
    ToolSystem,
    TextEditSystem,
    MindMapCommandSystem,
    MindMapLayoutSystem,
    MindMapConnectionSystem,

    // 1 - 99999 为其他游戏内部机制 System

    // 排版和渲染 System
    LayerSystem = 100000,
    LayoutSystem,
    RenderSystem,
    SelectionRenderSystem,
    GridRenderSystem,
    ViewportSystem,
}
