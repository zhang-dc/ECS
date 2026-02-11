import { System } from '../System';
import { BaseComponent, BaseComponentProps } from '../Component';
import { topologicalSort, SystemEntry } from '../utils/topologicalSort';

export interface SystemInfo {
    system: System,
    /** @deprecated 使用 System 类上的 static before/after 替代 */
    systemIndex?: number,
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
        // 优先使用拓扑排序（基于 before/after 约束）
        // 如果没有任何约束，则回退到 systemIndex 排序
        const hasConstraints = systemList.some(info => {
            const cls = info.system.constructor as any;
            return (cls.before && cls.before.length > 0) ||
                   (cls.after && cls.after.length > 0);
        });

        if (hasConstraints) {
            // 使用拓扑排序
            const entries: SystemEntry[] = systemList.map(info => ({
                system: info.system,
                systemIndex: info.systemIndex,
            }));
            const sorted = topologicalSort(entries);
            this.systemList = sorted.map(entry => ({
                system: entry.system,
                systemIndex: entry.systemIndex,
            }));
        } else {
            // 回退到旧的 systemIndex 排序
            this.systemList = systemList.sort((systemA, systemB) => {
                return (systemA.systemIndex ?? 0) - (systemB.systemIndex ?? 0);
            });
        }
    }
}
