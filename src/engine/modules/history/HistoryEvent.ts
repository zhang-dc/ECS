import { BaseEvent, EventProps } from '../event/Event';
import { ICommand } from './Command';

export enum HistoryOperation {
    Execute = 'Execute',
    Undo = 'Undo',
    Redo = 'Redo',
    Clear = 'Clear',
}

export interface HistoryEventData {
    operation: HistoryOperation;
    /** 用于 Execute 操作 */
    command?: ICommand;
}

export interface HistoryEventProps extends EventProps {
    data: HistoryEventData;
}

export class HistoryEvent extends BaseEvent {
    data: HistoryEventData;

    constructor(props: HistoryEventProps) {
        super(props);
        this.data = props.data;
    }
}
