import { Application, Container, DisplayObject } from 'pixi.js';
import { System, SystemClass, SystemProps } from '../../System';
import { instanceRenderConfigEntity } from './RenderEntity';
import { RenderConfig } from './RenderConfig';
import { getAllRendersInEntity, RenderComType } from './Renderer';
import { EventManager } from '../event/Event';
import { LayoutSystem } from '../layout/LayoutSystem';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class RenderSystem extends System {
    static after: SystemClass[] = [LayoutSystem];
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
            autoStart: false,
            width: Math.floor(canvas.width),
            height: Math.floor(canvas.height),
        });
        renderStage.stage.addChild(container as DisplayObject);
        const renderConfigEntity = instanceRenderConfigEntity({
            world: this.world,
            container,
            renderStage,
            canvas,
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
