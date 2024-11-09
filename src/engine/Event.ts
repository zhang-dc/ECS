/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';

export interface IEvent {
    id: string;
    data: any;
}

export interface EventProps {
    data: any;
}

export class Event implements IEvent {
    id: string;
    data: any;

    constructor(props: EventProps) {
        this.id = uuidv4();
        const { data } = props;
        this.data = data;
    }
}
