import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent, getWorldAABB } from '../layout/LayoutComponent';
import { SelectionState } from '../select/SelectionState';
import { GuideComponent, GuideLine } from './GuideComponent';
import { instanceGuideEntity } from './instanceGuideEntity';

/**
 * 辅助线系统
 * 负责计算智能对齐线，为拖拽提供吸附参考
 */
export class GuideSystem extends System {
    eventManager?: EventManager;
    guideComponent: GuideComponent;
    selectionState?: SelectionState;

    constructor(props: SystemProps) {
        super(props);
        const guideEntity = instanceGuideEntity({ world: this.world });
        this.guideComponent = guideEntity.getComponent(GuideComponent)!;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.selectionState = this.world.findComponent(SelectionState);
    }

    update(): void {
        if (!this.guideComponent.showSmartGuides) {
            this.clearGuides();
            return;
        }

        // 只在拖拽中才计算和显示对齐线
        if (!this.world.isDragging) {
            this.clearGuides();
            return;
        }

        // 需要有选中实体
        if (!this.selectionState || this.selectionState.selectedEntities.size === 0) {
            this.clearGuides();
            return;
        }

        this.calculateSmartGuides();
    }

    /** 清除对齐线 */
    private clearGuides(): void {
        if (this.guideComponent.activeGuideLines.length > 0) {
            this.guideComponent.activeGuideLines = [];
            this.guideComponent.dirty = true;
        }
    }

    /**
     * 计算智能对齐线
     * 将选中实体的边缘与其他实体的边缘进行比较
     */
    calculateSmartGuides() {
        const selectedEntities = this.selectionState!.getSelectedArray();
        const threshold = this.guideComponent.snapThreshold;
        const guides: GuideLine[] = [];

        // 获取选中实体的组合 AABB
        const selectedBounds = this.getGroupBounds(selectedEntities);
        if (!selectedBounds) return;

        // 选中实体的关键位置
        const selectedEdges = {
            left: selectedBounds.x,
            right: selectedBounds.x + selectedBounds.width,
            centerX: selectedBounds.x + selectedBounds.width / 2,
            top: selectedBounds.y,
            bottom: selectedBounds.y + selectedBounds.height,
            centerY: selectedBounds.y + selectedBounds.height / 2,
        };

        // 遍历所有非选中实体
        const allLayouts = this.world.findComponents(LayoutComponent);
        allLayouts.forEach(layout => {
            if (!layout.entity) return;
            // 跳过系统实体
            if (this.isSystemEntity(layout.entity)) return;
            // 跳过选中的实体
            if (this.selectionState!.isSelected(layout.entity)) return;

            const aabb = getWorldAABB(layout.entity!);
            if (aabb.width === 0 && aabb.height === 0) return;

            const otherEdges = {
                left: aabb.x,
                right: aabb.x + aabb.width,
                centerX: aabb.x + aabb.width / 2,
                top: aabb.y,
                bottom: aabb.y + aabb.height,
                centerY: aabb.y + aabb.height / 2,
            };

            // 垂直对齐线（X 轴方向）
            const verticalPairs: [number, number][] = [
                [selectedEdges.left, otherEdges.left],
                [selectedEdges.left, otherEdges.right],
                [selectedEdges.left, otherEdges.centerX],
                [selectedEdges.right, otherEdges.left],
                [selectedEdges.right, otherEdges.right],
                [selectedEdges.right, otherEdges.centerX],
                [selectedEdges.centerX, otherEdges.left],
                [selectedEdges.centerX, otherEdges.right],
                [selectedEdges.centerX, otherEdges.centerX],
            ];

            verticalPairs.forEach(([a, b]) => {
                if (Math.abs(a - b) < threshold) {
                    guides.push({ direction: 'vertical', position: b });
                }
            });

            // 水平对齐线（Y 轴方向）
            const horizontalPairs: [number, number][] = [
                [selectedEdges.top, otherEdges.top],
                [selectedEdges.top, otherEdges.bottom],
                [selectedEdges.top, otherEdges.centerY],
                [selectedEdges.bottom, otherEdges.top],
                [selectedEdges.bottom, otherEdges.bottom],
                [selectedEdges.bottom, otherEdges.centerY],
                [selectedEdges.centerY, otherEdges.top],
                [selectedEdges.centerY, otherEdges.bottom],
                [selectedEdges.centerY, otherEdges.centerY],
            ];

            horizontalPairs.forEach(([a, b]) => {
                if (Math.abs(a - b) < threshold) {
                    guides.push({ direction: 'horizontal', position: b });
                }
            });
        });

        // 去重
        const uniqueGuides = this.deduplicateGuides(guides);

        this.guideComponent.activeGuideLines = uniqueGuides;
        this.guideComponent.dirty = true;
    }

    /** 获取一组实体的组合 AABB */
    getGroupBounds(entities: Entity[]): { x: number; y: number; width: number; height: number } | null {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        let hasValid = false;

        entities.forEach(entity => {
            const layout = entity.getComponent(LayoutComponent);
            if (!layout) return;
            const aabb = getWorldAABB(entity);
            if (aabb.width === 0 && aabb.height === 0) return;
            hasValid = true;
            minX = Math.min(minX, aabb.x);
            minY = Math.min(minY, aabb.y);
            maxX = Math.max(maxX, aabb.x + aabb.width);
            maxY = Math.max(maxY, aabb.y + aabb.height);
        });

        if (!hasValid) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /** 去重对齐线 */
    deduplicateGuides(guides: GuideLine[]): GuideLine[] {
        const seen = new Set<string>();
        return guides.filter(guide => {
            const key = `${guide.direction}:${Math.round(guide.position)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /** 判断是否为系统实体 */
    isSystemEntity(entity: Entity): boolean {
        return entity.name === DefaultEntityName.RenderConfig ||
            entity.name === DefaultEntityName.Viewport ||
            entity.name === DefaultEntityName.Pointer ||
            entity.name === DefaultEntityName.EventManager ||
            entity.name === DefaultEntityName.Keyboard ||
            entity.name === DefaultEntityName.Task ||
            entity.name === DefaultEntityName.Selection ||
            entity.name === DefaultEntityName.History ||
            entity.name === DefaultEntityName.Guide;
    }
}
