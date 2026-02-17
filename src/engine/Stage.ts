import { ComponentInstance, ComponentType } from './Component';
import { Entity } from './Entity';

type OnComponentAddedFunc<T extends ComponentType> = (type: T, comp: ComponentInstance<T>) => void;
type OnComponentRemovedFunc<T extends ComponentType> = (type: T, comp: ComponentInstance<T>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StageEventCallback = (...args: any[]) => void;

/** 跨层通信事件名称常量 */
export const StageEvents = {
    ENTITY_ADD: 'entity:add',
    ENTITY_REMOVE: 'entity:remove',
    SELECTION_CHANGE: 'selection:change',
    VIEWPORT_CHANGE: 'viewport:change',
    HISTORY_CHANGE: 'history:change',
    ENTITY_MOVE: 'entity:move',
    TOOL_CHANGE: 'tool:change',
    /** 请求对指定实体启动文本编辑（由 TextEditSystem 监听） */
    TEXT_EDIT_REQUEST: 'text:edit:request',
    /** 复制选中实体到剪贴板 */
    CLIPBOARD_COPY: 'clipboard:copy',
    /** 粘贴剪贴板内容 */
    CLIPBOARD_PASTE: 'clipboard:paste',
    /** 原地复制选中实体 */
    DUPLICATE: 'duplicate',
} as const;

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
    onComponentAddedListenerMap: Map<ComponentType, OnComponentAddedFunc<ComponentType>[]> = new Map();
    onComponentRemovedListenerMap: Map<ComponentType, OnComponentRemovedFunc<ComponentType>[]> = new Map();

    /** 全局标志：是否正在 resize 操作中（用于阻止 DragSystem/SelectSystem 干扰） */
    isResizing: boolean = false;
    /** 全局标志：是否正在拖拽中（用于 GuideSystem 仅在拖拽时显示对齐线） */
    isDragging: boolean = false;
    /** 全局标志：是否正在文本编辑中（用于阻止 SelectSystem/DragSystem 干扰） */
    isTextEditing: boolean = false;

    /**
     * 通用事件总线 — 用于 ECS 系统与外部（React UI）之间的跨层通信
     * 不同于帧级 EventManager（帧内系统间通信），这个是即时通知
     */
    private stageListeners: Map<string, Set<StageEventCallback>> = new Map();

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).stage = this;
    }

    // ==================== EventBus ====================

    /** 监听事件 */
    on(event: string, callback: StageEventCallback): () => void {
        const set = this.stageListeners.get(event) ?? new Set();
        set.add(callback);
        this.stageListeners.set(event, set);
        return () => this.off(event, callback);
    }

    /** 取消监听 */
    off(event: string, callback: StageEventCallback): void {
        const set = this.stageListeners.get(event);
        if (set) {
            set.delete(callback);
        }
    }

    /** 触发事件 */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): void {
        const set = this.stageListeners.get(event);
        if (set) {
            set.forEach(cb => cb(...args));
        }
    }

    // ==================== Entity 管理 ====================

    addEntity(entity: Entity) {
        this.entities.push(entity);
        entity.components.forEach(c => {
            const componentType = c.constructor as ComponentType;
            const list = this.componentListMap.get(componentType) ?? [];
            this.componentListMap.set(componentType, [...list, c]);
        });
        this.emit(StageEvents.ENTITY_ADD, entity);
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
        this.emit(StageEvents.ENTITY_REMOVE, entity);
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

    findEntityByName(name: string): Entity|undefined {
        return this.entities.find(e => e.name === name);
    }

    addComponent<T extends ComponentType>(component: ComponentInstance<T>) {
        const type = component.constructor as ComponentType;
        const list = this.componentListMap.get(type) ?? [];
        list.push(component);
        this.componentListMap.set(type, list);
        const listeners = this.onComponentAddedListenerMap.get(type) ?? [];
        listeners.forEach(l => l(type, component));
    }

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
        const list = this.onComponentRemovedListenerMap.get(type)?? [];
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
}
