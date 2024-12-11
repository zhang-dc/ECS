import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';
import { PointerButtons } from '../pointer/Pointer';
import { InteractType } from './Interact';

export interface PointerInteract {
    button: PointerButtons;
}

export interface InteractEventDataOption {
    [InteractType.Click]: PointerInteract,
    [InteractType.DBClick]: PointerInteract,
    [InteractType.PointerDown]: PointerInteract,
    [InteractType.PointerUp]: PointerInteract,
    [InteractType.Hover]: undefined,
}

export interface InteractEventData<T extends InteractType> {
    type: T;
    option: InteractEventDataOption[T];
}

export interface InteractEventProps extends EventProps {
    data: InteractEventData<InteractType>;
    entity: Entity;
}

export class InteractEvent extends BaseEvent {
    data: InteractEventData<InteractType>;
    entity: Entity;

    constructor(props: InteractEventProps) {
        super(props);
        const { entity, data } = props;
        this.data = data;
        this.entity = entity;
    }
}
