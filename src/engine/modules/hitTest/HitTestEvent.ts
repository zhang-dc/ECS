import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';

export interface HitTestEventProps extends EventProps {
    data: {
        entityA: Entity;
        entityB: Entity;
        status?: HitTestStatus;
    }
}

export enum HitTestStatus {
    Start,
    Hitting,
}

export class HitTestEvent extends BaseEvent {
    entityA: Entity;
    entityB: Entity;
    status?: HitTestStatus;
    constructor(props: HitTestEventProps) {
        super(props);
        this.entityA = props.data.entityA;
        this.entityB = props.data.entityB;
        this.status = props.data.status;
    }
}
