import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { World } from '../../Stage';
import { KeyboardComponent } from './KeyboardComponent';

export interface InstanceKeyboardEntityProps {
    world: World;
}

export function instanceKeyboardEntity(props: InstanceKeyboardEntityProps) {
    const {
        world,
    } = props;

    const entity = new Entity({
        name: DefaultEntityName.Keyboard,
        world,
    });

    const keyboardComp = new KeyboardComponent({});

    entity.addComponent(keyboardComp);

    return entity;
}
