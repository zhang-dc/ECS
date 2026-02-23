import { Entity } from '../Entity';
import { DefaultEntityName } from '../interface/Entity';
import { World } from '../Stage';
import { Task, TaskProps } from './Task';

export interface InstanceTaskEntityProps extends TaskProps {
    world: World,
}

export function instanceTaskEntity(props: InstanceTaskEntityProps) {
    const { world } = props;

    const entity = new Entity({
        name: DefaultEntityName.Task,
        world,
    });

    const task = new Task(props);

    entity.addComponent(task);

    return entity;
}
