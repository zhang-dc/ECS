import { System, SystemProps } from '../../System';
import { EventManager, instanceEventManager } from './Event';

/**
 * EventSystem —— 每帧清空事件队列
 * 无约束，默认最早执行
 */
export class EventSystem extends System {
    eventManager?: EventManager;

    constructor(props: SystemProps) {
        super(props);
        instanceEventManager({ world: this.world });
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        this.eventManager?.clearEvent();
    }
}
