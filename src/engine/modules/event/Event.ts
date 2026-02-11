/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import { BaseComponent } from '../../Component';
import { Stage } from '../../Stage';
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
 * 只存储事件队列，行为逻辑由 EventSystem 驱动
 */
export class EventManager extends BaseComponent {
    eventListMap: Map<EventType, EventInstance<EventType>[]> = new Map();

    getEvents<T extends EventType>(type: T) {
        return this.eventListMap.get(type) as EventInstance<T>[];
    }

    sendEvent(event: BaseEvent) {
        const type = event.constructor as EventType;
        const list = this.eventListMap.get(type) ?? [];
        this.eventListMap.set(type, [...list, event]);
    }

    clearEvent() {
        this.eventListMap.clear();
    }
}

export interface InstanceEventManagerProps {
    world: Stage;
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

    world.addEntity(entity);

    return entity;
}
