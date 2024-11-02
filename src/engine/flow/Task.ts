import { System } from '../System';
import { Component, ComponentProps } from '../Component';

export interface SystemInfo {
    system: System,
    systemIndex: number,
}

export interface TaskProps extends ComponentProps {
    name: string,
    systemList: SystemInfo[],
}

export class Task extends Component {
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
