import { Application, Container, DisplayObject } from 'pixi.js';
import { System, SystemProps } from '../../System';
import { instanceRenderConfigEntity } from './RenderEntity';
import { RenderConfig } from './RenderConfig';
import { RenderComType } from './Renderer';

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
            resolution: devicePixelRatio,
            autoStart: false,
            width: Math.floor(canvas.width / devicePixelRatio),
            height: Math.floor(canvas.height / devicePixelRatio),
        });
        renderStage.stage.addChild(container as DisplayObject);
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
        console.log('render');
        const renders = this.world.findComponents(RenderComType);
        renders.forEach((render) => {
            render.updateRenderObject();
        });
    }
}
