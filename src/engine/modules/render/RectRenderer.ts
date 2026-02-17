import { Graphics } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export interface RectRendererProps extends RenderComponentProps {
    width?: number;
    height?: number;
    fillColor?: number;
    fillAlpha?: number;
    strokeColor?: number;
    strokeWidth?: number;
}

export class RectRenderer extends RenderComponent {
    renderObject: Graphics;
    updateProps: Record<string, unknown> = {};
    rectWidth: number;
    rectHeight: number;
    fillColor: number;
    fillAlpha: number;
    strokeColor?: number;
    strokeWidth: number;

    constructor(props: RectRendererProps) {
        super(props);
        const {
            width = 100,
            height = 100,
            fillColor = 0xffffff,
            fillAlpha = 1,
            strokeColor,
            strokeWidth = 0,
        } = props;
        this.rectWidth = width;
        this.rectHeight = height;
        this.fillColor = fillColor;
        this.fillAlpha = fillAlpha;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.renderObject = new Graphics();
        this.drawRect();
        this.dirty = true;
    }

    drawRect() {
        const g = this.renderObject;
        g.clear();
        if (this.strokeColor !== undefined && this.strokeWidth > 0) {
            g.lineStyle(this.strokeWidth, this.strokeColor);
        }
        g.beginFill(this.fillColor, this.fillAlpha);
        g.drawRect(0, 0, this.rectWidth, this.rectHeight);
        g.endFill();
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
