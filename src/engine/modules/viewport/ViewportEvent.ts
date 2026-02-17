import { BaseEvent, EventProps } from '../event/Event';

export enum ViewportOperation {
    Resize = 'Resize',
    Pan = 'Pan',
    Zoom = 'Zoom',
    ZoomAt = 'ZoomAt',
    FitToContent = 'FitToContent',
}

export interface ViewportEventData {
    operation: ViewportOperation;
    /** 用于 Pan 操作的屏幕像素偏移 */
    deltaScreenX?: number;
    deltaScreenY?: number;
    /** 用于 Zoom/ZoomAt 操作的新缩放值 */
    newScale?: number;
    /** 用于 ZoomAt 操作的缩放中心（屏幕坐标） */
    screenX?: number;
    screenY?: number;
}

export interface ViewportEventProps extends EventProps {
    data: ViewportEventData;
}

export class ViewportEvent extends BaseEvent {
    data: ViewportEventData;

    constructor(props: ViewportEventProps) {
        super(props);
        this.data = props.data;
    }
}