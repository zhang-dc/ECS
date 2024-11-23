import { BaseComponent, BaseComponentProps } from '../../Component';
import { DefaultEntityName } from '../../interface/Entity';
import { KeyboardKey } from './Keyboard';

export class KeyboardComponent extends BaseComponent {
    keyMap = new Map<KeyboardKey, boolean>();

    isKeyDown(key: KeyboardKey) {
        return this.keyMap.get(key) ?? false;
    }

    constructor(props: BaseComponentProps) {
        super(props);
        const {
            name = DefaultEntityName.Keyboard,
        } = props;
        this.name = name;
    }
}