import { Entity } from './Entity';
import { SystemInfo } from './flow/Task';
import { instanceTaskEntity } from './flow/TaskEntity';
import { TaskFlow } from './flow/TaskFlow';
import { DefaultEntityName } from './interface/Entity';
import { Stage } from './Stage';

export interface InitSceneProps {
    world: Stage;
    systemList: SystemInfo[];
    name: string;
}

export function initScene(props: InitSceneProps) {
    const { world, systemList, name } = props;
    let task = world.findEntityByName(DefaultEntityName.Task);
    if (!task) {
        task = instanceTaskEntity({world, name, systemList});
    }
    const taskFlow = new TaskFlow({ world });
    return taskFlow;
}

export interface InitSceneProps {
    world: Stage;
    systemList: SystemInfo[];
}

export function initTaskSystemList(props: InitSceneProps) {
    const { world, systemList } = props;
    const defaultSystemList: SystemInfo[] = [
        
    ];

    return [
        ...defaultSystemList,
        ...systemList,
    ];
}
