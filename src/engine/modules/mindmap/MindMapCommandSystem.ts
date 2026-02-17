import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../hitTest/HitTestComponent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { LayoutComponent } from '../layout/LayoutComponent';
import { ConnectionRenderer, ConnectionLineType } from '../render/ConnectionRenderer';
import { RenderConfig } from '../render/RenderConfig';
import { RichTextRenderer } from '../render/RichTextRenderer';
import { ShapeRenderer, ShapeType } from '../render/ShapeRenderer';
import { SelectComponent } from '../select/SelectComponent';
import { RichTextComponent } from '../text/RichTextComponent';
import { createSimpleEditor } from '../text/createSimpleEditor';
import { DragComponent } from '../drag/DragComponent';
import { SelectionState } from '../select/SelectionState';
import { MindMapNodeComponent, getDefaultNodeStyle } from './MindMapNodeComponent';
import { MindMapEvent, MindMapEventType } from './MindMapEvent';

/** 节点内边距 */
const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 8;

/**
 * 思维导图命令系统
 *
 * 职责：
 * - 监听 MindMapEvent 执行节点增删改查
 * - 监听键盘快捷键（Tab, Enter, Delete, Space）
 * - 创建节点 Entity（Shape + RichText + Layout + HitTest + Select + Drag）
 * - 删除节点及其子树
 * - 折叠/展开子节点
 * - 设置 needsRelayout 标志（由 MindMapLayoutSystem 消费）
 */
export class MindMapCommandSystem extends System {
    private eventManager?: EventManager;
    private selectionState?: SelectionState;
    private keyboardComponent?: KeyboardComponent;
    private renderConfig?: RenderConfig;

    /** 需要重新布局的标志（由 MindMapLayoutSystem 读取） */
    needsRelayout: boolean = false;
    /** 上一帧的按键状态（防止连续触发） */
    private prevKeyStates: Map<string, boolean> = new Map();

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.selectionState = this.world.findComponent(SelectionState);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
        this.renderConfig = this.world.findComponent(RenderConfig);
    }

    update(): void {
        this.processMindMapEvents();
        this.processKeyboard();
    }

    // ==================== 事件处理 ====================

    private processMindMapEvents(): void {
        const events = this.eventManager?.getEvents(MindMapEvent);
        events?.forEach(event => {
            switch (event.data.type) {
                case MindMapEventType.AddChild:
                    if (event.data.targetEntity) {
                        this.addChildNode(event.data.targetEntity, event.data.text);
                    }
                    break;
                case MindMapEventType.AddSibling:
                    if (event.data.targetEntity) {
                        this.addSiblingNode(event.data.targetEntity, event.data.text);
                    }
                    break;
                case MindMapEventType.DeleteNode:
                    if (event.data.targetEntity) {
                        this.deleteNode(event.data.targetEntity);
                    }
                    break;
                case MindMapEventType.ToggleCollapse:
                    if (event.data.targetEntity) {
                        this.toggleCollapse(event.data.targetEntity);
                    }
                    break;
                case MindMapEventType.EditText:
                    if (event.data.targetEntity && event.data.text !== undefined) {
                        this.updateNodeText(event.data.targetEntity, event.data.text);
                    }
                    break;
                case MindMapEventType.RelayoutRequest:
                    this.needsRelayout = true;
                    break;
            }
        });
    }

    private processKeyboard(): void {
        if (!this.keyboardComponent || !this.selectionState) return;
        // 文本编辑中不处理脑图快捷键，但仍需同步按键状态
        // 否则退出编辑后 prevKeyStates 与 keyMap 不同步，导致第一次按键被吃掉
        if (this.world.isTextEditing) {
            this.syncPrevKeyStates();
            return;
        }

        const selectedEntities = this.selectionState.getSelectedArray();
        if (selectedEntities.length !== 1) return;

        const entity = selectedEntities[0];
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return;

        this.handleKeyOnce(KeyboardKey.Tab, () => {
            this.addChildNode(entity);
        });

        this.handleKeyOnce(KeyboardKey.Enter, () => {
            this.addSiblingNode(entity);
        });

        this.handleKeyOnce(KeyboardKey.Delete, () => {
            this.deleteNode(entity);
        });
        this.handleKeyOnce(KeyboardKey.Backspace, () => {
            this.deleteNode(entity);
        });

        this.handleKeyOnce(KeyboardKey.Space, () => {
            this.toggleCollapse(entity);
        });
    }

    private handleKeyOnce(key: KeyboardKey, callback: () => void): void {
        const isDown = this.keyboardComponent?.isKeyDown(key) ?? false;
        const wasDown = this.prevKeyStates.get(key) ?? false;
        this.prevKeyStates.set(key, isDown);

        if (isDown && !wasDown) {
            callback();
        }
    }

    private syncPrevKeyStates(): void {
        const keys = [KeyboardKey.Tab, KeyboardKey.Enter, KeyboardKey.Delete, KeyboardKey.Backspace, KeyboardKey.Space];
        for (const key of keys) {
            const isDown = this.keyboardComponent?.isKeyDown(key) ?? false;
            this.prevKeyStates.set(key, isDown);
        }
    }

    // ==================== 节点操作 ====================

    private addChildNode(parentEntity: Entity, text?: string): void {
        const parentMindMap = parentEntity.getComponent(MindMapNodeComponent);
        if (!parentMindMap) return;

        if (parentMindMap.collapsed) {
            parentMindMap.collapsed = false;
            this.setChildrenVisibility(parentEntity, true);
        }

        const level = parentMindMap.level + 1;
        const nodeText = text || (level === 1 ? '分支主题' : '子主题');

        const newEntity = this.createNodeInline(parentEntity, nodeText, level);
        this.needsRelayout = true;

        this.autoSelectAndEdit(newEntity);
    }

    private addSiblingNode(entity: Entity, text?: string): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap || mindMap.level === 0) return;

        const parentEntity = entity.parent;
        if (!parentEntity) return;

        const nodeText = text || (mindMap.level === 1 ? '分支主题' : '子主题');
        const newEntity = this.createNodeInline(parentEntity, nodeText, mindMap.level);
        this.needsRelayout = true;

        this.autoSelectAndEdit(newEntity);
    }

    private autoSelectAndEdit(entity: Entity): void {
        if (this.selectionState) {
            this.selectionState.selectedEntities.clear();
            this.selectionState.selectedEntities.add(entity);
            this.world.emit(StageEvents.SELECTION_CHANGE, {
                selected: [entity.name],
            });
        }
        this.world.emit(StageEvents.TEXT_EDIT_REQUEST, entity);
    }

    private deleteNode(entity: Entity): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap || mindMap.level === 0) return;

        const children = [...entity.children];
        children.forEach(child => {
            if (child.getComponent(MindMapNodeComponent)) {
                this.deleteNode(child);
            }
        });

        if (mindMap.connectionEntity) {
            mindMap.connectionEntity.destory();
        }

        this.selectionState?.selectedEntities.delete(entity);

        entity.destory();
        this.needsRelayout = true;

        this.world.emit(StageEvents.ENTITY_REMOVE, entity);
    }

    private toggleCollapse(entity: Entity): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return;

        mindMap.collapsed = !mindMap.collapsed;
        this.setChildrenVisibility(entity, !mindMap.collapsed);
        this.needsRelayout = true;
    }

    private setChildrenVisibility(entity: Entity, visible: boolean): void {
        entity.children.forEach(child => {
            const childMindMap = child.getComponent(MindMapNodeComponent);
            if (!childMindMap) return;

            const shapeRenderer = child.getComponent(ShapeRenderer);
            const richTextRenderer = child.getComponent(RichTextRenderer);
            if (shapeRenderer) shapeRenderer.renderObject.visible = visible;
            if (richTextRenderer) richTextRenderer.renderObject.visible = visible;

            if (childMindMap.connectionEntity) {
                const connRenderer = childMindMap.connectionEntity.getComponent(ConnectionRenderer);
                if (connRenderer) connRenderer.renderObject.visible = visible;
            }

            if (visible && !childMindMap.collapsed) {
                this.setChildrenVisibility(child, true);
            } else if (!visible) {
                this.setChildrenVisibility(child, false);
            }
        });
    }

    private updateNodeText(entity: Entity, text: string): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return;

        mindMap.text = text;

        const richTextComp = entity.getComponent(RichTextComponent);
        if (richTextComp) {
            const editor = richTextComp.editor;
            editor.selectAll();
            editor.replaceText(text);
            editor.deselection();
            editor.apply();

            const textW = Math.max(editor.width, 20);
            const textH = Math.max(editor.height, mindMap.nodeStyle.fontSize * 1.4);
            const nodeWidth = Math.max(textW + NODE_PADDING_X * 2, 80);
            const nodeHeight = Math.max(textH + NODE_PADDING_Y * 2, 32);

            const shapeRenderer = entity.getComponent(ShapeRenderer);
            if (shapeRenderer) {
                shapeRenderer.updateSize(nodeWidth, nodeHeight);
            }

            const layoutComp = entity.getComponent(LayoutComponent);
            if (layoutComp) {
                layoutComp.width = nodeWidth;
                layoutComp.height = nodeHeight;
                layoutComp.dirty = true;
            }

            const hitTestComp = entity.getComponent(HitTestComponent);
            if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                (hitTestComp.data.options as RectHitTestProps).size = [nodeWidth, nodeHeight];
            }

            const richTextRenderer = entity.getComponent(RichTextRenderer);
            if (richTextRenderer) {
                richTextRenderer.drawText(editor);
                richTextRenderer.dirty = true;
            }
        }

        this.needsRelayout = true;
    }

    // ==================== 内联创建节点 ====================

    createNodeInline(parentEntity: Entity, text: string, level: number): Entity {
        const nodeStyle = getDefaultNodeStyle(level);
        const estimatedTextWidth = text.length * nodeStyle.fontSize * 0.7;
        const estimatedTextHeight = nodeStyle.fontSize * 1.4;
        const nodeWidth = Math.max(estimatedTextWidth + NODE_PADDING_X * 2, 80);
        const nodeHeight = Math.max(estimatedTextHeight + NODE_PADDING_Y * 2, 32);

        const name = `MindMapNode_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const entity = new Entity({ name, world: this.world });

        const mindMapComp = new MindMapNodeComponent({ text, level, collapsed: false, nodeStyle, isPlaceholder: true });
        entity.addComponent(mindMapComp);

        if (this.renderConfig) {
            const shapeRenderer = new ShapeRenderer({
                renderStage: this.renderConfig.renderStage,
                zIndex: 10,
                shapeType: ShapeType.RoundedRectangle,
                width: nodeWidth,
                height: nodeHeight,
                cornerRadius: nodeStyle.cornerRadius,
                style: {
                    fillColor: nodeStyle.fillColor,
                    strokeColor: nodeStyle.strokeColor,
                    strokeWidth: nodeStyle.strokeWidth,
                },
            });
            entity.addComponent(shapeRenderer);

            const textColor = nodeStyle.textColor;
            const cr = ((textColor >> 16) & 0xff) / 255;
            const cg = ((textColor >> 8) & 0xff) / 255;
            const cb = (textColor & 0xff) / 255;

            const richEditor = createSimpleEditor(
                {
                    text,
                    fontSize: nodeStyle.fontSize,
                    color: { r: cr, g: cg, b: cb, a: 1 },
                    fontFamily: 'Inter',
                    textAutoResize: 'WIDTH_AND_HEIGHT',
                },
                (readyEditor) => {
                    const rc = entity.getComponent(RichTextComponent);
                    const rr = entity.getComponent(RichTextRenderer);
                    const lc = entity.getComponent(LayoutComponent);
                    if (!rc || !rr || !lc) return;

                    const textW = Math.max(readyEditor.width, 20);
                    const textH = Math.max(readyEditor.height, nodeStyle.fontSize * 1.4);
                    const newW = Math.max(textW + NODE_PADDING_X * 2, 80);
                    const newH = Math.max(textH + NODE_PADDING_Y * 2, 32);
                    lc.width = newW;
                    lc.height = newH;
                    lc.dirty = true;

                    const sr = entity.getComponent(ShapeRenderer);
                    if (sr) sr.updateSize(newW, newH);

                    const ht = entity.getComponent(HitTestComponent);
                    if (ht && ht.data.type === HitTestType.Rect) {
                        (ht.data.options as RectHitTestProps).size = [newW, newH];
                    }

                    rc.needsRender = true;
                    rr.drawText(readyEditor);
                    rr.dirty = true;

                    this.needsRelayout = true;
                },
            );

            const richTextComp = new RichTextComponent({ editor: richEditor });
            entity.addComponent(richTextComp);

            const richTextRenderer = new RichTextRenderer({
                renderStage: this.renderConfig.renderStage,
                zIndex: 11,
            });
            richTextRenderer.offsetX = NODE_PADDING_X;
            richTextRenderer.offsetY = NODE_PADDING_Y;
            richTextRenderer.renderObject.alpha = 0.4;
            entity.addComponent(richTextRenderer);
        }

        const layout = new LayoutComponent({ position: { x: 0, y: 0 }, width: nodeWidth, height: nodeHeight, zIndex: 10 });
        entity.addComponent(layout);

        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: { offset: [0, 0], size: [nodeWidth, nodeHeight] },
            name: 'Renderer',
        });
        entity.addComponent(hitTest);

        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        parentEntity.addChild(entity);

        // 创建连线
        const connEntity = this.createConnectionInline(parentEntity, entity);
        mindMapComp.connectionEntity = connEntity;

        this.world.addEntity(entity);
        this.world.emit(StageEvents.ENTITY_ADD, entity);

        return entity;
    }

    private createConnectionInline(sourceEntity: Entity, targetEntity: Entity): Entity {
        const name = `MindMapConn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const connEntity = new Entity({ name, world: this.world });

        if (this.renderConfig) {
            const connRenderer = new ConnectionRenderer({
                renderStage: this.renderConfig.renderStage,
                zIndex: 5,
                sourceEntity,
                targetEntity,
                lineType: ConnectionLineType.Bezier,
                style: {
                    color: 0xBBBBBB,
                    width: 2,
                    alpha: 1,
                    showArrow: false,
                    arrowSize: 0,
                },
            });
            connEntity.addComponent(connRenderer);
        }

        const connLayout = new LayoutComponent({ position: { x: 0, y: 0 }, width: 0, height: 0, zIndex: 5 });
        connEntity.addComponent(connLayout);

        this.world.addEntity(connEntity);
        return connEntity;
    }
}
