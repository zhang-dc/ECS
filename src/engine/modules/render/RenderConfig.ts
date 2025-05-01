import { Application, Container } from 'pixi.js';
import { BaseComponent, BaseComponentProps } from '../../Component';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderConfigProps extends BaseComponentProps {
    renderStage: Application;
    container: Container;
    canvas: HTMLCanvasElement;
}

export class RenderConfig extends BaseComponent {
    renderStage: Application;
    container: Container;
    canvas: HTMLCanvasElement;

    constructor(props: RenderConfigProps) {
        super(props);
        const {
            name = DefaultEntityName.RenderConfig,
            renderStage,
            container,
            canvas,
        } = props;
        this.name = name;
        this.renderStage = renderStage;
        this.container = container;
        this.canvas = canvas;
    }
}
