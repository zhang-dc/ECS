import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { DefaultEntityName } from '../../interface/Entity';
import { EventManager } from '../event/Event';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { PointerButtons } from '../pointer/Pointer';
import { SelectComponent } from '../select/SelectComponent';
import { SelectionState } from '../select/SelectionState';
import { ToolComponent } from '../tool/ToolComponent';

/**
 * 右键上下文菜单系统
 * 在所有交互系统之后运行，检测右键点击并向外部（React）发送事件
 *
 * 职责：
 * 1. 检测 SECONDARY 按钮按下
 * 2. 通过 HitTestEvent 判断右键位置是否命中实体
 * 3. 命中未选中实体 → 选中它；命中空白 → 取消选中
 * 4. 通过 Stage EventBus 向 React 发送 CONTEXT_MENU 事件（携带屏幕坐标）
 */
export class ContextMenuSystem extends System {
    private eventManager?: EventManager;
    private pointerComponent?: PointerComponent;
    private selectionState?: SelectionState;
    private toolComponent?: ToolComponent;

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.selectionState = this.world.findComponent(SelectionState);
        this.toolComponent = this.world.findComponent(ToolComponent);
    }

    update(): void {
        if (!this.pointerComponent || !this.selectionState) return;

        // 仅在 select 模式下处理右键
        if (this.toolComponent && this.toolComponent.mode !== 'select') return;

        // 检测右键按下
        if (!this.pointerComponent.hasButtonDown(PointerButtons.SECONDARY)) return;

        // 从本帧 HitTestEvent 中查找右键命中的可选择实体
        const hitEntity = this.findHitSelectableEntity();

        if (hitEntity) {
            // 命中实体：如果未选中则选中它
            if (!this.selectionState.isSelected(hitEntity)) {
                this.selectionState.select(hitEntity);
                this.syncSelectComponents();
            }
        } else {
            // 命中空白：取消选中
            if (this.selectionState.selectedEntities.size > 0) {
                this.selectionState.clearSelection();
                this.syncSelectComponents();
            }
        }

        // 向 React 发送右键菜单事件（携带屏幕坐标）
        this.world.emit(StageEvents.CONTEXT_MENU, {
            screenX: this.pointerComponent.screenX,
            screenY: this.pointerComponent.screenY,
        });
    }

    /** 从本帧 HitTestEvent 中查找指针命中的可选择实体 */
    private findHitSelectableEntity(): Entity | null {
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        if (!hitTestEvents?.length) return null;

        let hitEntity: Entity | null = null;

        for (const event of hitTestEvents) {
            const { entityA, entityB } = event;
            let candidate: Entity | null = null;

            if (entityA.name === DefaultEntityName.Pointer) {
                candidate = entityB;
            } else if (entityB.name === DefaultEntityName.Pointer) {
                candidate = entityA;
            }

            if (candidate) {
                const selectComp = candidate.getComponent(SelectComponent);
                if (selectComp?.selectable) {
                    hitEntity = candidate;
                }
            }
        }

        return hitEntity;
    }

    /** 同步 SelectComponent 状态并通知外部 */
    private syncSelectComponents(): void {
        const selectComps = this.world.findComponents(SelectComponent);
        selectComps.forEach(comp => {
            if (comp.entity) {
                comp.selected = this.selectionState!.isSelected(comp.entity);
            }
        });
        this.world.emit(StageEvents.SELECTION_CHANGE, {
            selectedEntities: Array.from(this.selectionState!.selectedEntities),
        });
    }
}
