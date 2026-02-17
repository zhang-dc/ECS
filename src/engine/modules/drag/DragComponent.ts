import { BaseComponent, BaseComponentProps } from '../../Component';

export interface DragComponentProps extends BaseComponentProps {
    /** 是否允许拖拽 */
    draggable?: boolean;
    /** 是否启用网格吸附 */
    snapToGrid?: boolean;
    /** 网格大小 */
    gridSize?: number;
}

/**
 * 标记实体可被拖拽的组件
 */
export class DragComponent extends BaseComponent {
    /** 是否允许拖拽 */
    draggable: boolean = true;
    /** 是否启用网格吸附 */
    snapToGrid: boolean = false;
    /** 网格大小 */
    gridSize: number = 10;

    constructor(props: DragComponentProps) {
        super(props);
        const { draggable = true, snapToGrid = false, gridSize = 10 } = props;
        this.draggable = draggable;
        this.snapToGrid = snapToGrid;
        this.gridSize = gridSize;
    }
}
