import { BaseComponent } from '../../Component';
import { Entity } from '../../Entity';

/**
 * 全局选择状态管理组件
 * 作为单例挂载在 Selection 实体上，管理当前选中的实体集合
 */
export class SelectionState extends BaseComponent {
    /** 当前选中的实体集合 */
    selectedEntities: Set<Entity> = new Set();
    /** 选择状态是否有变化（用于通知 UI 更新） */
    dirty: boolean = false;
    /** 是否正在框选中 */
    isMarqueeSelecting: boolean = false;
    /** 框选起始点（世界坐标） */
    marqueeStartX: number = 0;
    marqueeStartY: number = 0;
    /** 框选当前点（世界坐标） */
    marqueeCurrentX: number = 0;
    marqueeCurrentY: number = 0;

    /** 选中单个实体（替换当前选中） */
    select(entity: Entity): void {
        this.clearSelection();
        this.selectedEntities.add(entity);
        this.dirty = true;
    }

    /** 切换实体的选中状态 */
    toggle(entity: Entity): void {
        if (this.selectedEntities.has(entity)) {
            this.selectedEntities.delete(entity);
        } else {
            this.selectedEntities.add(entity);
        }
        this.dirty = true;
    }

    /** 选中多个实体（替换当前选中） */
    selectMultiple(entities: Entity[]): void {
        this.clearSelection();
        entities.forEach(e => this.selectedEntities.add(e));
        this.dirty = true;
    }

    /** 追加选中多个实体 */
    addToSelection(entities: Entity[]): void {
        entities.forEach(e => this.selectedEntities.add(e));
        this.dirty = true;
    }

    /** 清除所有选中 */
    clearSelection(): void {
        this.selectedEntities.clear();
        this.dirty = true;
    }

    /** 检查实体是否被选中 */
    isSelected(entity: Entity): boolean {
        return this.selectedEntities.has(entity);
    }

    /** 获取选中的实体数组 */
    getSelectedArray(): Entity[] {
        return Array.from(this.selectedEntities);
    }

    /** 获取框选矩形（世界坐标，归一化为正值宽高） */
    getMarqueeRect(): { x: number; y: number; width: number; height: number } | null {
        if (!this.isMarqueeSelecting) {
            return null;
        }
        const x = Math.min(this.marqueeStartX, this.marqueeCurrentX);
        const y = Math.min(this.marqueeStartY, this.marqueeCurrentY);
        const width = Math.abs(this.marqueeCurrentX - this.marqueeStartX);
        const height = Math.abs(this.marqueeCurrentY - this.marqueeStartY);
        return { x, y, width, height };
    }
}
