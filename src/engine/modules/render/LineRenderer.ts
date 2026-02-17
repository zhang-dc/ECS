import { Graphics } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export interface LineRendererProps extends RenderComponentProps {
    points?: Array<{ x: number; y: number }>;
    color?: number;
    lineWidth?: number;
    alpha?: number;
}

export class LineRenderer extends RenderComponent {
    renderObject: Graphics;
    updateProps: Record<string, unknown> = {};
    points: Array<{ x: number; y: number }>;
    color: number;
    lineWidth: number;
    lineAlpha: number;

    constructor(props: LineRendererProps) {
        super(props);
        const {
            points = [],
            color = 0x333333,
            lineWidth = 1,
            alpha = 1,
        } = props;
        this.points = points;
        this.color = color;
        this.lineWidth = lineWidth;
        this.lineAlpha = alpha;
        this.renderObject = new Graphics();
        this.drawLine();
        this.dirty = true;
    }

    drawLine() {
        const g = this.renderObject;
        g.clear();
        if (this.points.length < 2) return;
        g.lineStyle(this.lineWidth, this.color, this.lineAlpha);
        g.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            g.lineTo(this.points[i].x, this.points[i].y);
        }
    }

    /** 更新线段顶点并重绘 */
    setPoints(points: Array<{ x: number; y: number }>) {
        this.points = points;
        this.drawLine();
        this.dirty = true;
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }
        Object.keys(this.updateProps).forEach((key) => {
            const value = this.updateProps[key];
            if (value !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this.renderObject as any)[key] = value;
            }
        });
        super.updateRenderObject();
    }
}
