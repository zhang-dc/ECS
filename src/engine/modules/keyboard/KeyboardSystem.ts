import { System, SystemProps } from '../../System';
import { isKeyboardKey, KeyboardKey } from './Keyboard';

export interface KeyboardSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

export class KeyboardSystem extends System {
    keyMap = new Map<KeyboardKey, boolean>();

    constructor(props: KeyboardSystemProps) {
        super(props);
        const { mask } = props;
        mask.addEventListener('keydown', this.handleKeyDown);
        mask.addEventListener('keyup', this.handleKeyUp);
    }

    start(): void {
        
    }

    handleKeyDown(event: KeyboardEvent) {
        this.handleKeyboardEvent(event, true);
    }

    handleKeyUp(event: KeyboardEvent) {
        this.handleKeyboardEvent(event, false);
    }

    handleKeyboardEvent(event: KeyboardEvent, isDown: boolean) {
        const { key } = event;
        if (!isKeyboardKey(key)) {
            return;
        }
        this.keyMap.set(key as KeyboardKey, isDown);
    }
}
