import { BaseComponent, BaseComponentProps } from '../Component';

export interface ChildOfProps extends BaseComponentProps {
    parentId: string;
}

/**
 * ChildOf 组件 —— 表示该 Entity 是某个 Entity 的子节点
 * 当添加到 Entity 上时，World 会自动在 parent Entity 上更新 ParentOf.childIds
 */
export class ChildOf extends BaseComponent {
    parentId: string;

    constructor(props: ChildOfProps) {
        super(props);
        this.parentId = props.parentId;
    }
}
