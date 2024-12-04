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
    EventSystem = -100000,
    PointerSystem,
    HitTestSystem,
    InteractSystem,
    KeyboardSystem,

    // 交互动作 System
    DragSystem,

    // 1 - 99999 为其他游戏内部机制 System

    // 排版和渲染 System
    LayoutSystem = 100000,
    RenderSystem,
    ViewportSystem,
}
