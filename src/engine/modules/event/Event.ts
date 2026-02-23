/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import { BaseComponent } from '../../Component';
import { World } from '../../Stage';
import { DefaultEntityName } from '../../interface/Entity';
import { Entity } from '../../Entity';

export interface IEvent {
    id: string;
    data: any;
}

export type EventType = new (props: any) => IEvent;
export type EventInstance<T extends EventType> = InstanceType<T>;

export interface EventProps {
    data: any;
}

export class BaseEvent implements IEvent {
    id: string;
    data: any;

    constructor(props: EventProps) {
        this.id = uuidv4();
        const { data } = props;
        this.data = data;
    }
}

/**
 * EventManager —— 纯数据组件
 * 只存储事件队列，不包含行为逻辑
 */
export class EventManager extends BaseComponent {
    eventListMap: Map<EventType, EventInstance<EventType>[]> = new Map();

    getEvents<T extends EventType>(type: T) {
        return this.eventListMap.get(type) as EventInstance<T>[];
    }
}

/**
 * 向 EventManager 发送事件（工具函数）
 */
export function sendEvent(eventManager: EventManager, event: BaseEvent): void {
    const type = event.constructor as EventType;
    const list = eventManager.eventListMap.get(type) ?? [];
    eventManager.eventListMap.set(type, [...list, event]);
}

/**
 * 清空 EventManager 的事件队列（工具函数）
 */
export function clearEvents(eventManager: EventManager): void {
    eventManager.eventListMap.clear();
}

export interface InstanceEventManagerProps {
    world: World;
}

export function instanceEventManager(props: InstanceEventManagerProps) {
    const { world } = props;

    const eventManager = new EventManager({
        name: DefaultEntityName.EventManager,
    });

    const entity = new Entity({
        name: DefaultEntityName.EventManager,
        world,
    });

    entity.addComponent(eventManager);

    return entity;
}
