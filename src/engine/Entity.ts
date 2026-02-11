import { v4 as uuidv4 } from 'uuid';
import { BaseComponent, ComponentInstance, ComponentType } from './Component';
import { ChildOf } from './components/ChildOf';
import { ParentOf } from './components/ParentOf';
import { Stage } from './Stage';

export interface IEntitiy {
    id: string,
    name: string,
}

export interface EntityProps {
    name: string,
    world: Stage,
}

/**
 * Entity —— 轻量句柄
 *
 * Entity 本身只是一个 ID + 对 World 的引用。
 * 所有 Component 的增删查改都委托给 World。
 * children/parent 关系将在阶段二通过 ChildOf/ParentOf Component 实现。
 */
export class Entity implements IEntitiy {
    id: string;
    name: string;
    world: Stage;

    /**
     * 兼容旧 API：children 和 parent
     * 阶段二会改为通过 ChildOf/ParentOf Component 管理
     */
    children: Entity[] = [];
    parent?: Entity;

    onDestory: () => void;

    constructor(props: EntityProps) {
        this.id = uuidv4();
        const { name, world } = props;
        this.name = name;
        this.world = world;
        world.createEntity(this);
        this.onDestory = () => {
            world.removeEntity(this);
        };
    }

    // ========== 新 API：委托给 World ==========

    /**
     * 添加 Component（新 API）
     * 同时兼容旧的 addComponent(instance) 调用方式
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

    /**
     * 旧 API：通过类型获取单个 Component
     * 内部委托给 World
     */
    getComponent<T extends ComponentType>(componentType: T): ComponentInstance<T> | undefined {
        return this.world.getComponentOfEntity(this.id, componentType);
    }

    /**
     * 旧 API：通过类型获取多个 Component（同一类型可能有多个实例）
     * 注意：新架构中每个 Entity 每种 ComponentType 只有一个实例
     * 为了兼容旧代码（如 RenderComponent 的子类），做特殊处理
     */
    getComponents<T extends ComponentType>(componentType: T): ComponentInstance<T>[] {
        const comp = this.world.getComponentOfEntity(this.id, componentType);
        return comp ? [comp] : [];
    }

    /**
     * 旧 API：添加 Component 实例
     * 内部委托给 World
     */
    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        this.world.addComponentToEntity(this.id, type, component as BaseComponent);
    }

    /**
     * 旧 API：移除 Component 实例
     */
    removeComponent(component: BaseComponent) {
        const type = component.constructor as ComponentType;
        this.world.removeComponentFromEntity(this.id, type);
    }

    // ========== 层级关系 ==========

    /**
     * 添加子 Entity
     * 同时维护旧的 children/parent 引用和新的 ChildOf/ParentOf Component
     */
    addChild(entity: Entity) {
        entity.parent = this;
        this.children.push(entity);
        // 新架构：通过 ChildOf Component 建立关联
        entity.addComponent(new ChildOf({ parentId: this.id }));
    }

    /**
     * 移除子 Entity
     */
    removeChild(entity: Entity) {
        this.children = this.children.filter((e) => e !== entity);
        // 新架构：移除 ChildOf Component
        entity.removeByType(ChildOf);
    }

    /**
     * 获取所有子 Entity（通过 ParentOf Component）
     */
    getChildren(): Entity[] {
        const parentOf = this.read(ParentOf);
        if (!parentOf) return [];
        return parentOf.childIds
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }

    /**
     * 获取父 Entity（通过 ChildOf Component）
     */
    getParent(): Entity | undefined {
        const childOf = this.read(ChildOf);
        if (!childOf) return undefined;
        return this.world.getEntityById(childOf.parentId);
    }

    // ========== 销毁 ==========

    destory() {
        this.onDestory();
        this.children.forEach(e => {
            e.destory();
        });
        this.parent?.removeChild(this);
        this.parent = undefined;
        this.children = [];
    }
}
