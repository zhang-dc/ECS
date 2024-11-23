import { Entity } from './Entity';
import { v4 as uuidv4 } from 'uuid';

export interface BaseComponentProps {
    name?: string;
}

export interface IComponent {
    id: string;
    name?: string;
    entity?: Entity;
    setEntity: (entity: Entity) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentType = new (props: any) => IComponent;

export type ComponentInstance<T extends ComponentType> = InstanceType<T>;

export class BaseComponent implements IComponent {
    id: string;
    name?: string;
    entity?: Entity;

    constructor(props: BaseComponentProps) {
        this.id = uuidv4();
        const { name } = props;
        this.name = name;
    }

    setEntity(entity: Entity) {
        this.entity = entity;
    }

    destroy() {
        this.entity?.removeComponent(this);
        this.entity = undefined;
    }
}
