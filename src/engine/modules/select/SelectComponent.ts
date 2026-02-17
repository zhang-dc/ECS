import { BaseComponent, BaseComponentProps } from '../../Component';

export interface SelectComponentProps extends BaseComponentProps {
    /** 是否允许被选中 */
    selectable?: boolean;
}

/**
 * 标记实体可被选择的组件
 * 添加此组件的实体可以被点选和框选
 */
export class SelectComponent extends BaseComponent {
    /** 是否允许被选中 */
    selectable: boolean = true;
    /** 当前是否被选中 */
    selected: boolean = false;

    constructor(props: SelectComponentProps) {
        super(props);
        const { selectable = true } = props;
        this.selectable = selectable;
    }
}
