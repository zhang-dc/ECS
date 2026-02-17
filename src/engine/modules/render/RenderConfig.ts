import { Application, Container } from 'pixi.js';
import { BaseComponent, BaseComponentProps } from '../../Component';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderConfigProps extends BaseComponentProps {
    renderStage: Application;
    container: Container;
    overlayContainer: Container;
    canvas: HTMLCanvasElement;
}

export class RenderConfig extends BaseComponent {
    renderStage: Application;
    container: Container;
    /** 覆盖层容器（选择框、手柄、网格线等），不受 RenderSystem.removeChildren() 影响 */
    overlayContainer: Container;
    canvas: HTMLCanvasElement;

    constructor(props: RenderConfigProps) {
        super(props);
        const {
            name = DefaultEntityName.RenderConfig,
            renderStage,
            container,
            overlayContainer,
            canvas,
        } = props;
        this.name = name;
        this.renderStage = renderStage;
        this.container = container;
        this.overlayContainer = overlayContainer;
        this.canvas = canvas;
    }
}
