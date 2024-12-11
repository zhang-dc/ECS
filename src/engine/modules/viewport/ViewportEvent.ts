import { BaseEvent } from '../event/Event';

export enum ViewportOperation {
    Resize = 'Resize',
    Move = 'Move',
}

export class ViewportEvent extends BaseEvent {

}