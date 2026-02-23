import { BaseComponent, BaseComponentProps } from '../Component';

/**
 * ParentOf 组件 —— 表示该 Entity 拥有子节点
 * 纯数据组件，由 World 自动维护 childIds
 */
export class ParentOf extends BaseComponent {
    childIds: string[] = [];

    constructor(props?: BaseComponentProps) {
        super(props);
    }
}
