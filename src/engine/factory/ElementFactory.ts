import { Application } from 'pixi.js';
import { Entity } from '../Entity';
import { Stage } from '../Stage';
import { LayoutComponent } from '../modules/layout/LayoutComponent';
import { LayoutEvent } from '../modules/layout/LayoutEvent';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../modules/hitTest/HitTestComponent';
import { HitTestName } from '../modules/hitTest/HitTest';
import { SelectComponent } from '../modules/select/SelectComponent';
import { DragComponent } from '../modules/drag/DragComponent';
import { EventManager } from '../modules/event/Event';
import { ShapeRenderer, ShapeType, ShapeStyle } from '../modules/render/ShapeRenderer';
import { TextRenderer } from '../modules/render/TextRenderer';
import { RichTextRenderer } from '../modules/render/RichTextRenderer';
import { getRenderComponents } from '../modules/render/Renderer';
import { RenderConfig } from '../modules/render/RenderConfig';
import { RichTextComponent } from '../modules/text/RichTextComponent';
import { createSimpleEditor } from '../modules/text/createSimpleEditor';

let elementCounter = 0;

function nextId(prefix: string): string {
    elementCounter++;
    return `${prefix}_${elementCounter}`;
}

// ==================== 创建选项接口 ====================

export interface CreateRectOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: number;
    strokeColor?: number;
    strokeWidth?: number;
    cornerRadius?: number;
    zIndex?: number;
}

export interface CreateCircleOptions {
    x: number;
    y: number;
    radius: number;
    width?: number;   // 椭圆宽度（不传则用 radius*2）
    height?: number;  // 椭圆高度（不传则用 radius*2）
    fillColor?: number;
    strokeColor?: number;
    strokeWidth?: number;
    zIndex?: number;
}

export interface CreateTextOptions {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    color?: number;
    fontFamily?: string;
    zIndex?: number;
}

export interface CreateImageOptions {
    x: number;
    y: number;
    width?: number;
    height?: number;
    src: string;
    zIndex?: number;
}

/**
 * 元素工厂 — 统一的画布实体创建 API
 * 每个 createXxx 方法创建一个完整的画布实体（含所有必要组件）
 */
export class ElementFactory {
    private world: Stage;
    private renderStage: Application;

    constructor(world: Stage, renderStage: Application) {
        this.world = world;
        this.renderStage = renderStage;
    }

    /** 创建矩形 */
    createRect(options: CreateRectOptions): Entity {
        const {
            x, y, width, height,
            fillColor = 0x4A90D9,
            strokeColor = 0x333333,
            strokeWidth = 1,
            cornerRadius,
            zIndex = 0,
        } = options;

        const name = nextId('Rect');
        const entity = new Entity({ name, world: this.world });

        // 渲染组件
        const shapeType = cornerRadius ? ShapeType.RoundedRectangle : ShapeType.Rectangle;
        const style: ShapeStyle = { fillColor, strokeColor, strokeWidth };
        const renderer = new ShapeRenderer({
            renderStage: this.renderStage,
            zIndex,
            shapeType,
            width,
            height,
            cornerRadius,
            style,
        });
        entity.addComponent(renderer);

        // 布局组件
        const layout = new LayoutComponent({
            position: { x, y },
            width,
            height,
            zIndex,
        });
        entity.addComponent(layout);

        // 碰撞检测组件
        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: {
                offset: [0, 0],
                size: [width, height],
            },
            name: HitTestName.Renderer,
        });
        entity.addComponent(hitTest);

        // 选择 + 拖拽组件
        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        // 添加到世界
        this.world.addEntity(entity);

        // 触发首次布局
        this.triggerLayout(entity);

        return entity;
    }

    /** 创建圆形/椭圆 */
    createCircle(options: CreateCircleOptions): Entity {
        const {
            x, y, radius,
            fillColor = 0x50C878,
            strokeColor = 0x333333,
            strokeWidth = 1,
            zIndex = 0,
        } = options;

        const diameter = radius * 2;
        const w = options.width ?? diameter;
        const h = options.height ?? diameter;

        const name = nextId('Circle');
        const entity = new Entity({ name, world: this.world });

        const renderer = new ShapeRenderer({
            renderStage: this.renderStage,
            zIndex,
            shapeType: ShapeType.Circle,
            radius,
            width: w,
            height: h,
            style: { fillColor, strokeColor, strokeWidth },
        });
        entity.addComponent(renderer);

        const layout = new LayoutComponent({
            position: { x, y },
            width: w,
            height: h,
            zIndex,
        });
        entity.addComponent(layout);

        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: {
                offset: [0, 0],
                size: [w, h],
            },
            name: HitTestName.Renderer,
        });
        entity.addComponent(hitTest);

        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        this.world.addEntity(entity);
        this.triggerLayout(entity);

        return entity;
    }

    /** 创建文本（使用 rich-text 引擎） */
    createText(options: CreateTextOptions): Entity {
        const {
            x, y, text,
            fontSize = 16,
            color = 0x333333,
            fontFamily = 'Inter',
            zIndex = 0,
        } = options;

        const name = nextId('Text');
        const entity = new Entity({ name, world: this.world });

        // 将 0xRRGGBB 颜色转换为 rich-text 的 {r,g,b,a} 格式（0-1 范围）
        const r = ((color >> 16) & 0xFF) / 255;
        const g = ((color >> 8) & 0xFF) / 255;
        const b = (color & 0xFF) / 255;

        // 创建 rich-text Editor 实例（异步加载字体后回调重绘）
        const editor = createSimpleEditor(
            {
                text,
                fontSize,
                color: { r, g, b, a: 1 },
                fontFamily,
                textAutoResize: 'WIDTH_AND_HEIGHT',
            },
            // 字体加载完成后的回调：执行排版并更新尺寸
            (readyEditor) => {
                const richTextComp = entity.getComponent(RichTextComponent);
                const richTextRenderer = entity.getComponent(RichTextRenderer);
                const layoutComp = entity.getComponent(LayoutComponent);
                const hitTestComp = entity.getComponent(HitTestComponent);

                if (!richTextComp || !richTextRenderer || !layoutComp) return;

                // 排版已在 createSimpleEditor 的 onReady 中通过 apply() 完成
                const w = Math.max(readyEditor.width, 20);
                const h = Math.max(readyEditor.height, fontSize * 1.4);

                // 更新尺寸
                layoutComp.width = w;
                layoutComp.height = h;
                layoutComp.dirty = true;

                if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                    (hitTestComp.data.options as RectHitTestProps).size = [w, h];
                }

                // 重绘文字
                richTextComp.needsRender = true;
                richTextRenderer.drawText(readyEditor);
                richTextRenderer.dirty = true;

                // 触发布局更新
                this.triggerLayout(entity);
            },
        );

        // 添加 RichTextComponent
        const richTextComp = new RichTextComponent({ editor });
        entity.addComponent(richTextComp);

        // 添加 RichTextRenderer
        const renderer = new RichTextRenderer({
            renderStage: this.renderStage,
            zIndex,
        });
        entity.addComponent(renderer);

        // 文本尺寸用估算值（字体加载完成后会更新为精确值）
        const estimatedWidth = Math.max(text.length * fontSize * 0.6, 20);
        const estimatedHeight = fontSize * 1.4;
        const layoutComp = new LayoutComponent({
            position: { x, y },
            width: estimatedWidth,
            height: estimatedHeight,
            zIndex,
        });
        entity.addComponent(layoutComp);

        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: {
                offset: [0, 0],
                size: [estimatedWidth, estimatedHeight],
            },
            name: HitTestName.Renderer,
        });
        entity.addComponent(hitTest);

        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        this.world.addEntity(entity);
        this.triggerLayout(entity);

        return entity;
    }

    /** 创建图片（使用 ShapeRenderer 纹理填充，复用矩形的完整交互流程） */
    createImage(options: CreateImageOptions): Entity {
        const {
            x, y,
            width,
            height,
            src,
            zIndex = 0,
        } = options;

        const name = nextId('Image');
        const entity = new Entity({ name, world: this.world });

        // 调用方应通过 loadImageSize 预获取尺寸并传入 width/height
        // 如果未传入，使用 200x200 作为 fallback
        const initW = width ?? 200;
        const initH = height ?? 200;

        // 使用 ShapeRenderer + 纹理填充代替 SpriteRenderer
        const renderer = new ShapeRenderer({
            renderStage: this.renderStage,
            zIndex,
            shapeType: ShapeType.Rectangle,
            width: initW,
            height: initH,
            style: {
                fillColor: 0xeeeeee, // 纹理加载前的占位色
                fillAlpha: 1,
                strokeColor: undefined,
                strokeWidth: 0,
            },
            textureFillSource: src,
        });
        entity.addComponent(renderer);

        const layout = new LayoutComponent({
            position: { x, y },
            width: initW,
            height: initH,
            zIndex,
        });
        entity.addComponent(layout);

        const hitTest = new HitTestComponent({
            type: HitTestType.Rect,
            options: {
                offset: [0, 0],
                size: [initW, initH],
            },
            name: HitTestName.Renderer,
        });
        entity.addComponent(hitTest);

        entity.addComponent(new SelectComponent({ selectable: true }));
        entity.addComponent(new DragComponent({ draggable: true }));

        this.world.addEntity(entity);
        this.triggerLayout(entity);

        return entity;
    }

    /** 删除实体 */
    deleteEntities(entities: Entity[]): void {
        entities.forEach(entity => {
            entity.destory();
        });
    }

    /**
     * 克隆实体（深拷贝所有组件，偏移位置）
     * 支持 Rect、Circle、Text、Image 类型
     * @param entity 源实体
     * @param offsetX 位置偏移 X
     * @param offsetY 位置偏移 Y
     * @returns 克隆后的新实体，如果不支持克隆则返回 undefined
     */
    cloneEntity(entity: Entity, offsetX: number = 20, offsetY: number = 20): Entity | undefined {
        const layoutComp = entity.getComponent(LayoutComponent);
        if (!layoutComp) return undefined;

        const shapeRenderer = entity.getComponent(ShapeRenderer);
        const textRenderer = entity.getComponent(TextRenderer);

        const x = layoutComp.x + offsetX;
        const y = layoutComp.y + offsetY;

        // 根据渲染器类型决定克隆方式
        if (shapeRenderer) {
            // 图片元素（带纹理填充的 ShapeRenderer）
            if (shapeRenderer.fillTextureSource) {
                return this.createImage({
                    x, y,
                    width: layoutComp.width,
                    height: layoutComp.height,
                    src: shapeRenderer.fillTextureSource,
                    zIndex: layoutComp.zIndex,
                });
            }

            const style = { ...shapeRenderer.style };
            if (shapeRenderer.shapeType === ShapeType.Circle) {
                return this.createCircle({
                    x, y,
                    radius: shapeRenderer.radius,
                    fillColor: style.fillColor,
                    strokeColor: style.strokeColor,
                    strokeWidth: style.strokeWidth,
                    zIndex: layoutComp.zIndex,
                });
            } else {
                return this.createRect({
                    x, y,
                    width: layoutComp.width,
                    height: layoutComp.height,
                    fillColor: style.fillColor,
                    strokeColor: style.strokeColor,
                    strokeWidth: style.strokeWidth,
                    cornerRadius: shapeRenderer.shapeType === ShapeType.RoundedRectangle ? shapeRenderer.cornerRadius : undefined,
                    zIndex: layoutComp.zIndex,
                });
            }
        } else if (textRenderer) {
            const pixiText = textRenderer.renderObject;
            const textStyle = pixiText.style;
            return this.createText({
                x, y,
                text: pixiText.text,
                fontSize: typeof textStyle.fontSize === 'number' ? textStyle.fontSize : parseInt(String(textStyle.fontSize)),
                color: typeof textStyle.fill === 'number' ? textStyle.fill : 0x333333,
                fontFamily: String(textStyle.fontFamily || 'Inter'),
                zIndex: layoutComp.zIndex,
            });
        }

        // RichTextComponent 实体
        const richTextComp = entity.getComponent(RichTextComponent);
        if (richTextComp) {
            const editor = richTextComp.editor;
            const textContent = editor.getText();
            const style = editor.style;
            const fillPaint = style.fillPaints?.[0];
            let color = 0x333333;
            if (fillPaint?.color) {
                const ri = Math.round(fillPaint.color.r * 255);
                const gi = Math.round(fillPaint.color.g * 255);
                const bi = Math.round(fillPaint.color.b * 255);
                color = (ri << 16) | (gi << 8) | bi;
            }
            return this.createText({
                x, y,
                text: textContent,
                fontSize: style.fontSize,
                color,
                fontFamily: style.fontName.family,
                zIndex: layoutComp.zIndex,
            });
        }

        return undefined;
    }

    /** 触发首次布局：直接同步渲染组件位置 + 发送事件 */
    private triggerLayout(entity: Entity): void {
        // 1. 直接同步渲染组件位置（确保即使 LayoutEvent 被 EventSystem.clearEvent 清掉也有正确位置）
        //    这解决了从 React 回调（帧之间）创建实体时，LayoutEvent 被下一帧清掉导致渲染位置为 0,0 的问题
        const layoutComp = entity.getComponent(LayoutComponent);
        if (layoutComp) {
            const renderers = getRenderComponents(entity);
            renderers.forEach((renderer) => {
                renderer.dirty = true;
                renderer.updateProps.x = layoutComp.x;
                renderer.updateProps.y = layoutComp.y;
                renderer.updateProps.rotation = layoutComp.rotation;
                renderer.updateProps.scaleX = layoutComp.scaleX;
                renderer.updateProps.scaleY = layoutComp.scaleY;
            });
        }
        // 2. 仍然发送事件（用于后续帧内的正常更新流程）
        const eventManager = this.world.findComponent(EventManager);
        if (eventManager) {
            const layoutEvent = new LayoutEvent({
                data: { entities: [entity] },
            });
            eventManager.sendEvent(layoutEvent);
        }
    }

    /** 获取 RenderConfig（用于获取 renderStage） */
    static getRenderStageFromWorld(world: Stage): Application | undefined {
        const renderConfig = world.findComponent(RenderConfig);
        return renderConfig?.renderStage;
    }
}
