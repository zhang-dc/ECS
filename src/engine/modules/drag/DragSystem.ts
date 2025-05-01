import { Entity } from '../../Entity';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { InteractType } from '../interact/Interact';
import { InteractEvent } from '../interact/InteractEvent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { DragEvent, DragStatus } from './DragEvent';

export class DragSystem extends System {
    eventManager?: EventManager;
    dragEntity?: Entity;
    pointerComponent?: PointerComponent;

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
    }

    update(): void {
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
        this.dragEntity = entity;
        this.sendDragEvent({
            entity: this.dragEntity,
            status: DragStatus.Start,
        });
    }

    handleDragging() {
        if (!this.dragEntity || !this.pointerComponent) {
            return;
        }
        this.sendDragEvent({
            entity: this.dragEntity,
            status: DragStatus.Dragging,
        });
        const layoutComp = this.dragEntity.getComponent(LayoutComponent);
        if (!layoutComp) {
            return;
        }
        layoutComp.x = layoutComp.x + this.pointerComponent.deltaX;
        layoutComp.y = layoutComp.y + this.pointerComponent.deltaY;
        const layoutEvent = new LayoutEvent({
            data: {
                entities: [this.dragEntity],
            },
        });
        this.eventManager?.sendEvent(layoutEvent);
    }

    handleDragEnd() {
        if (!this.dragEntity) {
            return;
        }
        this.sendDragEvent({
            entity: this.dragEntity,
            status: DragStatus.End,
        });
        this.dragEntity = undefined;
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
