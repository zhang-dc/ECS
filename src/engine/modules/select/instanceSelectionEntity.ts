import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { SelectionState } from './SelectionState';

export interface InstanceSelectionEntityProps {
    world: Stage;
}

export function instanceSelectionEntity(props: InstanceSelectionEntityProps) {
    const { world } = props;

    const entity = new Entity({
        name: DefaultEntityName.Selection,
        world,
    });

    const selectionState = new SelectionState({});

    entity.addComponent(selectionState);
    world.addEntity(entity);

    return entity;
}
