import { System, SystemProps } from '../../System';
import { instanceKeyboardEntity } from './instanceKeyboardEntity';
import { isKeyboardKey, KeyboardKey } from './Keyboard';
import { KeyboardComponent } from './KeyboardComponent';

export interface KeyboardSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

export class KeyboardSystem extends System {
    keyboardComp?: KeyboardComponent;

    constructor(props: KeyboardSystemProps) {
        super(props);
        instanceKeyboardEntity({
            world: this.world,
        });
        const { mask } = props;
        mask.addEventListener('keydown', this.handleKeyDown);
        mask.addEventListener('keyup', this.handleKeyUp);
    }

    start(): void {
        this.keyboardComp = this.world.findComponent(KeyboardComponent);
    }

    handleKeyDown(event: KeyboardEvent) {
        this.handleKeyboardEvent(event, true);
    }

    handleKeyUp(event: KeyboardEvent) {
        this.handleKeyboardEvent(event, false);
    }

    handleKeyboardEvent(event: KeyboardEvent, isDown: boolean) {
        event.preventDefault();
        event.stopPropagation();
        const { key } = event;
        const keyMap = this.keyboardComp?.keyMap;
        if (!isKeyboardKey(key) || !keyMap) {
            return;
        }
        keyMap.set(key as KeyboardKey, isDown);
    }
}
