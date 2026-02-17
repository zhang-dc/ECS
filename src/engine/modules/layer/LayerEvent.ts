import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';

export enum LayerOperation {
    /** 置顶 */
    BringToFront = 'BringToFront',
    /** 置底 */
    SendToBack = 'SendToBack',
    /** 上移一层 */
    BringForward = 'BringForward',
    /** 下移一层 */
    SendBackward = 'SendBackward',
    /** 设置指定 zIndex */
    SetZIndex = 'SetZIndex',
}

export interface LayerEventData {
    operation: LayerOperation;
    entities: Entity[];
    /** 用于 SetZIndex 操作 */
    zIndex?: number;
}

export interface LayerEventProps extends EventProps {
    data: LayerEventData;
}

export class LayerEvent extends BaseEvent {
    data: LayerEventData;

    constructor(props: LayerEventProps) {
        super(props);
        this.data = props.data;
    }
}
