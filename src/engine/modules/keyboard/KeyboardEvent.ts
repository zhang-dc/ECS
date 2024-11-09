import { Event, EventProps } from '../../Event';
import { KeyboardKey } from './Keyboard';

export interface KeyboardEventProps extends EventProps {
    data: {
        key: KeyboardKey;
        isDown: boolean;
    }
}

export class KeyboardEvent extends Event {
    data: KeyboardEventProps['data'];

    constructor(props: KeyboardEventProps) {
        super(props);
        const { data } = props;
        this.data = data;
    }
}
