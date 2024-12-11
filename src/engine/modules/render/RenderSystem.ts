import { Application, Container, DisplayObject } from 'pixi.js';
import { System, SystemProps } from '../../System';
import { instanceRenderConfigEntity } from './RenderEntity';
import { RenderConfig } from './RenderConfig';
import { getAllRendersInEntity, RenderComType } from './Renderer';
import { EventManager } from '../event/Event';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class RenderSystem extends System {
    canvas: HTMLCanvasElement;
    renderConfig: RenderConfig;
    eventManager?: EventManager;

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
        this.eventManager = this.world.findComponent(EventManager);
    }

    update() {
        const renders = this.world.findComponents(RenderComType);
        renders.forEach((render) => {
            render.updateRenderObject();
        });
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        this.renderConfig.container.removeChildren();
        const renderers: DisplayObject[] = [];
        console.log('hitTestEvents', hitTestEvents);
        hitTestEvents?.forEach((event) => {
            if (event.entityA.name !== DefaultEntityName.Viewport) {
                return;
            }
            const renders = getAllRendersInEntity(event.entityB).reduce((acc: DisplayObject[], render) => {
                if (render.renderObject) {
                    acc.push(render.renderObject);
                }
                return acc;
            }, []);
            renderers.push(...renders);
        });
        renderers.forEach(render => this.renderConfig.container.addChild(render));
    }
}
