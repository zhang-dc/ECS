import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System } from '../../System';
import { ElementFactory } from '../../factory/ElementFactory';
import { EventManager } from '../event/Event';
import { GuideComponent } from '../guide/GuideComponent';
import { InteractType } from '../interact/Interact';
import { InteractEvent } from '../interact/InteractEvent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { LayoutComponent, getWorldAABB } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { SelectionState } from '../select/SelectionState';
import { ToolComponent } from '../tool/ToolComponent';
import { DragComponent } from './DragComponent';
import { DragEvent, DragStatus } from './DragEvent';

export class DragSystem extends System {
    eventManager?: EventManager;
    /** 正在拖拽的实体列表（支持多选拖拽） */
    dragEntities: Entity[] = [];
    pointerComponent?: PointerComponent;
    selectionState?: SelectionState;
    toolComponent?: ToolComponent;
    guideComponent?: GuideComponent;
    keyboardComponent?: KeyboardComponent;

    /** 拖拽开始时每个实体的位置快照 */
    private dragStartPositions: Map<Entity, { x: number; y: number }> = new Map();
    /** 拖拽开始时鼠标的世界坐标 */
    private pointerStartX: number = 0;
    private pointerStartY: number = 0;

    // ===== Option+拖拽复制相关 =====
    private elementFactory?: ElementFactory;
    /** 当前是否处于 Alt 复制拖拽模式 */
    private isAltDragCopy: boolean = false;
    /** Alt 复制模式下，原始实体列表（原件） */
    private originalEntities: Entity[] = [];
    /** Alt 复制模式下，克隆出的副本实体列表 */
    private clonedEntities: Entity[] = [];
    /** 原始实体在拖拽开始时的位置快照（用于 Alt 切换时恢复原件位置） */
    private originalStartPositions: Map<Entity, { x: number; y: number }> = new Map();

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.selectionState = this.world.findComponent(SelectionState);
        this.toolComponent = this.world.findComponent(ToolComponent);
        this.guideComponent = this.world.findComponent(GuideComponent);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);

        // 初始化 ElementFactory
        const renderStage = ElementFactory.getRenderStageFromWorld(this.world);
        if (renderStage) {
            this.elementFactory = new ElementFactory(this.world, renderStage);
        }
    }

    update(): void {
        // 只在 select 模式下处理拖拽（或正在拖拽中时继续处理）
        if (this.toolComponent && this.toolComponent.mode !== 'select' && this.dragEntities.length === 0) {
            return;
        }

        // resize 期间跳过拖拽处理，避免与 ResizeSystem 冲突导致抖动
        if (this.world.isResizing) {
            return;
        }

        // 文本编辑期间跳过拖拽处理，由 TextEditSystem 完全接管
        if (this.world.isTextEditing && this.dragEntities.length === 0) {
            return;
        }

        const pointerEvents = this.eventManager?.getEvents(InteractEvent);

        pointerEvents?.forEach(event => {
            const { entity } = event;
            if (event.data.type === InteractType.PointerDown && entity) {
                this.handleDragStart(entity);
            }
            if (event.data.type === InteractType.PointerUp) {
                this.handleDragEnd();
            }
            if (event.data.type === InteractType.PointerMove) {
                this.handleDragging();
            }
        });
    }

    handleDragStart(entity: Entity): void {
        // 检查实体是否有 DragComponent 且允许拖拽
        const dragComp = entity.getComponent(DragComponent);
        if (!dragComp?.draggable) {
            return;
        }

        // 如果点击的实体在选中集合中，拖拽所有选中的实体
        if (this.selectionState?.isSelected(entity)) {
            this.dragEntities = this.selectionState.getSelectedArray().filter(e => {
                const dc = e.getComponent(DragComponent);
                return dc?.draggable;
            });
        } else {
            this.dragEntities = [entity];
        }

        this.world.isDragging = true;

        // 记录拖拽起始时的鼠标位置和每个实体的位置
        if (this.pointerComponent) {
            this.pointerStartX = this.pointerComponent.x;
            this.pointerStartY = this.pointerComponent.y;
        }
        this.dragStartPositions.clear();
        this.dragEntities.forEach(e => {
            const layout = e.getComponent(LayoutComponent);
            if (layout) {
                this.dragStartPositions.set(e, { x: layout.x, y: layout.y });
            }
        });

        // ===== Option(Alt)+拖拽复制 =====
        // 保存原始实体引用和位置（无论是否按 Alt，都先记录，方便后续切换）
        this.originalEntities = [...this.dragEntities];
        this.originalStartPositions.clear();
        this.dragEntities.forEach(e => {
            const pos = this.dragStartPositions.get(e);
            if (pos) {
                this.originalStartPositions.set(e, { ...pos });
            }
        });

        // 如果按住 Alt 键，立即进入复制拖拽模式
        const altDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Alt) ?? false;
        if (altDown) {
            this.enterAltDragCopy();
        } else {
            this.isAltDragCopy = false;
            this.clonedEntities = [];
        }

        this.dragEntities.forEach(e => {
            this.sendDragEvent({
                entity: e,
                status: DragStatus.Start,
            });
        });
    }

    /**
     * 进入 Alt 复制拖拽模式：
     * 1. 将原件恢复到起始位置
     * 2. 克隆原件作为副本
     * 3. 将拖拽目标切换为副本
     * 4. 更新选中状态为副本
     */
    private enterAltDragCopy(): void {
        if (this.isAltDragCopy || !this.elementFactory) return;
        this.isAltDragCopy = true;

        // 1. 将原件恢复到起始位置
        this.originalEntities.forEach(e => {
            const layout = e.getComponent(LayoutComponent);
            const startPos = this.originalStartPositions.get(e);
            if (layout && startPos) {
                layout.x = startPos.x;
                layout.y = startPos.y;
                layout.dirty = true;
            }
        });
        // 发送布局事件让原件位置更新到渲染层
        if (this.originalEntities.length > 0) {
            const layoutEvent = new LayoutEvent({
                data: { entities: this.originalEntities },
            });
            this.eventManager?.sendEvent(layoutEvent);
        }

        // 2. 克隆原件（偏移量为 0，位置由拖拽逻辑控制）
        this.clonedEntities = [];
        const cloneMap = new Map<Entity, Entity>(); // 原件 -> 副本
        this.originalEntities.forEach(original => {
            const cloned = this.elementFactory!.cloneEntity(original, 0, 0);
            if (cloned) {
                this.clonedEntities.push(cloned);
                cloneMap.set(original, cloned);
            }
        });

        // 3. 切换拖拽目标为副本，并建立位置快照
        this.dragEntities = this.clonedEntities;
        this.dragStartPositions.clear();
        this.clonedEntities.forEach(clone => {
            const layout = clone.getComponent(LayoutComponent);
            if (layout) {
                this.dragStartPositions.set(clone, { x: layout.x, y: layout.y });
            }
        });

        // 4. 更新选中状态为副本
        if (this.selectionState && this.clonedEntities.length > 0) {
            this.selectionState.selectMultiple(this.clonedEntities);
        }
    }

    /**
     * 退出 Alt 复制拖拽模式：
     * 1. 删除克隆的副本
     * 2. 将拖拽目标切换回原件
     * 3. 恢复选中状态为原件
     */
    private exitAltDragCopy(): void {
        if (!this.isAltDragCopy) return;
        this.isAltDragCopy = false;

        // 1. 删除克隆的副本
        this.clonedEntities.forEach(clone => {
            clone.destory();
        });
        this.clonedEntities = [];

        // 2. 切换拖拽目标回原件，使用原始起始位置作为快照
        this.dragEntities = [...this.originalEntities];
        this.dragStartPositions.clear();
        this.originalEntities.forEach(e => {
            const startPos = this.originalStartPositions.get(e);
            if (startPos) {
                this.dragStartPositions.set(e, { ...startPos });
            }
        });

        // 3. 恢复选中状态为原件
        if (this.selectionState && this.originalEntities.length > 0) {
            this.selectionState.selectMultiple(this.originalEntities);
        }
    }

    handleDragging() {
        if (!this.dragEntities.length || !this.pointerComponent) {
            return;
        }

        // ===== 拖拽过程中检测 Alt 键状态变化 =====
        const altDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Alt) ?? false;
        if (altDown && !this.isAltDragCopy && this.originalEntities.length > 0) {
            // Alt 刚按下：进入复制模式
            this.enterAltDragCopy();
        } else if (!altDown && this.isAltDragCopy) {
            // Alt 刚松开：退出复制模式
            this.exitAltDragCopy();
        }

        // 基于起始位置 + 累计偏移计算目标位置（不受上一帧吸附影响）
        const totalDeltaX = this.pointerComponent.x - this.pointerStartX;
        const totalDeltaY = this.pointerComponent.y - this.pointerStartY;

        const updatedEntities: Entity[] = [];

        this.dragEntities.forEach(entity => {
            this.sendDragEvent({
                entity,
                status: DragStatus.Dragging,
            });

            const startPos = this.dragStartPositions.get(entity);
            const layoutComp = entity.getComponent(LayoutComponent);
            if (!startPos || !layoutComp) {
                return;
            }

            let newX = startPos.x + totalDeltaX;
            let newY = startPos.y + totalDeltaY;

            // 网格吸附
            const dragComp = entity.getComponent(DragComponent);
            if (dragComp?.snapToGrid && dragComp.gridSize > 0) {
                newX = Math.round(newX / dragComp.gridSize) * dragComp.gridSize;
                newY = Math.round(newY / dragComp.gridSize) * dragComp.gridSize;
            }

            layoutComp.x = newX;
            layoutComp.y = newY;
            updatedEntities.push(entity);
        });

        // 智能对齐吸附：在所有实体位置更新后，检查对齐线并吸附
        if (updatedEntities.length > 0 && this.guideComponent?.showSmartGuides) {
            this.applySmartSnap(updatedEntities);
        }

        if (updatedEntities.length > 0) {
            const layoutEvent = new LayoutEvent({
                data: {
                    entities: updatedEntities,
                },
            });
            this.eventManager?.sendEvent(layoutEvent);
        }
    }

    /**
     * 智能对齐吸附
     * 读取 GuideComponent 中的活跃对齐线，将拖拽实体吸附到最近的对齐线
     */
    private applySmartSnap(entities: Entity[]): void {
        if (!this.guideComponent) return;

        const guides = this.guideComponent.activeGuideLines;
        if (guides.length === 0) return;

        const threshold = this.guideComponent.snapThreshold;

        // 计算拖拽实体组的组合 AABB
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        entities.forEach(entity => {
            const layout = entity.getComponent(LayoutComponent);
            if (!layout) return;
            const aabb = getWorldAABB(entity);
            minX = Math.min(minX, aabb.x);
            minY = Math.min(minY, aabb.y);
            maxX = Math.max(maxX, aabb.x + aabb.width);
            maxY = Math.max(maxY, aabb.y + aabb.height);
        });

        const groupCenterX = (minX + maxX) / 2;
        const groupCenterY = (minY + maxY) / 2;

        // 找最近的垂直对齐线吸附
        let bestSnapX: number | null = null;
        let bestSnapXDist = threshold;

        guides.forEach(guide => {
            if (guide.direction !== 'vertical') return;
            // 检查左边、右边、中心哪个最近
            const edges = [
                { edge: minX, offset: 0 },
                { edge: maxX, offset: 0 },
                { edge: groupCenterX, offset: 0 },
            ];
            edges.forEach(({ edge }) => {
                const dist = Math.abs(edge - guide.position);
                if (dist < bestSnapXDist) {
                    bestSnapXDist = dist;
                    bestSnapX = guide.position - edge; // 需要移动的偏移量
                }
            });
        });

        // 找最近的水平对齐线吸附
        let bestSnapY: number | null = null;
        let bestSnapYDist = threshold;

        guides.forEach(guide => {
            if (guide.direction !== 'horizontal') return;
            const edges = [
                { edge: minY },
                { edge: maxY },
                { edge: groupCenterY },
            ];
            edges.forEach(({ edge }) => {
                const dist = Math.abs(edge - guide.position);
                if (dist < bestSnapYDist) {
                    bestSnapYDist = dist;
                    bestSnapY = guide.position - edge;
                }
            });
        });

        // 应用吸附偏移
        if (bestSnapX !== null || bestSnapY !== null) {
            entities.forEach(entity => {
                const layout = entity.getComponent(LayoutComponent);
                if (!layout) return;
                if (bestSnapX !== null) {
                    layout.x += bestSnapX;
                }
                if (bestSnapY !== null) {
                    layout.y += bestSnapY;
                }
            });
        }
    }

    handleDragEnd() {
        if (!this.dragEntities.length) {
            return;
        }
        this.dragEntities.forEach(entity => {
            this.sendDragEvent({
                entity,
                status: DragStatus.End,
            });
        });
        // 通知外部实体移动完成
        this.world.emit(StageEvents.ENTITY_MOVE, {
            entities: this.dragEntities.map(e => e.name),
        });

        // ===== Alt 复制拖拽结束清理 =====
        if (this.isAltDragCopy) {
            // Alt 模式下拖拽结束：副本已经在目标位置，保持选中副本
            // 原件保持在原位不动（已在 enterAltDragCopy 中恢复）
            this.isAltDragCopy = false;
        }
        // 清理所有临时状态
        this.originalEntities = [];
        this.originalStartPositions.clear();
        this.clonedEntities = [];

        this.dragEntities = [];
        this.dragStartPositions.clear();
        this.world.isDragging = false;
    }

    sendDragEvent(option: {
        entity: Entity;
        status: DragStatus;
    }) {
        const { entity, status } = option;
        const event = new DragEvent({
            data: {
                entity,
                status,
            },
        });
        this.eventManager?.sendEvent(event);
    }
}
