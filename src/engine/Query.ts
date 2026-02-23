import { ComponentType } from './Component';
import { Entity } from './Entity';
import { World } from './Stage';

/**
 * QueryBuilder —— 声明式查询构建器
 *
 * 使用方式：
 *   const movers = world.query().with(Transform, Velocity).without(Static);
 *   movers.current  // 所有匹配的实体
 *   movers.added    // 本帧新增匹配的实体
 *   movers.removed  // 本帧移除的实体
 *   movers.changed  // 本帧被 write() 过的实体
 */
export class QueryBuilder {
    private world: World;
    private withTypes: ComponentType[] = [];
    private withoutTypes: ComponentType[] = [];
    private withAnyTypes: ComponentType[] = [];

    constructor(world: World) {
        this.world = world;
    }

    /**
     * 要求实体必须拥有这些 Component
     */
    with(...types: ComponentType[]): QueryBuilder {
        this.withTypes.push(...types);
        return this;
    }

    /**
     * 要求实体不能拥有这些 Component
     */
    without(...types: ComponentType[]): QueryBuilder {
        this.withoutTypes.push(...types);
        return this;
    }

    /**
     * 要求实体拥有任一指定 Component（并集）
     * 用于按基类查询子类，如 withAny(LineRenderer, RectRenderer, SpriteRenderer)
     */
    withAny(...types: ComponentType[]): QueryBuilder {
        this.withAnyTypes.push(...types);
        return this;
    }

    /**
     * 获取所有当前匹配的实体
     */
    get current(): Entity[] {
        // 至少需要 with 或 withAny 条件之一
        if (this.withTypes.length === 0 && this.withAnyTypes.length === 0) return [];

        let entityIds: string[];

        if (this.withTypes.length > 0 && this.withAnyTypes.length > 0) {
            // 同时有 with 和 withAny：先取 with 交集，再与 withAny 并集取交集
            const withIds = new Set(this.world.getEntitiesWithComponents(this.withTypes));
            const anyIds = new Set(this.world.getEntitiesWithAnyComponent(this.withAnyTypes));
            entityIds = Array.from(withIds).filter(id => anyIds.has(id));
        } else if (this.withTypes.length > 0) {
            entityIds = this.world.getEntitiesWithComponents(this.withTypes);
        } else {
            entityIds = this.world.getEntitiesWithAnyComponent(this.withAnyTypes);
        }

        return entityIds
            .filter(id => {
                // 排除拥有 without 类型的实体
                for (const type of this.withoutTypes) {
                    if (this.world.hasComponentOnEntity(id, type)) {
                        return false;
                    }
                }
                return true;
            })
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }

    /**
     * 获取本帧新增匹配的实体
     * （本帧有任一 with 类型被 add 的实体，且满足完整查询条件）
     */
    get added(): Entity[] {
        const addedIds = new Set<string>();
        for (const type of this.withTypes) {
            const ids = this.world.getAddedEntities(type);
            Array.from(ids).forEach(id => addedIds.add(id));
        }

        return Array.from(addedIds)
            .filter(id => {
                // 必须满足完整查询条件
                for (const type of this.withTypes) {
                    if (!this.world.hasComponentOnEntity(id, type)) {
                        return false;
                    }
                }
                for (const type of this.withoutTypes) {
                    if (this.world.hasComponentOnEntity(id, type)) {
                        return false;
                    }
                }
                return true;
            })
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }

    /**
     * 获取本帧移除的实体
     * （本帧有任一 with 类型被 remove 的实体）
     */
    get removed(): Entity[] {
        const removedIds = new Set<string>();
        for (const type of this.withTypes) {
            const ids = this.world.getRemovedEntities(type);
            Array.from(ids).forEach(id => removedIds.add(id));
        }

        return Array.from(removedIds)
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }

    /**
     * 获取本帧被 write() 过的实体
     * （本帧有任一 with 类型被 write 的实体，且满足完整查询条件）
     */
    get changed(): Entity[] {
        const changedIds = new Set<string>();
        for (const type of this.withTypes) {
            const ids = this.world.getChangedEntities(type);
            Array.from(ids).forEach(id => changedIds.add(id));
        }

        return Array.from(changedIds)
            .filter(id => {
                // 必须满足完整查询条件
                for (const type of this.withTypes) {
                    if (!this.world.hasComponentOnEntity(id, type)) {
                        return false;
                    }
                }
                for (const type of this.withoutTypes) {
                    if (this.world.hasComponentOnEntity(id, type)) {
                        return false;
                    }
                }
                return true;
            })
            .map(id => this.world.getEntityById(id))
            .filter((e): e is Entity => e !== undefined);
    }
}
