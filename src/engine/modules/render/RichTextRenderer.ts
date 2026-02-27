import { Graphics } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';
import { Editor } from '../../rich-text/interfaces/editor';
import { FillPaintType } from '../../rich-text/interfaces/style';
import { drawGlyphPath } from './svg-path-parser';

export interface RichTextRendererProps extends RenderComponentProps {
    /** 初始宽度 */
    width?: number;
    /** 初始高度 */
    height?: number;
}

/**
 * 富文本渲染器
 * 使用 Pixi.js Graphics 绘制 rich-text 引擎输出的 glyphs、选区和光标。
 * 替代原有的 TextRenderer（基于 Pixi.Text）。
 */
export class RichTextRenderer extends RenderComponent {
    renderObject: Graphics;

    /** 相对于 LayoutSystem 设置的世界坐标的额外偏移（用于脑图节点 padding 等场景） */
    offsetX: number = 0;
    offsetY: number = 0;

    /** 光标闪烁计时器 */
    private cursorBlinkTimer: number = 0;
    private cursorVisible: boolean = true;
    /** 光标闪烁间隔（毫秒） */
    private readonly CURSOR_BLINK_INTERVAL = 530;

    constructor(props: RichTextRendererProps) {
        super(props);
        this.renderObject = new Graphics();
        this.dirty = true;
    }

    /**
     * 根据 Editor 实例的排版结果重绘所有文字内容
     */
    drawText(editor: Editor): void {
        const g = this.renderObject;
        g.clear();

        // 1. 绘制选区高亮（在文字下方）
        if (editor.isEditor && editor.hasSelection() && !editor.isCollapse()) {
            const rects = editor.getSelectionRects();
            rects.forEach(([x, y, w, h]) => {
                g.beginFill(0x4285F4, 0.3);
                g.drawRect(x, y, w, h);
                g.endFill();
            });
        }

        // 2. 绘制文字 glyphs
        const glyphs = editor.getGlyphs() ?? [];
        const fillPaints = editor.getFillPaintsForGlyphs();

        for (let i = 0; i < glyphs.length; i++) {
            const glyph = glyphs[i];
            const { commandsBlob, position } = glyph;

            if (!commandsBlob) continue;

            // emoji 跳过（暂不支持 emoji 渲染，后续可用 Sprite 实现）
            if (glyph.emojiCodePoints && glyph.emojiCodePoints.length > 0) {
                continue;
            }

            // 获取填充颜色
            const paints = fillPaints[i];
            const color = this.getFillColor(paints);

            drawGlyphPath(g, commandsBlob, position.x, position.y, color.hex, color.alpha);
        }

        // 3. 绘制文本装饰（下划线、删除线）
        const decoRects = editor.getTextDecorationRects();
        if (decoRects.length > 0) {
            for (const [x, y, w, h] of decoRects) {
                // 装饰线使用默认文字颜色
                const defaultColor = this.getDefaultTextColor(editor);
                g.beginFill(defaultColor.hex, defaultColor.alpha);
                g.drawRect(x, y, w, h);
                g.endFill();
            }
        }

        // 4. 绘制光标（编辑态，闪烁）
        if (editor.isEditor && editor.isCollapse()) {
            // 更新闪烁状态
            this.cursorBlinkTimer += 16; // 约 60fps
            if (this.cursorBlinkTimer >= this.CURSOR_BLINK_INTERVAL) {
                this.cursorBlinkTimer = 0;
                this.cursorVisible = !this.cursorVisible;
            }

            if (this.cursorVisible) {
                const cursorRects = editor.getSelectionRects();
                if (cursorRects.length > 0) {
                    const [cx, cy, , ch] = cursorRects[0];
                    g.lineStyle(1.5, 0x333333, 1);
                    g.moveTo(cx, cy);
                    g.lineTo(cx, cy + ch);
                    g.lineStyle(0);
                }
            }
        }
    }

    /**
     * 重置光标闪烁（输入时应调用，让光标保持可见）
     */
    resetCursorBlink(): void {
        this.cursorBlinkTimer = 0;
        this.cursorVisible = true;
    }

    /**
     * 从 FillPaintType 数组中提取颜色
     */
    private getFillColor(paints: FillPaintType[] | undefined): { hex: number; alpha: number } {
        if (!paints || paints.length === 0) {
            return { hex: 0x333333, alpha: 1 };
        }

        const paint = paints[0];
        if (!paint.visible) {
            return { hex: 0x333333, alpha: 1 };
        }

        const { r, g, b, a } = paint.color;
        // rich-text 的颜色值是 0-1 范围
        const ri = Math.round(r * 255);
        const gi = Math.round(g * 255);
        const bi = Math.round(b * 255);
        const hex = (ri << 16) | (gi << 8) | bi;
        const alpha = paint.opacity * a;

        return { hex, alpha };
    }

    /**
     * 获取默认文字颜色（用于装饰线等）
     */
    private getDefaultTextColor(editor: Editor): { hex: number; alpha: number } {
        const paints = editor.style.fillPaints;
        return this.getFillColor(paints);
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }

        // 应用位置和变换（加上 offset 偏移，用于脑图节点文字 padding）
        const props = this.updateProps;
        if (props.x !== undefined) {
            this.renderObject.x = (props.x as number) + this.offsetX;
        }
        if (props.y !== undefined) {
            this.renderObject.y = (props.y as number) + this.offsetY;
        }
        if (props.rotation !== undefined) {
            this.renderObject.rotation = props.rotation as number;
        }
        if (props.scaleX !== undefined) {
            this.renderObject.scale.x = props.scaleX as number;
        }
        if (props.scaleY !== undefined) {
            this.renderObject.scale.y = props.scaleY as number;
        }

        super.updateRenderObject();
    }
}
