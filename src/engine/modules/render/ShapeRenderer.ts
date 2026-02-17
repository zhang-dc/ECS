import { Graphics, Matrix, Texture } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export enum ShapeType {
    Rectangle = 'Rectangle',
    RoundedRectangle = 'RoundedRectangle',
    Circle = 'Circle',
    Ellipse = 'Ellipse',
    Polygon = 'Polygon',
}

export interface ShapeStyle {
    fillColor?: number;
    fillAlpha?: number;
    strokeColor?: number;
    strokeWidth?: number;
    strokeAlpha?: number;
}

export interface ShapeRendererProps extends RenderComponentProps {
    shapeType: ShapeType;
    width?: number;
    height?: number;
    radius?: number;
    /** 圆角半径（用于 RoundedRectangle） */
    cornerRadius?: number;
    /** 多边形顶点 */
    points?: number[];
    style?: ShapeStyle;
    /** 纹理填充源（图片 URL / data URL），用于图片元素 */
    textureFillSource?: string;
}

export interface TextureFillInfo {
    source: string;
    naturalWidth: number;
    naturalHeight: number;
    opacity: number;
}

/**
 * 图形渲染器 — 支持矩形、圆角矩形、圆形、椭圆、多边形
 * 支持纹理填充（用于图片元素），通过 beginTextureFill 将图片渲染为矩形填充
 */
export class ShapeRenderer extends RenderComponent {
    renderObject: Graphics;
    updateProps: Record<string, unknown> = {};
    shapeType: ShapeType;
    shapeWidth: number;
    shapeHeight: number;
    radius: number;
    cornerRadius: number;
    points: number[];
    style: ShapeStyle;

    /** 纹理填充相关 */
    fillTexture?: Texture;
    fillTextureSource?: string;
    naturalWidth: number = 0;
    naturalHeight: number = 0;
    opacity: number = 1;
    /** 翻转状态（用于图片纹理镜像） */
    flipX: boolean = false;
    flipY: boolean = false;

    constructor(props: ShapeRendererProps) {
        super(props);
        const {
            shapeType,
            width = 100,
            height = 100,
            radius = 50,
            cornerRadius = 8,
            points = [],
            style = {},
            textureFillSource,
        } = props;
        this.shapeType = shapeType;
        this.shapeWidth = width;
        this.shapeHeight = height;
        this.radius = radius;
        this.cornerRadius = cornerRadius;
        this.points = points;
        this.style = {
            fillColor: 0xffffff,
            fillAlpha: 1,
            strokeColor: 0x333333,
            strokeWidth: 1,
            strokeAlpha: 1,
            ...style,
        };
        this.renderObject = new Graphics();

        // 如果有纹理填充源，初始化纹理
        if (textureFillSource) {
            this.initTextureFill(textureFillSource);
        }

        this.drawShape();
        this.dirty = true;
    }

    /** 初始化纹理填充 */
    private initTextureFill(source: string): void {
        this.fillTextureSource = source;
        this.fillTexture = Texture.from(source);

        if (this.fillTexture.valid) {
            this.naturalWidth = this.fillTexture.width;
            this.naturalHeight = this.fillTexture.height;
        } else {
            this.fillTexture.baseTexture.on('loaded', () => {
                if (this.fillTexture) {
                    this.naturalWidth = this.fillTexture.width;
                    this.naturalHeight = this.fillTexture.height;
                }
                // 纹理加载完成后重绘
                this.drawShape();
                this.dirty = true;
            });
        }
    }

    /** 设置/替换纹理填充 */
    setTextureFill(source: string): void {
        this.initTextureFill(source);
        this.drawShape();
        this.dirty = true;
    }

    /** 移除纹理填充，恢复纯色 */
    removeTextureFill(): void {
        this.fillTexture = undefined;
        this.fillTextureSource = undefined;
        this.naturalWidth = 0;
        this.naturalHeight = 0;
        this.drawShape();
        this.dirty = true;
    }

    /** 更新透明度 */
    updateOpacity(opacity: number): void {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.renderObject.alpha = this.opacity;
        this.dirty = true;
    }

    /** 设置翻转状态（用于反向缩放时图片纹理镜像） */
    setFlip(flipX: boolean, flipY: boolean): void {
        if (this.flipX === flipX && this.flipY === flipY) return;
        this.flipX = flipX;
        this.flipY = flipY;
        this.drawShape();
        this.dirty = true;
    }

    /** 获取纹理填充信息（供 PropertyPanel 使用） */
    getTextureFillInfo(): TextureFillInfo | undefined {
        if (!this.fillTextureSource) return undefined;
        return {
            source: this.fillTextureSource,
            naturalWidth: this.naturalWidth,
            naturalHeight: this.naturalHeight,
            opacity: this.opacity,
        };
    }

    /** 重绘图形 */
    drawShape() {
        const g = this.renderObject;
        g.clear();

        const { fillColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha } = this.style;

        if (strokeColor !== undefined && strokeWidth) {
            g.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        }

        // 决定填充方式：纹理填充优先于纯色填充
        const useTextureFill = this.fillTexture && this.fillTexture.valid
            && this.fillTexture.width > 1 && this.fillTexture.height > 1;

        if (useTextureFill && this.fillTexture) {
            // 纹理填充：通过 Matrix 缩放让纹理铺满矩形，支持翻转镜像
            const texW = this.fillTexture.width;
            const texH = this.fillTexture.height;
            let sx = this.shapeWidth / texW;
            let sy = this.shapeHeight / texH;
            let tx = 0;
            let ty = 0;
            if (this.flipX) { sx = -sx; tx = this.shapeWidth; }
            if (this.flipY) { sy = -sy; ty = this.shapeHeight; }
            const matrix = new Matrix().scale(sx, sy).translate(tx, ty);
            g.beginTextureFill({
                texture: this.fillTexture,
                matrix,
                alpha: 1,
            });
        } else if (fillColor !== undefined) {
            g.beginFill(fillColor, fillAlpha);
        }

        switch (this.shapeType) {
            case ShapeType.Rectangle:
                g.drawRect(0, 0, this.shapeWidth, this.shapeHeight);
                break;
            case ShapeType.RoundedRectangle:
                g.drawRoundedRect(0, 0, this.shapeWidth, this.shapeHeight, this.cornerRadius);
                break;
            case ShapeType.Circle:
                g.drawEllipse(this.shapeWidth / 2, this.shapeHeight / 2, this.shapeWidth / 2, this.shapeHeight / 2);
                break;
            case ShapeType.Ellipse:
                g.drawEllipse(this.shapeWidth / 2, this.shapeHeight / 2, this.shapeWidth / 2, this.shapeHeight / 2);
                break;
            case ShapeType.Polygon:
                if (this.points.length >= 4) {
                    g.drawPolygon(this.points);
                }
                break;
        }

        if (useTextureFill || fillColor !== undefined) {
            g.endFill();
        }
    }

    /** 更新样式并重绘 */
    updateStyle(style: Partial<ShapeStyle>) {
        this.style = { ...this.style, ...style };
        this.drawShape();
        this.dirty = true;
    }

    /** 更新尺寸并重绘 */
    updateSize(width: number, height: number) {
        this.shapeWidth = width;
        this.shapeHeight = height;
        this.radius = Math.min(width, height) / 2;
        this.drawShape();
        this.dirty = true;
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }
        Object.keys(this.updateProps).forEach((key) => {
            const value = this.updateProps[key];
            if (value !== undefined) {
                if (key === 'scaleX') {
                    this.renderObject.scale.x = value as number;
                } else if (key === 'scaleY') {
                    this.renderObject.scale.y = value as number;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (this.renderObject as any)[key] = value;
                }
            }
        });
        super.updateRenderObject();
    }
}
