import { BaseEvent, EventProps } from '../event/Event';
import { Entity } from '../../Entity';

export enum MindMapEventType {
    /** 添加子节点 */
    AddChild = 'AddChild',
    /** 添加兄弟节点 */
    AddSibling = 'AddSibling',
    /** 删除节点 */
    DeleteNode = 'DeleteNode',
    /** 折叠/展开 */
    ToggleCollapse = 'ToggleCollapse',
    /** 编辑节点文本 */
    EditText = 'EditText',
    /** 请求重新布局 */
    RelayoutRequest = 'RelayoutRequest',
}

export interface MindMapEventData {
    type: MindMapEventType;
    targetEntity?: Entity;
    text?: string;
}

export interface MindMapEventProps extends EventProps {
    data: MindMapEventData;
}

export class MindMapEvent extends BaseEvent {
    data: MindMapEventData;

    constructor(props: MindMapEventProps) {
        super(props);
        this.data = props.data;
    }
}
