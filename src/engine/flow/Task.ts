import { System } from '../System';
import { BaseComponent, BaseComponentProps } from '../Component';

export interface SystemInfo {
    system: System,
    systemIndex: number,
}

export interface TaskProps extends BaseComponentProps {
    name: string,
    systemList: SystemInfo[],
}

export class Task extends BaseComponent {
    systemList: SystemInfo[] = [];

    constructor(props: TaskProps) {
        super(props);
        const { name, systemList } = props;
        this.name = name;
        this.setSystemList(systemList);
    }

    setSystemList(systemList: SystemInfo[]) {
        this.systemList = systemList.sort((systemA, systemB) => {
            return systemA.systemIndex - systemB.systemIndex;
        });
    }
}
