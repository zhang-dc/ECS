import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { PointerButtons } from '../pointer/Pointer';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { ViewportEvent, ViewportOperation } from '../viewport/ViewportEvent';
import { ElementFactory } from '../../factory/ElementFactory';
import { MindMapFactory } from '../../factory/MindMapFactory';
import { RenderConfig } from '../render/RenderConfig';
import { DefaultEntityName } from '../../interface/Entity';
import { ToolComponent, ToolMode } from './ToolComponent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { SelectionState } from '../select/SelectionState';
import { SelectEvent, SelectOperation } from '../select/SelectEvent';
import { MindMapNodeComponent } from '../mindmap/MindMapNodeComponent';
import { Graphics, DisplayObject } from 'pixi.js';

const PREVIEW_FILL = 0x4A90D9;
const PREVIEW_FILL_ALPHA = 0.15;
const PREVIEW_STROKE = 0x4A90D9;
const PREVIEW_STROKE_ALPHA = 0.6;

/**
 * 工具模式系统
 * - select 模式：保持现有选择/拖拽行为
 * - rect / circle 模式：pointer down+move+up 绘制新元素（含实时预览）
 * - text 模式：pointer click 创建文本
 * - hand 模式：pointer drag 平移视口
 * - 键盘快捷键切换工具
 */
export class ToolSystem extends System {
    eventManager?: EventManager;
    pointerComponent?: PointerComponent;
    viewportComponent?: ViewportComponent;
    keyboardComponent?: KeyboardComponent;
    selectionState?: SelectionState;
    toolComponent!: ToolComponent;
    elementFactory?: ElementFactory;
    mindMapFactory?: MindMapFactory;
    private renderConfig?: RenderConfig;
    private previewGraphics: Graphics = new Graphics();
    private previewAdded = false;

    constructor(props: SystemProps) {
        super(props);
        // 创建 Tool 实体
        const toolEntity = new Entity({ name: 'Tool', world: this.world });
        this.toolComponent = new ToolComponent({ mode: 'select' });
        toolEntity.addComponent(this.toolComponent);
        this.world.addEntity(toolEntity);
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
        this.selectionState = this.world.findComponent(SelectionState);
        this.renderConfig = this.world.findComponent(RenderConfig);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);

        // 初始化工厂
        if (this.renderConfig) {
            this.elementFactory = new ElementFactory(this.world, this.renderConfig.renderStage);
            this.mindMapFactory = new MindMapFactory(this.world, this.renderConfig.renderStage);
        }

        // 预览 Graphics 添加到 overlayContainer（不受 RenderSystem.removeChildren 影响）
        if (this.renderConfig) {
            this.previewGraphics.zIndex = 999997;
            this.renderConfig.overlayContainer.addChild(this.previewGraphics as DisplayObject);
            this.previewAdded = true;
        }

        // 监听来自 Bridge 的工具切换
        this.world.on(StageEvents.TOOL_CHANGE, (tool: ToolMode) => {
            this.toolComponent.mode = tool;
            this.toolComponent.isDrawing = false;
            this.previewGraphics.clear();
        });
    }

    update(): void {
        if (!this.pointerComponent) return;

        // 处理键盘快捷键
        this.handleKeyboardShortcuts();

        const mode = this.toolComponent.mode;

        switch (mode) {
            case 'hand':
                this.handleHandMode();
                break;
            case 'rect':
            case 'circle':
                this.handleShapeDrawMode(mode);
                break;
            case 'text':
                this.handleTextMode();
                break;
            case 'mindmap':
                this.handleMindMapMode();
                break;
        }
    }

    // ==================== 键盘快捷键 ====================

    private handleKeyboardShortcuts(): void {
        if (!this.keyboardComponent) return;
        const keyMap = this.keyboardComponent.keyMap;
        const ctrlDown = keyMap.get(KeyboardKey.Control) || keyMap.get(KeyboardKey.Meta);
        const shiftDown = keyMap.get(KeyboardKey.Shift);

        // Ctrl+A 全选
        if (ctrlDown && (keyMap.get(KeyboardKey.Keya) || keyMap.get(KeyboardKey.KeyA))) {
            keyMap.set(KeyboardKey.Keya, false);
            keyMap.set(KeyboardKey.KeyA, false);
            if (this.eventManager) {
                const event = new SelectEvent({
                    data: { operation: SelectOperation.SelectAll },
                });
                this.eventManager.sendEvent(event);
            }
            return;
        }

        // Ctrl+C 复制
        if (ctrlDown && (keyMap.get(KeyboardKey.Keyc) || keyMap.get(KeyboardKey.KeyC))) {
            keyMap.set(KeyboardKey.Keyc, false);
            keyMap.set(KeyboardKey.KeyC, false);
            this.world.emit(StageEvents.CLIPBOARD_COPY);
            return;
        }

        // Ctrl+V 粘贴
        if (ctrlDown && (keyMap.get(KeyboardKey.Keyv) || keyMap.get(KeyboardKey.KeyV))) {
            keyMap.set(KeyboardKey.Keyv, false);
            keyMap.set(KeyboardKey.KeyV, false);
            this.world.emit(StageEvents.CLIPBOARD_PASTE);
            return;
        }

        // Ctrl+D 原地复制
        if (ctrlDown && (keyMap.get(KeyboardKey.Keyd) || keyMap.get(KeyboardKey.KeyD))) {
            keyMap.set(KeyboardKey.Keyd, false);
            keyMap.set(KeyboardKey.KeyD, false);
            this.world.emit(StageEvents.DUPLICATE);
            return;
        }

        // Delete / Backspace 删除选中
        if (keyMap.get(KeyboardKey.Delete) || keyMap.get(KeyboardKey.Backspace)) {
            keyMap.set(KeyboardKey.Delete, false);
            keyMap.set(KeyboardKey.Backspace, false);
            this.deleteSelected();
            return;
        }

        // 方向键微调选中实体位置
        const nudgeAmount = shiftDown ? 10 : 1;
        if (keyMap.get(KeyboardKey.ArrowLeft)) {
            keyMap.set(KeyboardKey.ArrowLeft, false);
            this.nudgeSelected(-nudgeAmount, 0);
            return;
        }
        if (keyMap.get(KeyboardKey.ArrowRight)) {
            keyMap.set(KeyboardKey.ArrowRight, false);
            this.nudgeSelected(nudgeAmount, 0);
            return;
        }
        if (keyMap.get(KeyboardKey.ArrowUp)) {
            keyMap.set(KeyboardKey.ArrowUp, false);
            this.nudgeSelected(0, -nudgeAmount);
            return;
        }
        if (keyMap.get(KeyboardKey.ArrowDown)) {
            keyMap.set(KeyboardKey.ArrowDown, false);
            this.nudgeSelected(0, nudgeAmount);
            return;
        }

        // 不在 Ctrl 组合键时才处理工具切换
        if (ctrlDown) return;

        // V -> select（仅在非 Ctrl 时）
        if (keyMap.get(KeyboardKey.Keyv) || keyMap.get(KeyboardKey.KeyV)) {
            keyMap.set(KeyboardKey.Keyv, false);
            keyMap.set(KeyboardKey.KeyV, false);
            this.switchTool('select');
        }
        // H -> hand
        if (keyMap.get(KeyboardKey.Keyh) || keyMap.get(KeyboardKey.KeyH)) {
            keyMap.set(KeyboardKey.Keyh, false);
            keyMap.set(KeyboardKey.KeyH, false);
            this.switchTool('hand');
        }
        // R -> rect
        if (keyMap.get(KeyboardKey.Keyr) || keyMap.get(KeyboardKey.KeyR)) {
            keyMap.set(KeyboardKey.Keyr, false);
            keyMap.set(KeyboardKey.KeyR, false);
            this.switchTool('rect');
        }
        // O -> circle
        if (keyMap.get(KeyboardKey.Keyo) || keyMap.get(KeyboardKey.KeyO)) {
            keyMap.set(KeyboardKey.Keyo, false);
            keyMap.set(KeyboardKey.KeyO, false);
            this.switchTool('circle');
        }
        // T -> text
        if (keyMap.get(KeyboardKey.Keyt) || keyMap.get(KeyboardKey.KeyT)) {
            keyMap.set(KeyboardKey.Keyt, false);
            keyMap.set(KeyboardKey.KeyT, false);
            this.switchTool('text');
        }
        // M -> mindmap
        if (keyMap.get(KeyboardKey.Keym) || keyMap.get(KeyboardKey.KeyM)) {
            keyMap.set(KeyboardKey.Keym, false);
            keyMap.set(KeyboardKey.KeyM, false);
            this.switchTool('mindmap');
        }
    }

    /** 方向键微调选中实体位置 */
    private nudgeSelected(dx: number, dy: number): void {
        if (!this.selectionState) return;
        const selected = this.selectionState.getSelectedArray();
        if (selected.length === 0) return;

        selected.forEach(entity => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.x += dx;
                layout.y += dy;
                layout.dirty = true;
            }
        });

        // 触发布局更新
        if (this.eventManager) {
            const layoutEvent = new LayoutEvent({
                data: { entities: selected },
            });
            this.eventManager.sendEvent(layoutEvent);
        }

        this.world.emit(StageEvents.ENTITY_MOVE, {
            entities: selected.map(e => e.name),
        });
    }

    private switchTool(tool: ToolMode): void {
        this.toolComponent.mode = tool;
        this.toolComponent.isDrawing = false;
        this.previewGraphics.clear();
        this.world.emit(StageEvents.TOOL_CHANGE, tool);
    }

    private deleteSelected(): void {
        if (!this.selectionState) return;
        const selected = this.selectionState.getSelectedArray();
        if (selected.length === 0) return;

        // 收集所有需要删除的实体（包括思维导图子节点和连线）
        const toDelete = new Set<Entity>();
        selected.forEach(entity => {
            this.collectEntityAndDescendants(entity, toDelete);
        });

        // 执行删除
        toDelete.forEach(entity => {
            entity.destory();
        });

        this.selectionState.clearSelection();
        this.world.emit(StageEvents.SELECTION_CHANGE, { selectedEntities: [] });
        this.world.emit(StageEvents.ENTITY_REMOVE, null);
    }

    /** 递归收集实体及其思维导图子节点和连线 */
    private collectEntityAndDescendants(entity: Entity, result: Set<Entity>): void {
        if (result.has(entity)) return;
        result.add(entity);

        const mindMapComp = entity.getComponent(MindMapNodeComponent);
        if (mindMapComp) {
            // 收集连线实体
            if (mindMapComp.connectionEntity) {
                result.add(mindMapComp.connectionEntity);
            }
            // 递归收集子节点
            entity.children.forEach(child => {
                if (child.getComponent(MindMapNodeComponent)) {
                    this.collectEntityAndDescendants(child, result);
                }
            });
        }
    }

    // ==================== 工具模式处理 ====================

    /** 手型工具 — 拖拽平移视口 */
    private handleHandMode(): void {
        const pointer = this.pointerComponent!;

        if (pointer.isButtonDown(PointerButtons.PRIMARY) && pointer.isMoving) {
            const event = new ViewportEvent({
                data: {
                    operation: ViewportOperation.Pan,
                    deltaScreenX: pointer.deltaX,
                    deltaScreenY: pointer.deltaY,
                },
            });
            this.eventManager?.sendEvent(event);
        }
    }

    /** 矩形/圆形绘制模式（含实时预览） */
    private handleShapeDrawMode(mode: 'rect' | 'circle'): void {
        const pointer = this.pointerComponent!;
        const tool = this.toolComponent;

        // 开始绘制
        if (pointer.hasButtonDown(PointerButtons.PRIMARY) && !tool.isDrawing) {
            tool.isDrawing = true;
            tool.drawStartX = pointer.x;
            tool.drawStartY = pointer.y;
            tool.drawCurrentX = pointer.x;
            tool.drawCurrentY = pointer.y;
        }

        // 绘制中 — 更新预览
        if (tool.isDrawing && pointer.isMoving) {
            tool.drawCurrentX = pointer.x;
            tool.drawCurrentY = pointer.y;
        }

        // 绘制预览
        if (tool.isDrawing) {
            this.drawPreview(mode);
        }

        // 结束绘制
        if (tool.isDrawing && pointer.hasPointerUp) {
            const rect = tool.getDrawRect();
            tool.isDrawing = false;
            this.previewGraphics.clear();

            // 最小尺寸检查
            if (rect.width < 5 && rect.height < 5) {
                rect.width = mode === 'rect' ? 100 : 80;
                rect.height = mode === 'rect' ? 80 : 80;
            }

            if (mode === 'rect') {
                this.elementFactory?.createRect({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                });
            } else {
                const radius = Math.min(rect.width, rect.height) / 2;
                this.elementFactory?.createCircle({
                    x: rect.x,
                    y: rect.y,
                    radius: Math.max(radius, 20),
                    width: Math.max(rect.width, 40),
                    height: Math.max(rect.height, 40),
                });
            }

            // 创建完成后自动切回选择模式
            this.switchTool('select');
        }
    }

    /** 绘制预览图形 */
    private drawPreview(mode: 'rect' | 'circle'): void {
        const g = this.previewGraphics;
        g.clear();

        const rect = this.toolComponent.getDrawRect();
        if (rect.width < 1 && rect.height < 1) return;

        const scale = this.viewportComponent?.scale ?? 1;
        const lineWidth = 1.5 / scale;

        g.lineStyle(lineWidth, PREVIEW_STROKE, PREVIEW_STROKE_ALPHA);
        g.beginFill(PREVIEW_FILL, PREVIEW_FILL_ALPHA);

        if (mode === 'rect') {
            g.drawRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;
            g.drawEllipse(cx, cy, rect.width / 2, rect.height / 2);
        }

        g.endFill();
    }

    /** 文本工具 — 点击创建文本 */
    private handleTextMode(): void {
        const pointer = this.pointerComponent!;

        if (pointer.hasButtonDown(PointerButtons.PRIMARY)) {
            this.elementFactory?.createText({
                x: pointer.x,
                y: pointer.y,
                text: 'Text',
                fontSize: 16,
            });

            this.switchTool('select');
        }
    }

    /** 思维导图工具 — 点击创建根节点 */
    private handleMindMapMode(): void {
        const pointer = this.pointerComponent!;

        if (pointer.hasButtonDown(PointerButtons.PRIMARY)) {
            // 检查点击位置是否已有思维导图节点（如果有则不创建新的）
            // 简单实现：直接创建根节点
            this.mindMapFactory?.createRootNode({
                text: '中心主题',
                x: pointer.x,
                y: pointer.y,
            });

            this.switchTool('select');
        }
    }
}
