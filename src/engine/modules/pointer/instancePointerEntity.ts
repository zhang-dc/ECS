import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { PointerComponent } from './PointerComponent';

export interface InstancePointerEntityProps {
    world: Stage;
}

export function instancePointerEntity(props: InstancePointerEntityProps) {
    const {
        world,
    } = props;

    const entity = new Entity({
        name: DefaultEntityName.Pointer,
        world,
    });

    const pointerComp = new PointerComponent({});

    entity.addComponent(pointerComp);

    world.addEntity(entity);

    return entity;
}
