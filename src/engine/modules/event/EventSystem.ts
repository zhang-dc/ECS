import { System, SystemProps } from '../../System';
import { EventManager, instanceEventManager } from './Event';

export class EventSystem extends System {
    eventManager?: EventManager;

    constructor(props: SystemProps) {
        super(props);
        instanceEventManager({world: this.world});
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        this.eventManager?.clearEvent();
    }
}