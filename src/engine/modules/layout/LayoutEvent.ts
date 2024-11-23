import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';

export interface LayoutEventData {
    entities: Entity[],
}

export interface LayoutEventProps extends EventProps {
    data: LayoutEventData,
}

export class LayoutEvent extends BaseEvent {
    data: LayoutEventData;

    constructor(props: LayoutEventProps) {
        super(props);
        const { data } = props;
        this.data = data;
    }
}
