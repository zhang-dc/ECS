import { IBaseTextureOptions, Sprite, SpriteSource } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';

export interface SpriteRendererProps extends RenderComponentProps {
    source: SpriteSource;
    options?: IBaseTextureOptions;
}

export class SpriteRenderer extends RenderComponent {
    renderObject: Sprite;
    updateProps: Partial<Sprite> = {};
    constructor(props: SpriteRendererProps) {
        super(props);
        const { source, options } = props;
        this.renderObject = Sprite.from(source, options);
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }
        Object.keys(this.updateProps).forEach((key) => {
            const value = this.updateProps[key as keyof Sprite];
            if (value!== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this.renderObject as any)[key] = value;
            }
        });
        this.dirty = false;
    }
}