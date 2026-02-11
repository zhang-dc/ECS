import { v4 as uuidv4 } from 'uuid';

export interface BaseComponentProps {
    name?: string;
}

export interface IComponent {
    id: string;
    name?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentType = new (props?: any) => IComponent;

export type ComponentInstance<T extends ComponentType> = InstanceType<T>;

/**
 * 组件基类 —— 纯数据，不持有 Entity 引用，不包含行为方法
 * 所有 Entity-Component 的关联关系由 World 管理
 */
export class BaseComponent implements IComponent {
    id: string;
    name?: string;

    constructor(props?: BaseComponentProps) {
        this.id = uuidv4();
        if (props) {
            this.name = props.name;
        }
    }
}
