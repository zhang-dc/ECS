import { BaseComponent, BaseComponentProps } from '../../Component';
import { Entity } from '../../Entity';

export interface MindMapNodeStyle {
    fillColor: number;
    strokeColor: number;
    strokeWidth: number;
    cornerRadius: number;
    textColor: number;
    fontSize: number;
}

const DEFAULT_ROOT_STYLE: MindMapNodeStyle = {
    fillColor: 0x4285F4,
    strokeColor: 0x3367D6,
    strokeWidth: 0,
    cornerRadius: 8,
    textColor: 0xFFFFFF,
    fontSize: 18,
};

const DEFAULT_CHILD_STYLE: MindMapNodeStyle = {
    fillColor: 0xFFFFFF,
    strokeColor: 0xDADADA,
    strokeWidth: 1,
    cornerRadius: 6,
    textColor: 0x333333,
    fontSize: 14,
};

export function getDefaultNodeStyle(level: number): MindMapNodeStyle {
    return level === 0 ? { ...DEFAULT_ROOT_STYLE } : { ...DEFAULT_CHILD_STYLE };
}

export interface MindMapNodeComponentProps extends BaseComponentProps {
    text?: string;
    level?: number;
    collapsed?: boolean;
    nodeStyle?: Partial<MindMapNodeStyle>;
    /** 是否为占位文本（新建节点默认 true，编辑后变为 false） */
    isPlaceholder?: boolean;
}

/**
 * 思维导图节点组件
 * 挂载在每个思维导图节点 Entity 上，存储节点元数据
 */
export class MindMapNodeComponent extends BaseComponent {
    /** 节点文本 */
    text: string;
    /** 节点层级（0=根节点） */
    level: number;
    /** 是否折叠子节点 */
    collapsed: boolean;
    /** 到父节点的连线 Entity */
    connectionEntity?: Entity;
    /** 节点样式 */
    nodeStyle: MindMapNodeStyle;
    /** 是否为占位文本（新建节点默认 true，用户编辑后变为 false） */
    isPlaceholder: boolean;

    constructor(props: MindMapNodeComponentProps) {
        super(props);
        const { text = '新节点', level = 0, collapsed = false, nodeStyle, isPlaceholder } = props;
        this.text = text;
        this.level = level;
        this.collapsed = collapsed;
        this.isPlaceholder = isPlaceholder ?? true; // 默认为占位文本
        this.nodeStyle = {
            ...getDefaultNodeStyle(level),
            ...nodeStyle,
        };
    }
}
