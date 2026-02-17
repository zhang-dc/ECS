import { Entity } from '../../Entity';
import { BaseEvent, EventProps } from '../event/Event';

export enum SelectOperation {
    /** 单选（替换当前选中） */
    Select = 'Select',
    /** 追加选中（Shift/Ctrl + 点击） */
    Toggle = 'Toggle',
    /** 框选 */
    Marquee = 'Marquee',
    /** 全选 */
    SelectAll = 'SelectAll',
    /** 取消全部选中 */
    DeselectAll = 'DeselectAll',
}

export interface SelectEventData {
    operation: SelectOperation;
    /** 被操作的实体列表 */
    entities?: Entity[];
    /** 框选区域（世界坐标） */
    marqueeRect?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface SelectEventProps extends EventProps {
    data: SelectEventData;
}

export class SelectEvent extends BaseEvent {
    data: SelectEventData;

    constructor(props: SelectEventProps) {
        super(props);
        this.data = props.data;
    }
}
