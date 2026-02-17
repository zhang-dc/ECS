import { BaseComponent, BaseComponentProps } from '../../Component';

export interface GuideComponentProps extends BaseComponentProps {
    /** 是否显示网格 */
    showGrid?: boolean;
    /** 网格大小 */
    gridSize?: number;
    /** 是否显示智能对齐线 */
    showSmartGuides?: boolean;
    /** 对齐吸附阈值（像素） */
    snapThreshold?: number;
}

/**
 * 辅助线/网格配置组件
 * 作为单例挂载在 Guide 实体上
 */
export class GuideComponent extends BaseComponent {
    /** 是否显示网格 */
    showGrid: boolean = true;
    /** 网格大小（世界坐标单位） */
    gridSize: number = 20;
    /** 是否显示智能对齐线 */
    showSmartGuides: boolean = true;
    /** 对齐吸附阈值（世界坐标单位） */
    snapThreshold: number = 5;
    /** 当前活跃的对齐线（由 GuideSystem 计算） */
    activeGuideLines: GuideLine[] = [];
    /** 标记是否需要重绘 */
    dirty: boolean = false;

    constructor(props: GuideComponentProps) {
        super(props);
        const {
            showGrid = true,
            gridSize = 20,
            showSmartGuides = true,
            snapThreshold = 5,
        } = props;
        this.showGrid = showGrid;
        this.gridSize = gridSize;
        this.showSmartGuides = showSmartGuides;
        this.snapThreshold = snapThreshold;
    }
}

export interface GuideLine {
    /** 方向：水平或垂直 */
    direction: 'horizontal' | 'vertical';
    /** 位置（世界坐标） */
    position: number;
}
