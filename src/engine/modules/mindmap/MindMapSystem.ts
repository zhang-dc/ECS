import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../hitTest/HitTestComponent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
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

/** 布局参数 */
const HORIZONTAL_GAP = 60;  // 父子节点水平间距
const VERTICAL_GAP = 16;    // 兄弟节点垂直间距
const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 8;

/**
 * 思维导图系统
 * - 监听键盘事件（Tab=添加子节点, Enter=添加兄弟节点, Delete=删除）
 * - 监听 MindMapEvent 执行操作
 * - 自动布局（树形水平布局）
 * - 更新连线
 */
export class MindMapSystem extends System {
    private eventManager?: EventManager;
    private selectionState?: SelectionState;
    private keyboardComponent?: KeyboardComponent;
    private renderConfig?: RenderConfig;

    /** 需要重新布局的标志 */
    private needsRelayout: boolean = false;
    /** 上一帧的按键状态（防止连续触发） */
    private prevKeyStates: Map<string, boolean> = new Map();

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.selectionState = this.world.findComponent(SelectionState);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
        this.renderConfig = this.world.findComponent(RenderConfig);
    }

    update(): void {
        // 处理 MindMapEvent
        this.processMindMapEvents();

        // 处理键盘快捷键
        this.processKeyboard();

        // 执行自动布局
        if (this.needsRelayout) {
            this.relayoutAll();
            this.needsRelayout = false;
        }

        // 每帧更新连线（因为节点可能被拖拽）
        this.updateAllConnections();
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

        const selectedEntities = this.selectionState.getSelectedArray();
        if (selectedEntities.length !== 1) return;

        const entity = selectedEntities[0];
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return; // 只处理思维导图节点

        // Tab: 添加子节点
        this.handleKeyOnce(KeyboardKey.Tab, () => {
            this.addChildNode(entity);
        });

        // Enter: 添加兄弟节点
        this.handleKeyOnce(KeyboardKey.Enter, () => {
            this.addSiblingNode(entity);
        });

        // Delete/Backspace: 删除节点
        this.handleKeyOnce(KeyboardKey.Delete, () => {
            this.deleteNode(entity);
        });
        this.handleKeyOnce(KeyboardKey.Backspace, () => {
            this.deleteNode(entity);
        });

        // Space: 折叠/展开
        this.handleKeyOnce(KeyboardKey.Space, () => {
            this.toggleCollapse(entity);
        });
    }

    /** 按键单次触发（按下一次只执行一次） */
    private handleKeyOnce(key: KeyboardKey, callback: () => void): void {
        const isDown = this.keyboardComponent?.isKeyDown(key) ?? false;
        const wasDown = this.prevKeyStates.get(key) ?? false;
        this.prevKeyStates.set(key, isDown);

        if (isDown && !wasDown) {
            callback();
        }
    }

    // ==================== 节点操作 ====================

    private addChildNode(parentEntity: Entity, text?: string): void {
        const parentMindMap = parentEntity.getComponent(MindMapNodeComponent);
        if (!parentMindMap) return;

        // 如果折叠了，先展开
        if (parentMindMap.collapsed) {
            parentMindMap.collapsed = false;
            this.setChildrenVisibility(parentEntity, true);
        }

        const level = parentMindMap.level + 1;
        const nodeText = text || (level === 1 ? '分支主题' : '子主题');

        const newEntity = this.createNodeInline(parentEntity, nodeText, level);
        this.needsRelayout = true;

        // 自动选中新节点并触发文本编辑
        this.autoSelectAndEdit(newEntity);
    }

    private addSiblingNode(entity: Entity, text?: string): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap || mindMap.level === 0) return; // 根节点无兄弟

        const parentEntity = entity.parent;
        if (!parentEntity) return;

        const nodeText = text || (mindMap.level === 1 ? '分支主题' : '子主题');
        const newEntity = this.createNodeInline(parentEntity, nodeText, mindMap.level);
        this.needsRelayout = true;

        // 自动选中新节点并触发文本编辑
        this.autoSelectAndEdit(newEntity);
    }

    /** 自动选中新节点并请求文本编辑 */
    private autoSelectAndEdit(entity: Entity): void {
        // 清除当前选中，选中新节点
        if (this.selectionState) {
            this.selectionState.selectedEntities.clear();
            this.selectionState.selectedEntities.add(entity);
            this.world.emit(StageEvents.SELECTION_CHANGE, {
                selected: [entity.name],
            });
        }

        // 请求文本编辑（TextEditSystem 会延迟几帧等布局完成）
        this.world.emit(StageEvents.TEXT_EDIT_REQUEST, entity);
    }

    private deleteNode(entity: Entity): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap || mindMap.level === 0) return; // 根节点不可删除

        // 递归删除子节点
        const children = [...entity.children];
        children.forEach(child => {
            if (child.getComponent(MindMapNodeComponent)) {
                this.deleteNode(child);
            }
        });

        // 删除连线
        if (mindMap.connectionEntity) {
            mindMap.connectionEntity.destory();
        }

        // 清除选中
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

            // 隐藏/显示渲染器
            const shapeRenderer = child.getComponent(ShapeRenderer);
            const richTextRenderer = child.getComponent(RichTextRenderer);
            if (shapeRenderer) shapeRenderer.renderObject.visible = visible;
            if (richTextRenderer) richTextRenderer.renderObject.visible = visible;

            // 隐藏/显示连线
            if (childMindMap.connectionEntity) {
                const connRenderer = childMindMap.connectionEntity.getComponent(ConnectionRenderer);
                if (connRenderer) connRenderer.renderObject.visible = visible;
            }

            // 递归处理子节点
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

        // 使用 RichTextComponent.editor 更新文字
        const richTextComp = entity.getComponent(RichTextComponent);
        if (richTextComp) {
            const editor = richTextComp.editor;
            // 全选后替换文字
            editor.selectAll();
            editor.replaceText(text);
            editor.deselection();
            editor.apply();

            // 从 editor 获取排版后的实际尺寸
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

            // 重绘文字
            const richTextRenderer = entity.getComponent(RichTextRenderer);
            if (richTextRenderer) {
                richTextRenderer.drawText(editor);
                richTextRenderer.dirty = true;
            }
        }

        this.needsRelayout = true;
    }

    // ==================== 内联创建节点 ====================

    private createNodeInline(parentEntity: Entity, text: string, level: number): Entity {
        const nodeStyle = getDefaultNodeStyle(level);
        const estimatedTextWidth = text.length * nodeStyle.fontSize * 0.7;
        const estimatedTextHeight = nodeStyle.fontSize * 1.4;
        const nodeWidth = Math.max(estimatedTextWidth + NODE_PADDING_X * 2, 80);
        const nodeHeight = Math.max(estimatedTextHeight + NODE_PADDING_Y * 2, 32);

        const name = `MindMapNode_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const entity = new Entity({ name, world: this.world });

        // MindMapNodeComponent（新建节点默认为占位文本）
        const mindMapComp = new MindMapNodeComponent({ text, level, collapsed: false, nodeStyle, isPlaceholder: true });
        entity.addComponent(mindMapComp);

        // 圆角矩形
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

            // 富文本组件 + 渲染器（替代旧版 TextRenderer）
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

                    // 更新 shape 尺寸
                    const sr = entity.getComponent(ShapeRenderer);
                    if (sr) sr.updateSize(newW, newH);

                    // 更新碰撞检测
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
            richTextRenderer.renderObject.alpha = 0.4; // 占位文本半透明
            entity.addComponent(richTextRenderer);
        }

        // 布局
        const layout = new LayoutComponent({ position: { x: 0, y: 0 }, width: nodeWidth, height: nodeHeight, zIndex: 10 });
        entity.addComponent(layout);

        // 碰撞检测
        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: { offset: [0, 0], size: [nodeWidth, nodeHeight] },
            name: 'Renderer',
        });
        entity.addComponent(hitTest);

        // 选择 + 拖拽
        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        // 建立父子关系
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

        // 连线 Entity 需要 LayoutComponent 以便 RenderSystem 渲染，但 position 保持 (0,0)
        // ConnectionRenderer 自己使用世界坐标绘制，不依赖 LayoutSystem 的位置同步
        const connLayout = new LayoutComponent({ position: { x: 0, y: 0 }, width: 0, height: 0, zIndex: 5 });
        connEntity.addComponent(connLayout);

        this.world.addEntity(connEntity);
        return connEntity;
    }

    // ==================== 自动布局 ====================

    /**
     * 对所有思维导图根节点执行自动布局
     */
    private relayoutAll(): void {
        const rootNodes = this.findRootNodes();
        rootNodes.forEach(root => {
            this.layoutTree(root);
        });
        // 发送 LayoutEvent 触发 LayoutSystem 更新渲染坐标
        if (this.eventManager && rootNodes.length > 0) {
            const layoutEvent = new LayoutEvent({ data: { entities: rootNodes } });
            this.eventManager.sendEvent(layoutEvent);
        }
    }

    private findRootNodes(): Entity[] {
        const roots: Entity[] = [];
        this.world.entities.forEach(entity => {
            const mindMap = entity.getComponent(MindMapNodeComponent);
            if (mindMap && mindMap.level === 0) {
                roots.push(entity);
            }
        });
        return roots;
    }

    /**
     * 水平树形布局算法
     * 根节点在左侧，子节点向右展开
     */
    private layoutTree(root: Entity): void {
        const rootLayout = root.getComponent(LayoutComponent);
        if (!rootLayout) return;

        // 第一步：计算每个子树的高度
        const subtreeHeights = new Map<Entity, number>();
        this.calculateSubtreeHeight(root, subtreeHeights);

        // 第二步：从根节点开始递归定位（根节点无父级，其 x/y 就是世界坐标）
        const rootWorldX = rootLayout.x;
        const rootWorldY = rootLayout.y;
        this.positionChildren(root, rootWorldX + rootLayout.width + HORIZONTAL_GAP, rootWorldY, subtreeHeights, rootWorldX, rootWorldY);
    }

    /**
     * 计算子树高度（递归）
     */
    private calculateSubtreeHeight(entity: Entity, heights: Map<Entity, number>): number {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        const layout = entity.getComponent(LayoutComponent);
        if (!mindMap || !layout) {
            heights.set(entity, 0);
            return 0;
        }

        const visibleChildren = this.getVisibleChildren(entity);
        if (visibleChildren.length === 0 || mindMap.collapsed) {
            const h = layout.height;
            heights.set(entity, h);
            return h;
        }

        let totalChildrenHeight = 0;
        visibleChildren.forEach((child, index) => {
            const childHeight = this.calculateSubtreeHeight(child, heights);
            totalChildrenHeight += childHeight;
            if (index > 0) {
                totalChildrenHeight += VERTICAL_GAP;
            }
        });

        const h = Math.max(layout.height, totalChildrenHeight);
        heights.set(entity, h);
        return h;
    }

    /**
     * 递归定位子节点
     * parentWorldX/parentWorldY 是父节点的世界坐标，用于将绝对坐标转换为局部坐标
     */
    private positionChildren(
        parent: Entity,
        startX: number,
        _parentCenterY: number,
        heights: Map<Entity, number>,
        parentWorldX: number,
        parentWorldY: number,
    ): void {
        const parentMindMap = parent.getComponent(MindMapNodeComponent);
        const parentLayout = parent.getComponent(LayoutComponent);
        if (!parentMindMap || !parentLayout || parentMindMap.collapsed) return;

        const visibleChildren = this.getVisibleChildren(parent);
        if (visibleChildren.length === 0) return;

        // 计算所有子节点的总高度
        let totalHeight = 0;
        visibleChildren.forEach((child, index) => {
            totalHeight += heights.get(child) || 0;
            if (index > 0) totalHeight += VERTICAL_GAP;
        });

        // 子节点组的起始 Y（居中对齐到父节点中心，使用世界坐标计算）
        const parentCenterWorld = parentWorldY + parentLayout.height / 2;
        let currentY = parentCenterWorld - totalHeight / 2;

        visibleChildren.forEach(child => {
            const childLayout = child.getComponent(LayoutComponent);
            const childHeight = heights.get(child) || 0;
            if (!childLayout) return;

            // 子节点在其子树高度范围内居中（世界坐标）
            const childNodeWorldY = currentY + (childHeight - childLayout.height) / 2;

            // 写入局部坐标（相对于父节点）
            childLayout.x = startX - parentWorldX;
            childLayout.y = childNodeWorldY - parentWorldY;
            childLayout.dirty = true;

            // 子节点的世界坐标
            const childWorldX = parentWorldX + childLayout.x;
            const childWorldY = parentWorldY + childLayout.y;

            // 递归定位孙子节点
            this.positionChildren(
                child,
                childWorldX + childLayout.width + HORIZONTAL_GAP,
                childWorldY + childLayout.height / 2,
                heights,
                childWorldX,
                childWorldY,
            );

            currentY += childHeight + VERTICAL_GAP;
        });
    }

    private getVisibleChildren(entity: Entity): Entity[] {
        return entity.children.filter(child => {
            const mindMap = child.getComponent(MindMapNodeComponent);
            return mindMap !== undefined;
        });
    }

    // ==================== 连线更新 ====================

    /**
     * 更新所有思维导图连线（每帧调用，因为节点可能被拖拽移动）
     */
    private updateAllConnections(): void {
        const connectionRenderers = this.world.findComponents(ConnectionRenderer);
        connectionRenderers.forEach(renderer => {
            if (renderer.sourceEntity && renderer.targetEntity) {
                renderer.dirty = true;
            }
        });
    }
}
