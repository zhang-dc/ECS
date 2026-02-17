import { IBaseTextureOptions, Sprite, SpriteSource, Texture } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export interface SpriteRendererProps extends RenderComponentProps {
    source: SpriteSource;
    width?: number;
    height?: number;
    options?: IBaseTextureOptions;
}

/**
 * 精灵渲染器 — 用于图片元素
 * 支持通过 updateSize 同步 LayoutComponent 的尺寸
 */
export class SpriteRenderer extends RenderComponent {
    renderObject: Sprite;
    updateProps: Record<string, unknown> = {};
    /** 原始图片源（用于克隆） */
    source: SpriteSource;
    /** 目标显示宽度 */
    displayWidth: number;
    /** 目标显示高度 */
    displayHeight: number;
    /** 原始纹理宽度 */
    naturalWidth: number = 0;
    /** 原始纹理高度 */
    naturalHeight: number = 0;
    /** 透明度 */
    opacity: number = 1;

    constructor(props: SpriteRendererProps) {
        super(props);
        const { source, width, height, options } = props;
        this.source = source;
        this.renderObject = Sprite.from(source);
        this.updateProps = {
           ...options,
        };

        // 记录原始纹理尺寸
        const texture = this.renderObject.texture;
        if (texture && texture.valid) {
            this.naturalWidth = texture.width;
            this.naturalHeight = texture.height;
        }

        // 设置目标尺寸
        this.displayWidth = width ?? (this.naturalWidth || 200);
        this.displayHeight = height ?? (this.naturalHeight || 200);

        // 应用尺寸
        this.applySize();
        this.dirty = true;

        // 如果纹理尚未加载完成，监听加载完成后获取原始尺寸
        if (texture && !texture.valid) {
            texture.baseTexture.on('loaded', () => {
                this.naturalWidth = texture.width;
                this.naturalHeight = texture.height;
                // 如果还没有设置过自定义尺寸，使用原始尺寸
                if (!width && !height) {
                    this.displayWidth = this.naturalWidth;
                    this.displayHeight = this.naturalHeight;
                }
                this.applySize();
                this.dirty = true;
            });
        }
    }

    /** 应用尺寸到 Sprite（通过 scale 实现）。纹理未就绪时跳过，避免异常 scale 值 */
    private applySize(): void {
        const sprite = this.renderObject;
        const texture = sprite.texture;

        // 纹理尚未加载完成时不设置 scale，避免 texW=1 导致 scale=200 等异常值
        if (!texture || !texture.valid || texture.width <= 1 || texture.height <= 1) {
            return;
        }

        sprite.scale.x = this.displayWidth / texture.width;
        sprite.scale.y = this.displayHeight / texture.height;
    }

    /** 更新显示尺寸（由 ResizeSystem / ECSBridge 调用） */
    updateSize(width: number, height: number): void {
        this.displayWidth = width;
        this.displayHeight = height;
        this.applySize();
        this.dirty = true;
    }

    /** 更新透明度 */
    updateOpacity(opacity: number): void {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.renderObject.alpha = this.opacity;
        this.dirty = true;
    }

    /** 替换图片源 */
    replaceSource(source: SpriteSource): void {
        this.source = source;
        const newTexture = Texture.from(source);
        this.renderObject.texture = newTexture;

        // 更新原始尺寸
        if (newTexture.valid) {
            this.naturalWidth = newTexture.width;
            this.naturalHeight = newTexture.height;
        } else {
            newTexture.baseTexture.on('loaded', () => {
                this.naturalWidth = newTexture.width;
                this.naturalHeight = newTexture.height;
            });
        }

        this.applySize();
        this.dirty = true;
    }

    /** 获取原始宽高比 */
    getAspectRatio(): number {
        if (this.naturalHeight <= 0) return 1;
        return this.naturalWidth / this.naturalHeight;
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }
        Object.keys(this.updateProps).forEach((key) => {
            const value = this.updateProps[key];
            if (value !== undefined) {
                if (key === 'scaleX' || key === 'scaleY') {
                    // 跳过 scaleX/scaleY — 由 applySize 控制
                    // LayoutSystem 传来的 scaleX/scaleY 不应覆盖尺寸缩放
                } else if (key === 'anchorX') {
                    this.renderObject.anchor.x = value as number;
                } else if (key === 'anchorY') {
                    this.renderObject.anchor.y = value as number;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (this.renderObject as any)[key] = value;
                }
            }
        });
        // 确保尺寸始终正确
        this.applySize();
        super.updateRenderObject();
    }
}
