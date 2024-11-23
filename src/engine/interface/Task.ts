export enum DefaultTaskName {

}

export enum DefaultSystemName {
    InteractSystem = 'InteractSystem',
    KeyboardSystem = 'KeyboardSystem',
    PointerSystem = 'PointerSystem',
    DragSystem = 'DragSystem',
    LayoutSystem = 'LayoutSystem',
    RenderSystem = 'RenderSystem',
    ViewportSystem = 'ViewportSystem',
}

export enum DefaultSystemIndex {
    // 基础交互状态 System
    InteractSystem = -10000,
    KeyboardSystem,
    PointerSystem,

    // 交互动作 System
    DragSystem,

    // 1 - 9999 为其他游戏内部机制 System

    // 排版和渲染 System
    LayoutSystem = 10000,
    RenderSystem,
    ViewportSystem,
}
