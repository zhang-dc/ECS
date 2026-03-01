/**
 * 事件系统
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { EventConfig, EventType, RandomEvents } from '../../data/EventTypes';

interface ActiveEvent {
    config: EventConfig;
    hasChoices: boolean;
    resolved: boolean;
}

export interface EventSystemProps {
    world: Stage;
}

export class EventSystem extends System {
    private eventPool: EventConfig[] = [];
    private activeEvent?: ActiveEvent;
    private eventHistory: EventConfig[] = [];

    constructor(props: EventSystemProps) {
        super(props);
    }

    start(): void {
        console.log('[EventSystem] 事件系统启动');
        this.eventPool = [...RandomEvents];
    }

    checkEventTrigger(year: number, month?: number, population?: number, money?: number): EventConfig | null {
        const availableEvents = this.eventPool.filter(event => {
            if (event.triggerYear > year) return false;
            if (event.triggerMonth && event.triggerMonth !== month) return false;
            if (Math.random() > event.probability) return false;
            if (event.conditions) {
                if (event.conditions.minPopulation && (!population || population < event.conditions.minPopulation)) return false;
                if (event.conditions.minMoney && (!money || money < event.conditions.minMoney)) return false;
            }
            if (this.eventHistory.some(e => e.id === event.id)) return false;
            return true;
        });

        if (availableEvents.length > 0) {
            const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
            this.triggerEvent(event);
            return event;
        }
        return null;
    }

    triggerEvent(config: EventConfig): void {
        this.activeEvent = {
            config,
            hasChoices: !!(config.choices && config.choices.length > 0),
            resolved: false,
        };
        this.eventHistory.push(config);
        console.log(`[EventSystem] 事件触发: ${config.title}`);
        this.world.emit('game:event', config);
    }

    handleChoice(choiceId: string): boolean {
        if (!this.activeEvent || !this.activeEvent.config.choices) return false;
        const choice = this.activeEvent.config.choices.find(c => c.id === choiceId);
        if (!choice) return false;
        this.activeEvent.resolved = true;
        this.activeEvent = undefined;
        return true;
    }

    getActiveEvent(): EventConfig | null {
        return this.activeEvent?.config || null;
    }

    getEventHistory(): EventConfig[] {
        return this.eventHistory;
    }

    dismissEvent(): void {
        if (this.activeEvent) {
            this.activeEvent.resolved = true;
            this.activeEvent = undefined;
        }
    }
}
