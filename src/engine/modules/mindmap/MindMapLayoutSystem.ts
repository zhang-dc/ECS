import { Entity } from '../../Entity';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { MindMapNodeComponent } from './MindMapNodeComponent';
import { MindMapCommandSystem } from './MindMapCommandSystem';

/** 布局参数 */
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 16;

/**
 * 思维导图布局系统
 *
 * 职责：
 * - 当 MindMapCommandSystem.needsRelayout 为 true 时执行树形自动布局
 * - 递归计算子树高度
 * - 递归定位子节点（写入局部坐标）
 * - 布局完成后发送 LayoutEvent 触发 LayoutSystem 更新渲染坐标
 */
export class MindMapLayoutSystem extends System {
    private eventManager?: EventManager;
    private commandSystem?: MindMapCommandSystem;

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    /** 设置对 MindMapCommandSystem 的引用（由 Scene 初始化时注入） */
    setCommandSystem(commandSystem: MindMapCommandSystem): void {
        this.commandSystem = commandSystem;
    }

    update(): void {
        if (!this.commandSystem?.needsRelayout) return;

        this.relayoutAll();
        this.commandSystem.needsRelayout = false;
    }

    private relayoutAll(): void {
        const rootNodes = this.findRootNodes();
        rootNodes.forEach(root => {
            this.layoutTree(root);
        });
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

    private layoutTree(root: Entity): void {
        const rootLayout = root.getComponent(LayoutComponent);
        if (!rootLayout) return;

        const subtreeHeights = new Map<Entity, number>();
        this.calculateSubtreeHeight(root, subtreeHeights);

        const rootWorldX = rootLayout.x;
        const rootWorldY = rootLayout.y;
        this.positionChildren(
            root,
            rootWorldX + rootLayout.width + HORIZONTAL_GAP,
            rootWorldY,
            subtreeHeights,
            rootWorldX,
            rootWorldY,
        );
    }

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

        let totalHeight = 0;
        visibleChildren.forEach((child, index) => {
            totalHeight += heights.get(child) || 0;
            if (index > 0) totalHeight += VERTICAL_GAP;
        });

        const parentCenterWorld = parentWorldY + parentLayout.height / 2;
        let currentY = parentCenterWorld - totalHeight / 2;

        visibleChildren.forEach(child => {
            const childLayout = child.getComponent(LayoutComponent);
            const childHeight = heights.get(child) || 0;
            if (!childLayout) return;

            const childNodeWorldY = currentY + (childHeight - childLayout.height) / 2;

            childLayout.x = startX - parentWorldX;
            childLayout.y = childNodeWorldY - parentWorldY;
            childLayout.dirty = true;

            const childWorldX = parentWorldX + childLayout.x;
            const childWorldY = parentWorldY + childLayout.y;

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
}
