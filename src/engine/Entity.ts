import { randomUUID } from 'crypto';
import { Component, ComponentInstance, ComponentType } from './Component';
import { Stage } from './Stage';

export interface IEntitiy {
    id: string,
    name: string,
}

export interface EntityProps {
    name: string,
    world: Stage,
}

export class Entity implements IEntitiy {
    id: string;
    name: string;
    components: Component[] = [];
    children: Entity[] = [];
    /**
     * entity 的父级
     */
    parent?: Entity;

    onDestory: () => void;

    constructor(props: EntityProps) {
        this.id = randomUUID();
        const { name, world } = props;
        this.name = name;
        world.createEntity(this);
        this.onDestory = () => {
            /**
             * 清除 stage 中的引用
             */
            world.removeEntity(this);
        };
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
        this.onDestory();
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
