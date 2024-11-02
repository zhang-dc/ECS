import { DefaultEntityName } from '../interface/Entity';
import { System } from '../System';
import { Task } from './Task';

export interface TaskProps {
    name: string,
    taskList: Task[],
}

export class TaskFlow extends System {
    task?: Task;

    start() {
        const taskEntity = this.world.findEntityByName(DefaultEntityName.Task);
        this.task = taskEntity?.getComponent(Task);
    }
}
