import { randomUUID } from 'crypto';
import { Entity } from './Entity';

export interface ComponentProps {
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

export class Component implements IComponent {
    id: string;
    name?: string;
    entity?: Entity;

    constructor(props: ComponentProps) {
        this.id = randomUUID();
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
