import { BaseComponent, BaseComponentProps } from '../../Component';

export type ToolMode = 'select' | 'rect' | 'circle' | 'text' | 'image' | 'hand' | 'mindmap';

export interface ToolComponentProps extends BaseComponentProps {
    mode?: ToolMode;
}

/**
 * 工具模式组件 — 存储当前画布的工具模式
 */
export class ToolComponent extends BaseComponent {
    mode: ToolMode = 'select';
    /** 正在绘制中 */
    isDrawing: boolean = false;
    /** 绘制起始点 */
    drawStartX: number = 0;
    drawStartY: number = 0;
    /** 绘制当前点 */
    drawCurrentX: number = 0;
    drawCurrentY: number = 0;

    constructor(props: ToolComponentProps) {
        super(props);
        const { mode = 'select' } = props;
        this.mode = mode;
    }

    /** 获取绘制区域 */
    getDrawRect(): { x: number; y: number; width: number; height: number } {
        const x = Math.min(this.drawStartX, this.drawCurrentX);
        const y = Math.min(this.drawStartY, this.drawCurrentY);
        const width = Math.abs(this.drawCurrentX - this.drawStartX);
        const height = Math.abs(this.drawCurrentY - this.drawStartY);
        return { x, y, width, height };
    }
}
