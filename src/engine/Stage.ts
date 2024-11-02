import { Component, ComponentType } from './Component';
import { Entity } from './Entity';

export class Stage {
    entities: Entity[] = [];
    componentMap: Map<ComponentType, Component[]> = new Map();

    addEntity(entity: Entity) {
        this.entities.push(entity);
        entity.components.forEach(c => {
            const componentType = typeof c as unknown as ComponentType;
            const list = this.componentMap.get(componentType) ?? [];
            this.componentMap.set(componentType, [...list, c]);
        });
    }

    findComponent(componentType: ComponentType) {
        const list = this.componentMap.get(componentType) ?? [];
        return list[0];
    }

    findEntityByName(name: string): Entity|undefined {
        return this.entities.find(e => e.name === name);
    }
}
