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
    componentMap: Map<ComponentType, ComponentInstance<ComponentType>[]> = new Map();

    addEntity(entity: Entity) {
        this.entities.push(entity);
        entity.components.forEach(c => {
            const componentType = typeof c as unknown as ComponentType;
            const list = this.componentMap.get(componentType) ?? [];
            this.componentMap.set(componentType, [...list, c]);
        });
    }

    /**
     * 在当前 stage 创建 entity
     * @param entity 
     */
    createEntity(entity: Entity) {
        this.fullEntities.push(entity);
    }

    /**
     * 在当前 stage 去除 entity
     * @param entity 
     */
    removeEntity(entity: Entity) {
        [this.entities, this.fullEntities].forEach((list) => {
            const index = list.indexOf(entity);
            if (index > -1) {
                list.splice(index, 1);
            }
        });
    }

    findComponent<T extends ComponentType>(componentType: T) {
        const list = this.componentMap.get(componentType) ?? [];
        return list[0] as ComponentInstance<T>;
    }

    findComponents<T extends ComponentType>(componentType: T) {
        const list = this.componentMap.get(componentType) ?? [];
        return list as ComponentInstance<T>[];
    }

    findEntityByName(name: string): Entity|undefined {
        return this.entities.find(e => e.name === name);
    }
}
