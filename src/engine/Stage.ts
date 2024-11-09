import { ComponentInstance, ComponentType } from './Component';
import { Entity } from './Entity';

export class Stage {
    /**
     * 挂载在当前 stage 上的 entity 合集
     */
    entities: Entity[] = [];
    /**
     * 当前 stage 上的 entity 合集
     */
    fullEntities: Entity[] = [];
    componentListMap: Map<ComponentType, ComponentInstance<ComponentType>[]> = new Map();

    addEntity(entity: Entity) {
        this.entities.push(entity);
        entity.components.forEach(c => {
            const componentType = c.constructor as ComponentType;
            const list = this.componentListMap.get(componentType) ?? [];
            this.componentListMap.set(componentType, [...list, c]);
        });
    }

    /**
     * 在当前 stage 创建 entity
     * @param entity 
     */
    createEntity(entity: Entity) {
        this.fullEntities.push(entity);
        entity.components.forEach(c => {
            const componentType = c.constructor as ComponentType;
            const list = this.componentListMap.get(componentType) ?? [];
            this.componentListMap.set(componentType, [...list, c]);
        });
    }

    /**
     * 在当前 stage 去除 entity
     * @param entity 
     */
    removeEntity(entity: Entity) {
        const entityIndex = this.entities.indexOf(entity);
        if (entityIndex > -1) {
            this.entities = this.entities.filter(i => i !== entity);
        }
        const fullEntityIndex = this.fullEntities.indexOf(entity);
        if (fullEntityIndex > -1) {
            this.fullEntities = this.fullEntities.filter(i => i !== entity);
        }
    }

    findComponent<T extends ComponentType>(componentType: T) {
        const list = this.componentListMap.get(componentType) ?? [];
        return list[0] as ComponentInstance<T>;
    }

    findComponents<T extends ComponentType>(componentType: T) {
        const list = this.componentListMap.get(componentType) ?? [];
        return list as ComponentInstance<T>[];
    }

    findEntityByName(name: string): Entity|undefined {
        return this.entities.find(e => e.name === name);
    }

    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        const list = this.componentListMap.get(type) ?? [];
        list.push(component);
        this.componentListMap.set(type, list);
    }

    removeComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        let list = this.componentListMap.get(type) ?? [];
        const index = list.indexOf(component);
        if (index > -1) {
            list = list.filter(i => i !== component);
        }
        this.componentListMap.set(type, list);
    }
}
