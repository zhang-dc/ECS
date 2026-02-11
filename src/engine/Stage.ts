import { BaseComponent, ComponentInstance, ComponentType } from './Component';
import { QueryBuilder } from './Query';
import { ChildOf } from './components/ChildOf';
import { ParentOf } from './components/ParentOf';

// 前向声明 Entity 类型，避免循环依赖
import type { Entity } from './Entity';

type OnComponentAddedFunc<T extends ComponentType> = (type: T, comp: ComponentInstance<T>) => void;
type OnComponentRemovedFunc<T extends ComponentType> = (type: T, comp: ComponentInstance<T>) => void;

/**
 * World（原 Stage）—— 核心关联关系管理者
 *
 * 职责：
 * 1. 管理所有 Entity 的注册/注销
 * 2. 管理 Entity-Component 的关联关系（Map 存储）
 * 3. 维护 ComponentType -> Entity 的反向索引（加速 Query）
 * 4. 变更追踪（支持响应式 Query）
 * 5. 提供 Query API
 */
export class Stage {
    // ========== Entity 注册表 ==========
    /** 所有 Entity（通过 addEntity 添加到场景中的） */
    entities: Entity[] = [];
    /** 所有创建过的 Entity（包括未 addEntity 的） */
    fullEntities: Entity[] = [];
    /** Entity ID -> Entity 实例 */
    private entityMap: Map<string, Entity> = new Map();

    // ========== 核心存储：Entity-Component 关联 ==========
    /** Entity ID -> (ComponentType -> Component 实例) */
    private entityComponents: Map<string, Map<ComponentType, BaseComponent>> = new Map();

    // ========== 反向索引：ComponentType -> Set<EntityId> ==========
    private componentIndex: Map<ComponentType, Set<string>> = new Map();

    // ========== 变更追踪（支持响应式 Query） ==========
    private addedComponents: Map<ComponentType, Set<string>> = new Map();
    private removedComponents: Map<ComponentType, Set<string>> = new Map();
    private changedComponents: Map<ComponentType, Set<string>> = new Map();

    // ========== 兼容旧 API 的组件列表 ==========
    componentListMap: Map<ComponentType, ComponentInstance<ComponentType>[]> = new Map();

    // ========== 监听器 ==========
    onComponentAddedListenerMap: Map<ComponentType, OnComponentAddedFunc<ComponentType>[]> = new Map();
    onComponentRemovedListenerMap: Map<ComponentType, OnComponentRemovedFunc<ComponentType>[]> = new Map();

    constructor() {
        (window as any).stage = this;
    }

    // ========== Entity 管理 ==========

    addEntity(entity: Entity) {
        this.entities.push(entity);
        this.entityMap.set(entity.id, entity);
        // 确保 entityComponents 存在
        if (!this.entityComponents.has(entity.id)) {
            this.entityComponents.set(entity.id, new Map());
        }
    }

    createEntity(entity: Entity) {
        this.fullEntities.push(entity);
        this.entityMap.set(entity.id, entity);
        // 初始化 entityComponents
        if (!this.entityComponents.has(entity.id)) {
            this.entityComponents.set(entity.id, new Map());
        }
    }

    removeEntity(entity: Entity) {
        // 移除该 Entity 上的所有 Component
        const compMap = this.entityComponents.get(entity.id);
        if (compMap) {
            Array.from(compMap.entries()).forEach(([type, comp]) => {
                this._removeComponentInternal(entity.id, type, comp);
            });
            compMap.clear();
        }
        this.entityComponents.delete(entity.id);
        this.entityMap.delete(entity.id);
        this.entities = this.entities.filter(i => i !== entity);
        this.fullEntities = this.fullEntities.filter(i => i !== entity);
    }

    getEntityById(id: string): Entity | undefined {
        return this.entityMap.get(id);
    }

    findEntityByName(name: string): Entity | undefined {
        return this.entities.find(e => e.name === name);
    }

    // ========== Component 管理（核心 API） ==========

    /**
     * 为指定 Entity 添加 Component
     */
    addComponentToEntity(entityId: string, type: ComponentType, component: BaseComponent): void {
        // 更新 entityComponents
        let compMap = this.entityComponents.get(entityId);
        if (!compMap) {
            compMap = new Map();
            this.entityComponents.set(entityId, compMap);
        }
        compMap.set(type, component);

        // 更新反向索引
        let entitySet = this.componentIndex.get(type);
        if (!entitySet) {
            entitySet = new Set();
            this.componentIndex.set(type, entitySet);
        }
        entitySet.add(entityId);

        // 变更追踪
        let addedSet = this.addedComponents.get(type);
        if (!addedSet) {
            addedSet = new Set();
            this.addedComponents.set(type, addedSet);
        }
        addedSet.add(entityId);

        // 兼容旧 componentListMap
        const list = this.componentListMap.get(type) ?? [];
        list.push(component);
        this.componentListMap.set(type, list);

        // 触发监听器
        const listeners = this.onComponentAddedListenerMap.get(type) ?? [];
        listeners.forEach(l => l(type, component));

        // 自动维护层级关系：当添加 ChildOf 时，自动在 parent 上更新 ParentOf
        if (type === ChildOf) {
            const childOf = component as ChildOf;
            this._ensureParentOf(childOf.parentId);
            const parentOf = this.getComponentOfEntity(childOf.parentId, ParentOf) as ParentOf | undefined;
            if (parentOf) {
                parentOf.addChild(entityId);
            }
        }
    }

    /**
     * 从指定 Entity 移除 Component
     */
    removeComponentFromEntity(entityId: string, type: ComponentType): BaseComponent | undefined {
        const compMap = this.entityComponents.get(entityId);
        if (!compMap) return undefined;
        const component = compMap.get(type);
        if (!component) return undefined;

        compMap.delete(type);
        this._removeComponentInternal(entityId, type, component);
        return component;
    }

    /**
     * 获取指定 Entity 的 Component（只读）
     */
    getComponentOfEntity<T extends ComponentType>(entityId: string, type: T): ComponentInstance<T> | undefined {
        const compMap = this.entityComponents.get(entityId);
        if (!compMap) return undefined;
        return compMap.get(type) as ComponentInstance<T> | undefined;
    }

    /**
     * 获取指定 Entity 的 Component（可写，触发变更追踪）
     * 返回 Proxy，setter 触发时记录到 changedComponents
     */
    getComponentOfEntityForWrite<T extends ComponentType>(entityId: string, type: T): ComponentInstance<T> | undefined {
        const compMap = this.entityComponents.get(entityId);
        if (!compMap) return undefined;
        const component = compMap.get(type) as ComponentInstance<T> | undefined;
        if (!component) return undefined;

        // 返回 Proxy 来追踪写入
        return new Proxy(component, {
            set: (target, prop, value) => {
                (target as any)[prop] = value;
                // 记录变更
                let changedSet = this.changedComponents.get(type);
                if (!changedSet) {
                    changedSet = new Set();
                    this.changedComponents.set(type, changedSet);
                }
                changedSet.add(entityId);
                return true;
            }
        });
    }

    /**
     * 检查指定 Entity 是否拥有某个 Component
     */
    hasComponentOnEntity(entityId: string, type: ComponentType): boolean {
        const compMap = this.entityComponents.get(entityId);
        if (!compMap) return false;
        return compMap.has(type);
    }

    /**
     * 获取拥有指定 ComponentType 的所有 Entity ID
     */
    getEntitiesWithComponent(type: ComponentType): Set<string> {
        return this.componentIndex.get(type) ?? new Set();
    }

    /**
     * 获取同时拥有多个 ComponentType 的所有 Entity ID
     */
    getEntitiesWithComponents(types: ComponentType[]): string[] {
        if (types.length === 0) return [];
        const sets = types.map(t => this.componentIndex.get(t) ?? new Set<string>());
        // 取交集
        const first = sets[0];
        const rest = sets.slice(1);
        const result: string[] = [];
        Array.from(first).forEach(id => {
            if (rest.every(s => s.has(id))) {
                result.push(id);
            }
        });
        return result;
    }

    // ========== 变更追踪 ==========

    getAddedEntities(type: ComponentType): Set<string> {
        return this.addedComponents.get(type) ?? new Set();
    }

    getRemovedEntities(type: ComponentType): Set<string> {
        return this.removedComponents.get(type) ?? new Set();
    }

    getChangedEntities(type: ComponentType): Set<string> {
        return this.changedComponents.get(type) ?? new Set();
    }

    /**
     * 帧结束时清理变更追踪
     */
    clearFrameTracking(): void {
        this.addedComponents.clear();
        this.removedComponents.clear();
        this.changedComponents.clear();
    }

    // ========== Component -> Entity 反向查找 ==========

    /**
     * 通过 Component 实例找到它所属的 Entity
     * 遍历 entityComponents 查找
     */
    getEntityByComponent(component: BaseComponent): Entity | undefined {
        const entries = Array.from(this.entityComponents.entries());
        for (let i = 0; i < entries.length; i++) {
            const [entityId, compMap] = entries[i];
            const comps = Array.from(compMap.values());
            for (let j = 0; j < comps.length; j++) {
                if (comps[j] === component) {
                    return this.entityMap.get(entityId);
                }
            }
        }
        return undefined;
    }

    // ========== Query API ==========

    /**
     * 创建查询构建器
     * 使用方式：world.query().with(Transform, Velocity).without(Static)
     */
    query(): QueryBuilder {
        return new QueryBuilder(this);
    }

    // ========== 兼容旧 API ==========

    /**
     * 旧 API：通过 Component 实例添加（保持向后兼容）
     */
    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        // 兼容旧 componentListMap
        const list = this.componentListMap.get(type) ?? [];
        list.push(component);
        this.componentListMap.set(type, list);
        // 触发监听器
        const listeners = this.onComponentAddedListenerMap.get(type) ?? [];
        listeners.forEach(l => l(type, component));
    }

    /**
     * 旧 API：通过 Component 实例移除
     */
    removeComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        let list = this.componentListMap.get(type) ?? [];
        const index = list.indexOf(component);
        if (index > -1) {
            list = list.filter(i => i !== component);
            const listeners = this.onComponentRemovedListenerMap.get(type) ?? [];
            listeners.forEach(l => l(type, component));
        }
        this.componentListMap.set(type, list);
    }

    findComponent<T extends ComponentType>(componentType: T) {
        const list = this.componentListMap.get(componentType) ?? [];
        return list[0] as ComponentInstance<T>;
    }

    findComponents<T extends ComponentType>(componentType: T | T[]) {
        if (Array.isArray(componentType)) {
            const list = componentType.reduce((acc: ComponentInstance<T>[], type: T) => {
                const list = (this.componentListMap.get(type) ?? []) as ComponentInstance<T>[];
                acc.push(...list);
                return acc;
            }, []);
            return list as ComponentInstance<T>[];
        }
        const list = this.componentListMap.get(componentType) ?? [];
        return list as ComponentInstance<T>[];
    }

    addComponentAddedListener<T extends ComponentType>(type: T, listener: OnComponentAddedFunc<T>) {
        const list = this.onComponentAddedListenerMap.get(type) ?? [];
        list.push(listener as OnComponentAddedFunc<ComponentType>);
        this.onComponentAddedListenerMap.set(type, list);
        return () => {
            const list = this.onComponentAddedListenerMap.get(type) ?? [];
            const index = list.indexOf(listener as OnComponentAddedFunc<ComponentType>);
            if (index > -1) {
                list.splice(index, 1);
            }
            this.onComponentAddedListenerMap.set(type, list);
        };
    }

    addComponentRemovedListener<T extends ComponentType>(type: T, listener: OnComponentRemovedFunc<T>) {
        const list = this.onComponentRemovedListenerMap.get(type) ?? [];
        list.push(listener as OnComponentRemovedFunc<ComponentType>);
        this.onComponentRemovedListenerMap.set(type, list);
        return () => {
            const list = this.onComponentRemovedListenerMap.get(type) ?? [];
            const index = list.indexOf(listener as OnComponentRemovedFunc<ComponentType>);
            if (index > -1) {
                list.splice(index, 1);
            }
            this.onComponentRemovedListenerMap.set(type, list);
        };
    }

    // ========== 内部方法 ==========

    private _removeComponentInternal(entityId: string, type: ComponentType, component: BaseComponent): void {
        // 自动维护层级关系：当移除 ChildOf 时，自动在 parent 上更新 ParentOf
        if (type === ChildOf) {
            const childOf = component as ChildOf;
            const parentOf = this.getComponentOfEntity(childOf.parentId, ParentOf) as ParentOf | undefined;
            if (parentOf) {
                parentOf.removeChild(entityId);
            }
        }

        // 更新反向索引
        const entitySet = this.componentIndex.get(type);
        if (entitySet) {
            entitySet.delete(entityId);
        }

        // 变更追踪
        let removedSet = this.removedComponents.get(type);
        if (!removedSet) {
            removedSet = new Set();
            this.removedComponents.set(type, removedSet);
        }
        removedSet.add(entityId);

        // 兼容旧 componentListMap
        let list = this.componentListMap.get(type) ?? [];
        list = list.filter(i => i !== component);
        this.componentListMap.set(type, list);

        // 触发监听器
        const listeners = this.onComponentRemovedListenerMap.get(type) ?? [];
        listeners.forEach(l => l(type, component));
    }

    /**
     * 确保指定 Entity 上有 ParentOf 组件
     */
    private _ensureParentOf(entityId: string): void {
        if (!this.hasComponentOnEntity(entityId, ParentOf)) {
            const parentOf = new ParentOf();
            this.addComponentToEntity(entityId, ParentOf, parentOf);
        }
    }
}
