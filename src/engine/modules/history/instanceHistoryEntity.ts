import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { HistoryComponent } from './HistoryComponent';

export interface InstanceHistoryEntityProps {
    world: Stage;
    maxHistory?: number;
}

export function instanceHistoryEntity(props: InstanceHistoryEntityProps) {
    const { world, maxHistory = 100 } = props;

    const entity = new Entity({
        name: DefaultEntityName.History,
        world,
    });

    const historyComponent = new HistoryComponent({
        maxHistory,
    });

    entity.addComponent(historyComponent);
    world.addEntity(entity);

    return entity;
}
