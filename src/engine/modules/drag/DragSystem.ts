import { Entity } from '../../Entity';
import { System } from '../../System';

export class DragSystem extends System {
    dragEntity?: Entity;
    pointerDownStart = false;

    update(): void {
        
    }

    handleDragStart(entity: Entity): void {
        this.dragEntity = entity;
    }
}
