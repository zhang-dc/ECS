import { Application, Container, DisplayObject, Renderer } from 'pixi.js';
import { System, SystemProps } from '../../System';
import { instanceRenderConfigEntity } from './RenderEntity';
import { Entity } from '../../Entity';
import { RenderComponent } from './RenderComponent';
import { RenderConfig } from './RenderConfig';

export interface RenderSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class RenderSystem extends System {
    canvas: HTMLCanvasElement;
    renderConfig: RenderConfig;

    constructor(props: RenderSystemProps) {
        super(props);
        const { canvas } = props;
        this.canvas = canvas;
        const container = new Container();
        const renderStage = new Application({
            view: canvas,
            width: canvas.width,
            height: canvas.height,
            resolution: devicePixelRatio,
            autoStart: false,
        });
        renderStage.stage.addChild(container);
        const renderConfigEntity = instanceRenderConfigEntity({
            world: this.world,
            container,
            renderStage,
        });
        this.renderConfig = renderConfigEntity.getComponent(RenderConfig)!;
    }

    start() {

    }

    update() {

    }
}
