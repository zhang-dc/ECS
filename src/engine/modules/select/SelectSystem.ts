import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { LayoutComponent, getWorldAABB } from '../layout/LayoutComponent';
import { PointerButtons } from '../pointer/Pointer';
import { PointerComponent } from '../pointer/PointerComponent';
import { ToolComponent } from '../tool/ToolComponent';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { SelectComponent } from './SelectComponent';
import { SelectEvent, SelectOperation } from './SelectEvent';
import { SelectionState } from './SelectionState';
import { instanceSelectionEntity } from './instanceSelectionEntity';

export class SelectSystem extends System {
    eventManager?: EventManager;
    pointerComponent?: PointerComponent;
    viewportComponent?: ViewportComponent;
    toolComponent?: ToolComponent;
    keyboardComponent?: KeyboardComponent;
    selectionState!: SelectionState;

    constructor(props: SystemProps) {
        super(props);
        const selectionEntity = instanceSelectionEntity({ world: this.world });
        this.selectionState = selectionEntity.getComponent(SelectionState)!;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.toolComponent = this.world.findComponent(ToolComponent);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);
    }

    update(): void {
        // 处理来自事件系统的选择事件（这些始终处理，不受工具模式限制）
        const selectEvents = this.eventManager?.getEvents(SelectEvent);
        selectEvents?.forEach((event) => {
            this.processSelectEvent(event);
        });

        // 只在 select 模式下处理指针交互
        if (this.toolComponent && this.toolComponent.mode !== 'select') {
            return;
        }

        // resize 期间跳过选择/框选处理，避免冲突
        if (this.world.isResizing) {
            return;
        }

        // 文本编辑期间跳过选择/框选处理，由 TextEditSystem 完全接管
        if (this.world.isTextEditing) {
            return;
        }

        // 处理指针交互产生的选择
        this.handlePointerSelection();

        // 处理框选
        this.handleMarqueeSelection();
    }

    processSelectEvent(event: SelectEvent) {
        const { data } = event;
        switch (data.operation) {
            case SelectOperation.Select:
                if (data.entities?.length) {
                    // 支持多实体选中
                    if (data.entities.length === 1) {
                        this.selectionState.select(data.entities[0]);
                    } else {
                        this.selectionState.selectMultiple(data.entities);
                    }
                    this.syncSelectComponents();
                }
                break;
            case SelectOperation.Toggle:
                if (data.entities?.length) {
                    data.entities.forEach(e => this.selectionState.toggle(e));
                    this.syncSelectComponents();
                }
                break;
            case SelectOperation.Marquee:
                if (data.marqueeRect) {
                    const entities = this.getEntitiesInRect(data.marqueeRect);
                    this.selectionState.selectMultiple(entities);
                    this.syncSelectComponents();
                }
                break;
            case SelectOperation.SelectAll:
                this.selectAll();
                break;
            case SelectOperation.DeselectAll:
                this.selectionState.clearSelection();
                this.syncSelectComponents();
                break;
        }
    }

    handlePointerSelection() {
        if (!this.pointerComponent) {
            return;
        }

        // 左键按下时处理选择
        if (!this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) {
            return;
        }

        // 查找指针命中的可选择实体
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        let hitEntity: Entity | undefined;

        hitTestEvents?.forEach((event) => {
            const { entityA, entityB } = event;
            if (entityA.name === DefaultEntityName.Pointer) {
                const selectComp = entityB.getComponent(SelectComponent);
                if (selectComp?.selectable) {
                    hitEntity = entityB;
                }
            } else if (entityB.name === DefaultEntityName.Pointer) {
                const selectComp = entityA.getComponent(SelectComponent);
                if (selectComp?.selectable) {
                    hitEntity = entityA;
                }
            }
        });

        if (hitEntity) {
            // 检查是否按住了 Shift 键
            const shiftDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Shift) ?? false;

            if (shiftDown) {
                // Shift+点击：切换选中状态（多选）
                this.selectionState.toggle(hitEntity);
            } else {
                // 如果实体已经被选中（可能是多选中的一个），不改变选中状态
                // 这样可以支持多选后拖拽
                if (!this.selectionState.isSelected(hitEntity)) {
                    this.selectionState.select(hitEntity);
                }
            }
            this.syncSelectComponents();
        } else {
            // 点击空白区域，开始框选
            if (!this.selectionState.isMarqueeSelecting && this.pointerComponent) {
                this.selectionState.isMarqueeSelecting = true;
                this.selectionState.marqueeStartX = this.pointerComponent.x;
                this.selectionState.marqueeStartY = this.pointerComponent.y;
                this.selectionState.marqueeCurrentX = this.pointerComponent.x;
                this.selectionState.marqueeCurrentY = this.pointerComponent.y;
                // Shift+框选时保留当前选中
                const shiftDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Shift) ?? false;
                if (!shiftDown) {
                    this.selectionState.clearSelection();
                    this.syncSelectComponents();
                }
            }
        }
    }

    handleMarqueeSelection() {
        if (!this.selectionState.isMarqueeSelecting || !this.pointerComponent) {
            return;
        }

        // 更新框选区域
        if (this.pointerComponent.isMoving) {
            this.selectionState.marqueeCurrentX = this.pointerComponent.x;
            this.selectionState.marqueeCurrentY = this.pointerComponent.y;
        }

        // 鼠标抬起时完成框选
        if (this.pointerComponent.hasPointerUp) {
            const marqueeRect = this.selectionState.getMarqueeRect();
            if (marqueeRect && (marqueeRect.width > 2 || marqueeRect.height > 2)) {
                const entities = this.getEntitiesInRect(marqueeRect);
                const shiftDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Shift) ?? false;
                if (shiftDown) {
                    // Shift+框选：追加到当前选中
                    this.selectionState.addToSelection(entities);
                } else {
                    this.selectionState.selectMultiple(entities);
                }
                this.syncSelectComponents();
            }
            this.selectionState.isMarqueeSelecting = false;
        }
    }

    /** 获取矩形区域内的所有可选择实体 */
    getEntitiesInRect(rect: { x: number; y: number; width: number; height: number }): Entity[] {
        const result: Entity[] = [];
        const selectComps = this.world.findComponents(SelectComponent);
        selectComps.forEach((comp) => {
            if (!comp.selectable || !comp.entity) {
                return;
            }
            const layoutComp = comp.entity.getComponent(LayoutComponent);
            if (!layoutComp) {
                return;
            }
            const aabb = getWorldAABB(comp.entity);
            // 检查 AABB 是否与框选矩形相交
            const intersects = !(
                aabb.x > rect.x + rect.width ||
                aabb.x + aabb.width < rect.x ||
                aabb.y > rect.y + rect.height ||
                aabb.y + aabb.height < rect.y
            );
            if (intersects) {
                result.push(comp.entity);
            }
        });
        return result;
    }

    /** 全选所有可选择的实体 */
    selectAll() {
        const selectComps = this.world.findComponents(SelectComponent);
        const entities = selectComps
            .filter(comp => comp.selectable && comp.entity)
            .map(comp => comp.entity!);
        this.selectionState.selectMultiple(entities);
        this.syncSelectComponents();
    }

    /** 同步 SelectComponent 的 selected 状态 */
    syncSelectComponents() {
        const selectComps = this.world.findComponents(SelectComponent);
        selectComps.forEach((comp) => {
            if (comp.entity) {
                comp.selected = this.selectionState.isSelected(comp.entity);
            }
        });
        // 通知外部（React UI）选择已变化
        this.world.emit(StageEvents.SELECTION_CHANGE, {
            selectedEntities: Array.from(this.selectionState.selectedEntities),
        });
    }
}
