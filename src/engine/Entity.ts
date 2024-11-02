import { randomUUID } from 'crypto';
import { Component, ComponentInstance, ComponentType } from './Component';

export interface IEntitiy {
    id: string,
    name: string,
}

export interface EntityProps {
    name: string,
}

export class Entity implements IEntitiy {
    id: string;
    name: string;
    components: Component[] = [];
    children: Entity[] = [];
    parent?: Entity;

    constructor(props: EntityProps) {
        this.id = randomUUID();
        const { name } = props;
        this.name = name;
    }

    getComponent<T extends ComponentType>(componentType: T): ComponentInstance<T>|undefined {
        return this.components.find(c => c instanceof componentType) as ComponentInstance<T> ;
    }

    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        this.components.push(component as Component);
        component.setEntity(this);
    }

    removeComponent(component: Component) {
        this.components = this.components.filter((c) => c !== component);
    }

    addChild(entity: Entity) {
        entity.parent = this;
        this.children.push(entity);
    }

    removeChild(entity: Entity) {
        this.children = this.children.filter((e) => e !== entity);
    }

    destory() {
        this.children.forEach(e => {
            e.destory();
        });
        this.components.forEach(c => {
            c.entity = undefined;
        });
        this.parent?.removeChild(this);
        this.parent = undefined;
        this.components = [];
    }
}
