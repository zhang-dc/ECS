import { Entity } from '../Entity';
import { Stage, StageEvents } from '../Stage';
import { HistoryComponent } from '../modules/history/HistoryComponent';
import { ICommand } from '../modules/history/Command';
import { SelectionState } from '../modules/select/SelectionState';
import { ViewportComponent } from '../modules/viewport/ViewportComponent';
import { GuideComponent } from '../modules/guide/GuideComponent';
import { EventManager } from '../modules/event/Event';
import { ViewportEvent, ViewportOperation } from '../modules/viewport/ViewportEvent';
import { LayerEvent, LayerOperation } from '../modules/layer/LayerEvent';
import { HistoryEvent, HistoryOperation } from '../modules/history/HistoryEvent';
import { SelectEvent, SelectOperation } from '../modules/select/SelectEvent';
import { LayoutComponent } from '../modules/layout/LayoutComponent';
import { LayoutEvent } from '../modules/layout/LayoutEvent';
import { SelectComponent } from '../modules/select/SelectComponent';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../modules/hitTest/HitTestComponent';
import { ShapeRenderer } from '../modules/render/ShapeRenderer';
import { DefaultEntityName } from '../interface/Entity';
import {
    ElementFactory,
    CreateRectOptions,
    CreateCircleOptions,
    CreateTextOptions,
    CreateImageOptions,
} from '../factory/ElementFactory';
import { MindMapFactory } from '../factory/MindMapFactory';
import { MindMapNodeComponent } from '../modules/mindmap/MindMapNodeComponent';
import { MindMapEvent, MindMapEventType } from '../modules/mindmap/MindMapEvent';

export type ECSStateListener = () => void;

export type ToolType = 'select' | 'rect' | 'circle' | 'text' | 'image' | 'hand' | 'mindmap';

/**
 * 画布上用户实体的摘要信息
 */
export interface EntityInfo {
    id: string;
    name: string;
    type: 'rect' | 'circle' | 'text' | 'image' | 'mindmap' | 'unknown';
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * ECS 状态快照 — 供 React 侧消费
 */
export interface ECSState {
    /** 当前选中的实体 */
    selectedEntities: Entity[];
    /** 视口缩放比例 */
    viewportScale: number;
    /** 视口偏移 */
    viewportOffsetX: number;
    viewportOffsetY: number;
    /** 是否可以撤销 */
    canUndo: boolean;
    /** 是否可以重做 */
    canRedo: boolean;
    /** 是否显示网格 */
    showGrid: boolean;
    /** 网格大小 */
    gridSize: number;
    /** 是否显示对齐线 */
    showSmartGuides: boolean;
    /** 画布上所有用户实体的摘要信息 */
    entities: EntityInfo[];
    /** 当前工具模式 */
    currentTool: ToolType;
    /** 状态版本号（每次变化递增，帮助 React 检测变化） */
    version: number;
}

/** 内部默认实体名称集合，用于过滤非用户实体 */
const INTERNAL_ENTITY_NAMES = new Set<string>([
    DefaultEntityName.Viewport,
    DefaultEntityName.Pointer,
    DefaultEntityName.Keyboard,
    DefaultEntityName.Selection,
    DefaultEntityName.History,
    DefaultEntityName.Guide,
    'Tool',
]);

/**
 * ECS 桥接器
 * 连接 ECS 世界和 React UI 层的双向通信通道
 * 使用 Stage EventBus 实现即时状态同步（替代 setInterval 轮询）
 */
export class ECSBridge {
    private world: Stage;
    private listeners: Set<ECSStateListener> = new Set();
    private selectionState?: SelectionState;
    private viewportComponent?: ViewportComponent;
    private historyComponent?: HistoryComponent;
    private guideComponent?: GuideComponent;
    private eventManager?: EventManager;
    private stateVersion: number = 0;
    private cachedState: ECSState | null = null;
    private currentTool: ToolType = 'select';
    private unsubscribers: Array<() => void> = [];
    private elementFactory?: ElementFactory;
    private mindMapFactory?: MindMapFactory;
    /** 剪贴板：存储复制的实体引用 */
    private clipboard: Entity[] = [];
    /** 粘贴次数（用于递增偏移） */
    private pasteCount: number = 0;

    constructor(world: Stage) {
        this.world = world;
    }

    /**
     * 初始化桥接器（在 ECS 系统 start 之后调用）
     */
    init() {
        this.selectionState = this.world.findComponent(SelectionState);
        this.viewportComponent = this.world.findComponent(ViewportComponent);
        this.historyComponent = this.world.findComponent(HistoryComponent);
        this.guideComponent = this.world.findComponent(GuideComponent);
        this.eventManager = this.world.findComponent(EventManager);

        // 初始化工厂
        const renderStage = ElementFactory.getRenderStageFromWorld(this.world);
        if (renderStage) {
            this.elementFactory = new ElementFactory(this.world, renderStage);
            this.mindMapFactory = new MindMapFactory(this.world, renderStage);
        }

        // 订阅 Stage EventBus 事件，替代 setInterval 轮询
        this.unsubscribers.push(
            this.world.on(StageEvents.SELECTION_CHANGE, () => this.invalidate()),
            this.world.on(StageEvents.VIEWPORT_CHANGE, () => this.invalidate()),
            this.world.on(StageEvents.HISTORY_CHANGE, () => this.invalidate()),
            this.world.on(StageEvents.ENTITY_MOVE, () => this.invalidate()),
            this.world.on(StageEvents.ENTITY_ADD, () => this.invalidate()),
            this.world.on(StageEvents.ENTITY_REMOVE, () => this.invalidate()),
            this.world.on(StageEvents.CLIPBOARD_COPY, () => this.copySelected()),
            this.world.on(StageEvents.CLIPBOARD_PASTE, () => this.pasteClipboard()),
            this.world.on(StageEvents.DUPLICATE, () => this.duplicateSelected()),
            this.world.on(StageEvents.TOOL_CHANGE, (_tool: ToolType) => {
                this.currentTool = _tool;
                this.invalidate();
            }),
        );
    }

    /**
     * 销毁桥接器
     */
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.listeners.clear();
    }

    /**
     * 订阅状态变化
     */
    subscribe(listener: ECSStateListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 获取当前 ECS 状态快照
     * 通过 version 机制确保 React 能正确检测变化
     */
    getState(): ECSState {
        if (this.cachedState && this.cachedState.version === this.stateVersion) {
            return this.cachedState;
        }
        this.cachedState = {
            selectedEntities: this.selectionState?.getSelectedArray() ?? [],
            viewportScale: this.viewportComponent?.scale ?? 1,
            viewportOffsetX: this.viewportComponent?.offsetX ?? 0,
            viewportOffsetY: this.viewportComponent?.offsetY ?? 0,
            canUndo: this.historyComponent?.canUndo() ?? false,
            canRedo: this.historyComponent?.canRedo() ?? false,
            showGrid: this.guideComponent?.showGrid ?? true,
            gridSize: this.guideComponent?.gridSize ?? 20,
            showSmartGuides: this.guideComponent?.showSmartGuides ?? true,
            entities: this.collectEntityInfos(),
            currentTool: this.currentTool,
            version: this.stateVersion,
        };
        return this.cachedState;
    }

    /** 获取状态版本号 */
    getVersion(): number {
        return this.stateVersion;
    }

    // ==================== React -> ECS 操作 ====================

    /** 执行命令（带历史记录） */
    executeCommand(command: ICommand) {
        const event = new HistoryEvent({
            data: { operation: HistoryOperation.Execute, command },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 撤销 */
    undo() {
        const event = new HistoryEvent({
            data: { operation: HistoryOperation.Undo },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 重做 */
    redo() {
        const event = new HistoryEvent({
            data: { operation: HistoryOperation.Redo },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 缩放到指定比例 */
    zoomTo(scale: number) {
        const event = new ViewportEvent({
            data: { operation: ViewportOperation.Zoom, newScale: scale },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 缩放到适合内容 */
    zoomToFit() {
        const event = new ViewportEvent({
            data: { operation: ViewportOperation.FitToContent },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 选中实体 */
    selectEntities(entities: Entity[]) {
        const event = new SelectEvent({
            data: { operation: SelectOperation.Select, entities },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 取消所有选中 */
    deselectAll() {
        const event = new SelectEvent({
            data: { operation: SelectOperation.DeselectAll },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 全选 */
    selectAll() {
        const event = new SelectEvent({
            data: { operation: SelectOperation.SelectAll },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 置顶选中实体 */
    bringToFront(entities: Entity[]) {
        const event = new LayerEvent({
            data: { operation: LayerOperation.BringToFront, entities },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 置底选中实体 */
    sendToBack(entities: Entity[]) {
        const event = new LayerEvent({
            data: { operation: LayerOperation.SendToBack, entities },
        });
        this.eventManager?.sendEvent(event);
    }

    /** 切换网格显示 */
    toggleGrid() {
        if (this.guideComponent) {
            this.guideComponent.showGrid = !this.guideComponent.showGrid;
            this.guideComponent.dirty = true;
            this.invalidate();
        }
    }

    /** 切换对齐线显示 */
    toggleSmartGuides() {
        if (this.guideComponent) {
            this.guideComponent.showSmartGuides = !this.guideComponent.showSmartGuides;
            this.guideComponent.dirty = true;
            this.invalidate();
        }
    }

    /** 设置当前工具模式 */
    setCurrentTool(tool: ToolType) {
        this.currentTool = tool;
        this.world.emit(StageEvents.TOOL_CHANGE, tool);
    }

    /** 获取当前工具模式 */
    getCurrentTool(): ToolType {
        return this.currentTool;
    }

    // ==================== 元素操作 ====================

    /** 添加矩形 */
    addRect(options: CreateRectOptions): Entity | undefined {
        return this.elementFactory?.createRect(options);
    }

    /** 添加圆形 */
    addCircle(options: CreateCircleOptions): Entity | undefined {
        return this.elementFactory?.createCircle(options);
    }

    /** 添加文本 */
    addText(options: CreateTextOptions): Entity | undefined {
        return this.elementFactory?.createText(options);
    }

    /** 添加图片 */
    addImage(options: CreateImageOptions): Entity | undefined {
        return this.elementFactory?.createImage(options);
    }

    /** 删除选中的实体（含思维导图子节点和连线递归清理） */
    deleteSelected(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length === 0) return;

        // 收集所有需要删除的实体
        const toDelete = new Set<Entity>();
        selected.forEach(entity => {
            this.collectEntityAndDescendants(entity, toDelete);
        });

        toDelete.forEach(entity => entity.destory());
        this.selectionState?.clearSelection();
        this.world.emit(StageEvents.ENTITY_REMOVE, null);
        this.invalidate();
    }

    /** 递归收集实体及其思维导图子节点和连线 */
    private collectEntityAndDescendants(entity: Entity, result: Set<Entity>): void {
        if (result.has(entity)) return;
        result.add(entity);

        const mindMapComp = entity.getComponent(MindMapNodeComponent);
        if (mindMapComp) {
            if (mindMapComp.connectionEntity) {
                result.add(mindMapComp.connectionEntity);
            }
            entity.children.forEach(child => {
                if (child.getComponent(MindMapNodeComponent)) {
                    this.collectEntityAndDescendants(child, result);
                }
            });
        }
    }

    /**
     * 更新实体的布局属性
     * @param entity 目标实体
     * @param property 属性名 (x, y, width, height, rotation, scaleX, scaleY, zIndex)
     * @param value 新值
     */
    updateEntityProperty(entity: Entity, property: string, value: number): void {
        const layoutComp = entity.getComponent(LayoutComponent);
        if (!layoutComp) return;

        switch (property) {
            case 'x': layoutComp.x = value; break;
            case 'y': layoutComp.y = value; break;
            case 'width': {
                layoutComp.width = Math.max(1, value);
                // 同步 HitTestComponent
                const hitTest = entity.getComponent(HitTestComponent);
                if (hitTest && hitTest.data.type === HitTestType.Rect) {
                    (hitTest.data.options as RectHitTestProps).size[0] = layoutComp.width;
                }
                // 同步 ShapeRenderer（含图片纹理填充）
                const shape = entity.getComponent(ShapeRenderer);
                if (shape) shape.updateSize(layoutComp.width, layoutComp.height);
                break;
            }
            case 'height': {
                layoutComp.height = Math.max(1, value);
                const hitTestH = entity.getComponent(HitTestComponent);
                if (hitTestH && hitTestH.data.type === HitTestType.Rect) {
                    (hitTestH.data.options as RectHitTestProps).size[1] = layoutComp.height;
                }
                const shapeH = entity.getComponent(ShapeRenderer);
                if (shapeH) shapeH.updateSize(layoutComp.width, layoutComp.height);
                break;
            }
            case 'rotation': layoutComp.rotation = value; break;
            case 'scaleX': layoutComp.scaleX = value; break;
            case 'scaleY': layoutComp.scaleY = value; break;
            case 'zIndex': layoutComp.zIndex = value; break;
        }

        layoutComp.dirty = true;

        // 触发布局更新事件
        if (this.eventManager) {
            const layoutEvent = new LayoutEvent({ data: { entities: [entity] } });
            this.eventManager.sendEvent(layoutEvent);
        }

        this.world.emit(StageEvents.ENTITY_MOVE, { entities: [entity.name] });
    }

    /**
     * 更新实体的渲染样式
     * @param entity 目标实体
     * @param style 样式对象 { fillColor, strokeColor, strokeWidth, opacity }
     */
    updateEntityStyle(entity: Entity, style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }): void {
        const shapeRenderer = entity.getComponent(ShapeRenderer);
        if (shapeRenderer) {
            shapeRenderer.updateStyle(style);
        }
        this.invalidate();
    }

    // ==================== 图片操作 ====================

    /** 替换图片源 */
    replaceImage(entity: Entity, source: string): void {
        const shapeRenderer = entity.getComponent(ShapeRenderer);
        if (shapeRenderer) {
            shapeRenderer.setTextureFill(source);
            this.invalidate();
        }
    }

    /** 更新图片透明度 */
    updateImageOpacity(entity: Entity, opacity: number): void {
        const shapeRenderer = entity.getComponent(ShapeRenderer);
        if (shapeRenderer) {
            shapeRenderer.updateOpacity(opacity);
            this.invalidate();
        }
    }

    // ==================== 复制/粘贴/复制 ====================

    /** 复制选中的实体到剪贴板 */
    copySelected(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length === 0) return;
        this.clipboard = [...selected];
        this.pasteCount = 0;
    }

    /** 粘贴剪贴板中的实体 */
    pasteClipboard(): void {
        if (this.clipboard.length === 0 || !this.elementFactory) return;
        this.pasteCount++;
        const offset = this.pasteCount * 20;

        const newEntities: Entity[] = [];
        this.clipboard.forEach(entity => {
            const cloned = this.elementFactory!.cloneEntity(entity, offset, offset);
            if (cloned) {
                newEntities.push(cloned);
            }
        });

        // 选中新粘贴的实体
        if (newEntities.length > 0 && this.selectionState) {
            this.selectionState.selectMultiple(newEntities);
            this.world.emit(StageEvents.SELECTION_CHANGE, {
                selectedEntities: newEntities,
            });
            this.world.emit(StageEvents.ENTITY_ADD, null);
        }
        this.invalidate();
    }

    /** 原地复制选中的实体（Ctrl+D） */
    duplicateSelected(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length === 0 || !this.elementFactory) return;

        const newEntities: Entity[] = [];
        selected.forEach(entity => {
            const cloned = this.elementFactory!.cloneEntity(entity, 20, 20);
            if (cloned) {
                newEntities.push(cloned);
            }
        });

        // 选中新复制的实体
        if (newEntities.length > 0 && this.selectionState) {
            this.selectionState.selectMultiple(newEntities);
            this.world.emit(StageEvents.SELECTION_CHANGE, {
                selectedEntities: newEntities,
            });
            this.world.emit(StageEvents.ENTITY_ADD, null);
        }
        this.invalidate();
    }

    // ==================== 对齐操作 ====================

    /** 多选对齐：左对齐 */
    alignLeft(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let minX = Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) minX = Math.min(minX, l.x);
        });
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.x = minX; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：右对齐 */
    alignRight(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let maxRight = -Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) maxRight = Math.max(maxRight, l.x + l.width);
        });
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.x = maxRight - l.width; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：顶对齐 */
    alignTop(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let minY = Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) minY = Math.min(minY, l.y);
        });
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.y = minY; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：底对齐 */
    alignBottom(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let maxBottom = -Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) maxBottom = Math.max(maxBottom, l.y + l.height);
        });
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.y = maxBottom - l.height; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：水平居中 */
    alignCenterH(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let minX = Infinity, maxRight = -Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) {
                minX = Math.min(minX, l.x);
                maxRight = Math.max(maxRight, l.x + l.width);
            }
        });
        const centerX = (minX + maxRight) / 2;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.x = centerX - l.width / 2; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：垂直居中 */
    alignCenterV(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 2) return;
        let minY = Infinity, maxBottom = -Infinity;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) {
                minY = Math.min(minY, l.y);
                maxBottom = Math.max(maxBottom, l.y + l.height);
            }
        });
        const centerY = (minY + maxBottom) / 2;
        selected.forEach(e => {
            const l = e.getComponent(LayoutComponent);
            if (l) { l.y = centerY - l.height / 2; l.dirty = true; }
        });
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：水平等间距分布 */
    distributeH(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 3) return;
        const items = selected
            .map(e => ({ entity: e, layout: e.getComponent(LayoutComponent)! }))
            .filter(i => i.layout)
            .sort((a, b) => a.layout.x - b.layout.x);
        if (items.length < 3) return;

        const first = items[0].layout;
        const last = items[items.length - 1].layout;
        const totalWidth = items.reduce((sum, i) => sum + i.layout.width, 0);
        const totalSpace = (last.x + last.width) - first.x - totalWidth;
        const gap = totalSpace / (items.length - 1);

        let currentX = first.x + first.width + gap;
        for (let i = 1; i < items.length - 1; i++) {
            items[i].layout.x = currentX;
            items[i].layout.dirty = true;
            currentX += items[i].layout.width + gap;
        }
        this.emitMoveAndInvalidate(selected);
    }

    /** 多选对齐：垂直等间距分布 */
    distributeV(): void {
        const selected = this.selectionState?.getSelectedArray() ?? [];
        if (selected.length < 3) return;
        const items = selected
            .map(e => ({ entity: e, layout: e.getComponent(LayoutComponent)! }))
            .filter(i => i.layout)
            .sort((a, b) => a.layout.y - b.layout.y);
        if (items.length < 3) return;

        const first = items[0].layout;
        const last = items[items.length - 1].layout;
        const totalHeight = items.reduce((sum, i) => sum + i.layout.height, 0);
        const totalSpace = (last.y + last.height) - first.y - totalHeight;
        const gap = totalSpace / (items.length - 1);

        let currentY = first.y + first.height + gap;
        for (let i = 1; i < items.length - 1; i++) {
            items[i].layout.y = currentY;
            items[i].layout.dirty = true;
            currentY += items[i].layout.height + gap;
        }
        this.emitMoveAndInvalidate(selected);
    }

    /** 批量更新实体属性（多选时使用） */
    updateMultipleEntityProperty(entities: Entity[], property: string, value: number): void {
        entities.forEach(entity => {
            this.updateEntityProperty(entity, property, value);
        });
    }

    /** 批量更新实体样式（多选时使用） */
    updateMultipleEntityStyle(entities: Entity[], style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }): void {
        entities.forEach(entity => {
            this.updateEntityStyle(entity, style);
        });
    }

    /** 辅助：发射移动事件并刷新 */
    private emitMoveAndInvalidate(entities: Entity[]): void {
        if (this.eventManager) {
            const layoutEvent = new LayoutEvent({ data: { entities } });
            this.eventManager.sendEvent(layoutEvent);
        }
        this.world.emit(StageEvents.ENTITY_MOVE, { entities: entities.map(e => e.name) });
        this.invalidate();
    }

    // ==================== 思维导图操作 ====================

    /** 创建思维导图根节点 */
    createMindMapRoot(options?: { text?: string; x?: number; y?: number }): Entity | undefined {
        return this.mindMapFactory?.createRootNode(options);
    }

    /** 为选中的思维导图节点添加子节点 */
    addMindMapChild(parentEntity: Entity, text?: string): void {
        if (this.eventManager) {
            const event = new MindMapEvent({
                data: {
                    type: MindMapEventType.AddChild,
                    targetEntity: parentEntity,
                    text,
                },
            });
            this.eventManager.sendEvent(event);
        }
    }

    /** 为选中的思维导图节点添加兄弟节点 */
    addMindMapSibling(entity: Entity, text?: string): void {
        if (this.eventManager) {
            const event = new MindMapEvent({
                data: {
                    type: MindMapEventType.AddSibling,
                    targetEntity: entity,
                    text,
                },
            });
            this.eventManager.sendEvent(event);
        }
    }

    /** 删除思维导图节点 */
    deleteMindMapNode(entity: Entity): void {
        if (this.eventManager) {
            const event = new MindMapEvent({
                data: {
                    type: MindMapEventType.DeleteNode,
                    targetEntity: entity,
                },
            });
            this.eventManager.sendEvent(event);
        }
    }

    /** 折叠/展开思维导图节点 */
    toggleMindMapCollapse(entity: Entity): void {
        if (this.eventManager) {
            const event = new MindMapEvent({
                data: {
                    type: MindMapEventType.ToggleCollapse,
                    targetEntity: entity,
                },
            });
            this.eventManager.sendEvent(event);
        }
    }

    /** 请求重新布局思维导图 */
    relayoutMindMap(): void {
        if (this.eventManager) {
            const event = new MindMapEvent({
                data: { type: MindMapEventType.RelayoutRequest },
            });
            this.eventManager.sendEvent(event);
        }
    }

    /** 获取 MindMapFactory */
    getMindMapFactory(): MindMapFactory | undefined {
        return this.mindMapFactory;
    }

    /** 获取 ElementFactory */
    getElementFactory(): ElementFactory | undefined {
        return this.elementFactory;
    }

    /** 获取 ECS World 引用 */
    getWorld(): Stage {
        return this.world;
    }

    /** 获取 EventManager */
    getEventManager(): EventManager | undefined {
        return this.eventManager;
    }

    // ==================== 内部方法 ====================

    /** 使缓存失效并通知 React */
    private invalidate() {
        this.stateVersion++;
        this.cachedState = null;
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    /** 收集画布上所有用户实体的摘要信息 */
    private collectEntityInfos(): EntityInfo[] {
        const result: EntityInfo[] = [];
        this.world.entities.forEach(entity => {
            if (INTERNAL_ENTITY_NAMES.has(entity.name)) {
                return;
            }
            const layoutComp = entity.getComponent(LayoutComponent);
            const selectComp = entity.getComponent(SelectComponent);
            if (!layoutComp || !selectComp) {
                return;
            }
            // 推断类型
            let type: EntityInfo['type'] = 'unknown';
            if (entity.getComponent(MindMapNodeComponent)) {
                type = 'mindmap';
            } else {
                const name = entity.name.toLowerCase();
                if (name.includes('rect') || name.includes('rectangle')) {
                    type = 'rect';
                } else if (name.includes('circle') || name.includes('ellipse')) {
                    type = 'circle';
                } else if (name.includes('text')) {
                    type = 'text';
                } else if (name.includes('image') || name.includes('sprite')) {
                    type = 'image';
                }
            }
            result.push({
                id: entity.name,
                name: entity.name,
                type,
                x: layoutComp.x,
                y: layoutComp.y,
                width: layoutComp.width,
                height: layoutComp.height,
            });
        });
        return result;
    }
}
