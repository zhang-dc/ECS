import { Text, TextStyle } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export interface TextRendererProps extends RenderComponentProps {
    text: string;
    style?: Partial<TextStyle>;
}

/**
 * 文本渲染器
 */
export class TextRenderer extends RenderComponent {
    renderObject: Text;
    updateProps: Record<string, unknown> = {};

    constructor(props: TextRendererProps) {
        super(props);
        const { text, style } = props;
        const textStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0x333333,
            wordWrap: true,
            wordWrapWidth: 200,
            ...style,
        });
        this.renderObject = new Text(text, textStyle);
        this.dirty = true;
    }

    /** 更新文本内容 */
    setText(text: string) {
        this.updateProps.text = text;
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
        super.updateRenderObject();
    }
}
