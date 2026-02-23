import { v4 as uuidv4 } from 'uuid';
import { BaseComponent, ComponentInstance, ComponentType } from './Component';
import { ChildOf } from './components/ChildOf';
import { ParentOf } from './components/ParentOf';
import { World } from './Stage';

export interface IEntitiy {
    id: string,
    name: string,
}

export interface EntityProps {
    name: string,
    world: World,
}

/**
 * Entity —— 轻量句柄
 *
 * Entity 本身只是一个 ID + 对 World 的引用。
 * 所有 Component 的增删查改都委托给 World。
 * 层级关系通过 ChildOf/ParentOf Component 管理。
 */
export class Entity implements IEntitiy {
    id: string;
    name: string;
    world: World;

    /**
     * 兼容旧 API：children 和 parent
     */
    children: Entity[] = [];
    parent?: Entity;

    onDestroy: () => void;

    constructor(props: EntityProps) {
        this.id = uuidv4();
        const { name, world } = props;
        this.name = name;
        this.world = world;
        // 统一注册流程：构造即注册
        world.registerEntity(this);
        this.onDestroy = () => {
            world.removeEntity(this);
        };
    }

    // ========== 新 API：委托给 World ==========

    /**
     * 添加 Component
     */
    add<T extends ComponentType>(component: ComponentInstance<T>): this {
        const type = component.constructor as ComponentType;
        this.world.addComponentToEntity(this.id, type, component as BaseComponent);
        return this;
    }

    /**
     * 只读获取 Component
     */
    read<T extends ComponentType>(type: T): ComponentInstance<T> | undefined {
        return this.world.getComponentOfEntity(this.id, type);
    }

    /**
     * 可写获取 Component（触发变更追踪）
     */
    write<T extends ComponentType>(type: T): ComponentInstance<T> | undefined {
        return this.world.getComponentOfEntityForWrite(this.id, type);
    }

    /**
     * 检查是否拥有某个 Component
     */
    has(type: ComponentType): boolean {
        return this.world.hasComponentOnEntity(this.id, type);
    }

    /**
     * 移除指定类型的 Component
     */
    removeByType(type: ComponentType): this {
        this.world.removeComponentFromEntity(this.id, type);
        return this;
    }

    // ========== 兼容旧 API ==========

    getComponent<T extends ComponentType>(componentType: T): ComponentInstance<T> | undefined {
        return this.world.getComponentOfEntity(this.id, componentType);
    }

    getComponents<T extends ComponentType>(componentType: T): ComponentInstance<T>[] {
        const comp = this.world.getComponentOfEntity(this.id, componentType);
        return comp ? [comp] : [];
    }

    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        this.world.addComponentToEntity(this.id, type, component as BaseComponent);
    }

    removeComponent(component: BaseComponent) {
        const type = component.constructor as ComponentType;
        this.world.removeComponentFromEntity(this.id, type);
    }

    // ========== 层级关系 ==========

    addChild(entity: Entity) {
        entity.parent = this;
        this.children.push(entity);
        entity.add(new ChildOf({ parentId: this.id }));
    }

    removeChild(entity: Entity) {
        this.children = this.children.filter((e) => e !== entity);
        entity.removeByType(ChildOf);
    }

    getChildren(): Entity[] {
        const parentOf = this.read(ParentOf);
        if (!parentOf) return [];
        return parentOf.childIds
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }

    getParent(): Entity | undefined {
        const childOf = this.read(ChildOf);
        if (!childOf) return undefined;
        return this.world.getEntityById(childOf.parentId);
    }

    // ========== 销毁 ==========

    destroy() {
        this.onDestroy();
        this.children.forEach(e => {
            e.destroy();
        });
        this.parent?.removeChild(this);
        this.parent = undefined;
        this.children = [];
    }

    /** @deprecated 使用 destroy() */
    destory() {
        this.destroy();
    }
}
