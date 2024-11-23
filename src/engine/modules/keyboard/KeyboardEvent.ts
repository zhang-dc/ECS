import { BaseEvent, EventProps } from '../event/Event';
import { KeyboardKey } from './Keyboard';

export interface KeyboardEventData {
    key: KeyboardKey;
    isDown: boolean;
}

export interface KeyboardEventProps extends EventProps {
    data: KeyboardEventData
}

export class KeyboardEvent extends BaseEvent {
    data: KeyboardEventData;

    constructor(props: KeyboardEventProps) {
        super(props);
        const { data } = props;
        this.data = data;
    }
}
