import { BaseComponent, BaseComponentProps } from '../Component';

/**
 * ParentOf 组件 —— 表示该 Entity 拥有子节点
 * 由 World 自动维护，当 ChildOf 被添加/移除时自动更新 childIds
 */
export class ParentOf extends BaseComponent {
    childIds: string[] = [];

    constructor(props?: BaseComponentProps) {
        super(props);
    }

    addChild(childId: string): void {
        if (!this.childIds.includes(childId)) {
            this.childIds.push(childId);
        }
    }

    removeChild(childId: string): void {
        this.childIds = this.childIds.filter(id => id !== childId);
    }
}
