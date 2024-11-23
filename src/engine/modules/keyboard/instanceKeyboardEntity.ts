import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { KeyboardComponent } from './KeyboardComponent';

export interface InstanceKeyboardEntityProps {
    world: Stage;
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

    world.addEntity(entity);

    return entity;
}
