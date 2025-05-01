import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { PointerButtons } from '../pointer/Pointer';
import { PointerComponent } from '../pointer/PointerComponent';
import { InteractType } from './Interact';
import { InteractEvent } from './InteractEvent';

export class InteractSystem extends System {
    pointerComponent?: PointerComponent;
    eventManager?: EventManager;

    start(): void {
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        if (!hitTestEvents?.length) {
            return;
        }
        this.checkInteract(hitTestEvents);
    }

    checkInteract(hitTestEvents: HitTestEvent[]) {
        hitTestEvents.forEach((event) => {
            const { entityA, entityB } = event;
            if (entityA.name !== DefaultEntityName.Pointer && entityB.name !== DefaultEntityName.Pointer) {
                return;
            }
            const pointer = entityA.name === DefaultEntityName.Pointer ? entityA : entityB;
            const entity = entityA === pointer ? entityB : entityA;
            this.checkPointerDown(entity);
            this.checkPointerUp(entity);
        });
        this.checkPointerMove();
    }

    checkPointerDown(entity: Entity) {
        [PointerButtons.PRIMARY, PointerButtons.SECONDARY, PointerButtons.AUXILIARY].forEach((pointerButton) => {
            if (!this.pointerComponent?.hasButtonDown(pointerButton)) {
                return;
            }
            this.sendPointerDownEvent({
                entity,
                pointerButton,
            });
        });
    }

    checkPointerUp(entity: Entity) {
        [PointerButtons.PRIMARY, PointerButtons.SECONDARY, PointerButtons.AUXILIARY].forEach((pointerButton) => {
            if (!this.pointerComponent?.hasPointerUp) {
                return;
            }
            this.sendPointerUpEvent({
                entity,
                pointerButton,
            });
        });
    }

    checkPointerMove() {
       if (!this.pointerComponent?.isMoving) {
           return;
       }
       this.sendPointerMoveEvent();
    }

    sendPointerDownEvent(option: {
        entity: Entity,
        pointerButton: PointerButtons,
    }) {
        const { entity, pointerButton } = option;
        const interactEvent = new InteractEvent({
            entity,
            data: {
                type: InteractType.PointerDown,
                option: {
                    button: pointerButton,
                },
            }
        });
        this.eventManager?.sendEvent(interactEvent);
    }

    sendPointerUpEvent(option: {
        entity: Entity,
        pointerButton: PointerButtons,
    }) {
        const { entity, pointerButton } = option;
        const interactEvent = new InteractEvent({
            entity,
            data: {
                type: InteractType.PointerUp,
                option: {
                    button: pointerButton,
                },
            }
        });
        this.eventManager?.sendEvent(interactEvent);
    }

    sendPointerMoveEvent() {
        const interactEvent = new InteractEvent({
            data: {
                type: InteractType.PointerMove,
                option: undefined
            }
        });
        this.eventManager?.sendEvent(interactEvent);
    }
}
