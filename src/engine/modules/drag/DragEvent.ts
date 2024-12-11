import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';

export enum DragStatus {
    Start,
    Dragging,
    End,
}

export interface DragEventProps extends EventProps {
    data: {
        entity: Entity;
        status: DragStatus;
    };
}

export class DragEvent extends BaseEvent {
    data: {
        entity: Entity;
        status: DragStatus;
    };

    constructor(props: DragEventProps) {
        super(props);
        const { data } = props;
        this.data = data;
    }
}
