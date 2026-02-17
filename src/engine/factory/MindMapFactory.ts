import { Application } from 'pixi.js';
import { Entity } from '../Entity';
import { Stage } from '../Stage';
import { LayoutComponent } from '../modules/layout/LayoutComponent';
import { LayoutEvent } from '../modules/layout/LayoutEvent';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../modules/hitTest/HitTestComponent';
import { HitTestName } from '../modules/hitTest/HitTest';
import { SelectComponent } from '../modules/select/SelectComponent';
import { DragComponent } from '../modules/drag/DragComponent';
import { EventManager } from '../modules/event/Event';
import { ShapeRenderer, ShapeType } from '../modules/render/ShapeRenderer';
import { RichTextRenderer } from '../modules/render/RichTextRenderer';
import { ConnectionRenderer, ConnectionLineType } from '../modules/render/ConnectionRenderer';
import { MindMapNodeComponent, getDefaultNodeStyle } from '../modules/mindmap/MindMapNodeComponent';
import { RichTextComponent } from '../modules/text/RichTextComponent';
import { createSimpleEditor } from '../modules/text/createSimpleEditor';

let mindmapCounter = 0;
function nextId(prefix: string): string {
    mindmapCounter++;
    return `${prefix}_${mindmapCounter}`;
}

/** 节点内边距 */
const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 8;
const MIN_NODE_WIDTH = 80;
const MIN_NODE_HEIGHT = 32;

export interface CreateMindMapNodeOptions {
    text?: string;
    x?: number;
    y?: number;
    level?: number;
    parentEntity?: Entity;
}

/**
 * 思维导图工厂
 * 创建思维导图节点（圆角矩形 + 文本 + 连线）
 */
export class MindMapFactory {
    private world: Stage;
    private renderStage: Application;

    constructor(world: Stage, renderStage: Application) {
        this.world = world;
        this.renderStage = renderStage;
    }

    /**
     * 创建思维导图根节点
     */
    createRootNode(options?: { text?: string; x?: number; y?: number }): Entity {
        const { text = '中心主题', x = 400, y = 300 } = options || {};
        return this.createNode({ text, x, y, level: 0 });
    }

    /**
     * 创建子节点并连线到父节点
     */
    createChildNode(parentEntity: Entity, options?: { text?: string }): Entity {
        const parentMindMap = parentEntity.getComponent(MindMapNodeComponent);
        const parentLayout = parentEntity.getComponent(LayoutComponent);
        if (!parentMindMap || !parentLayout) {
            throw new Error('Parent entity is not a mind map node');
        }

        const level = parentMindMap.level + 1;
        const text = options?.text || (level === 1 ? '分支主题' : '子主题');

        // 初始位置：父节点右侧偏移
        const childIndex = parentEntity.children.filter(c => c.getComponent(MindMapNodeComponent)).length;
        const x = parentLayout.x + parentLayout.width + 80;
        const y = parentLayout.y + childIndex * 60;

        const childEntity = this.createNode({ text, x, y, level, parentEntity });
        return childEntity;
    }

    /**
     * 创建兄弟节点
     */
    createSiblingNode(entity: Entity, options?: { text?: string }): Entity | null {
        const parentEntity = entity.parent;
        if (!parentEntity) return null; // 根节点没有兄弟

        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return null;

        const text = options?.text || (mindMap.level === 1 ? '分支主题' : '子主题');
        return this.createChildNode(parentEntity, { text });
    }

    /**
     * 删除思维导图节点（递归删除子节点和连线）
     */
    deleteNode(entity: Entity): void {
        const mindMap = entity.getComponent(MindMapNodeComponent);
        if (!mindMap) return;

        // 根节点不允许删除
        if (mindMap.level === 0) return;

        // 递归删除子节点
        const childNodes = [...entity.children];
        childNodes.forEach(child => {
            if (child.getComponent(MindMapNodeComponent)) {
                this.deleteNode(child);
            }
        });

        // 删除连线实体
        if (mindMap.connectionEntity) {
            mindMap.connectionEntity.destory();
        }

        // 删除节点本身
        entity.destory();
    }

    /**
     * 创建节点实体
     */
    private createNode(options: CreateMindMapNodeOptions): Entity {
        const { text = '新节点', x = 0, y = 0, level = 0, parentEntity } = options;
        const nodeStyle = getDefaultNodeStyle(level);

        // 估算文本尺寸
        const estimatedTextWidth = text.length * nodeStyle.fontSize * 0.7;
        const estimatedTextHeight = nodeStyle.fontSize * 1.4;
        const nodeWidth = Math.max(estimatedTextWidth + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
        const nodeHeight = Math.max(estimatedTextHeight + NODE_PADDING_Y * 2, MIN_NODE_HEIGHT);

        const name = nextId('MindMapNode');
        const entity = new Entity({ name, world: this.world });

        // MindMapNodeComponent（根节点非占位，子节点默认占位）
        const mindMapComp = new MindMapNodeComponent({
            text,
            level,
            collapsed: false,
            nodeStyle,
            isPlaceholder: level > 0,
        });
        entity.addComponent(mindMapComp);

        // 圆角矩形渲染器
        const shapeRenderer = new ShapeRenderer({
            renderStage: this.renderStage,
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

        const editor = createSimpleEditor(
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
                const newW = Math.max(textW + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
                const newH = Math.max(textH + NODE_PADDING_Y * 2, MIN_NODE_HEIGHT);
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

                this.triggerLayout(entity);
            },
        );

        const richTextComp = new RichTextComponent({ editor });
        entity.addComponent(richTextComp);

        const richTextRenderer = new RichTextRenderer({
            renderStage: this.renderStage,
            zIndex: 11,
        });
        richTextRenderer.offsetX = NODE_PADDING_X;
        richTextRenderer.offsetY = NODE_PADDING_Y;
        if (level > 0) {
            richTextRenderer.renderObject.alpha = 0.4;
        }
        entity.addComponent(richTextRenderer);

        // 布局组件
        const layout = new LayoutComponent({
            position: { x, y },
            width: nodeWidth,
            height: nodeHeight,
            zIndex: 10,
        });
        entity.addComponent(layout);

        // 碰撞检测
        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: {
                offset: [0, 0],
                size: [nodeWidth, nodeHeight],
            },
            name: HitTestName.Renderer,
        });
        entity.addComponent(hitTest);

        // 选择 + 拖拽
        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        // 建立父子关系
        if (parentEntity) {
            parentEntity.addChild(entity);

            // 创建连线实体
            const connectionEntity = this.createConnection(parentEntity, entity);
            mindMapComp.connectionEntity = connectionEntity;
        }

        this.world.addEntity(entity);
        this.triggerLayout(entity);

        return entity;
    }

    /**
     * 创建连线实体
     */
    private createConnection(sourceEntity: Entity, targetEntity: Entity): Entity {
        const name = nextId('MindMapConnection');
        const connEntity = new Entity({ name, world: this.world });

        const connectionRenderer = new ConnectionRenderer({
            renderStage: this.renderStage,
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
        connEntity.addComponent(connectionRenderer);

        // 连线 Entity 需要 LayoutComponent 以便 RenderSystem 渲染，但 position 保持 (0,0)
        const connLayout = new LayoutComponent({
            position: { x: 0, y: 0 },
            width: 0,
            height: 0,
            zIndex: 5,
        });
        connEntity.addComponent(connLayout);

        this.world.addEntity(connEntity);

        return connEntity;
    }

    /** 触发布局事件 */
    private triggerLayout(entity: Entity): void {
        const eventManager = this.world.findComponent(EventManager);
        if (eventManager) {
            const layoutEvent = new LayoutEvent({
                data: { entities: [entity] },
            });
            eventManager.sendEvent(layoutEvent);
        }
    }
}
