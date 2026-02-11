import { System, SystemClass, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestComponentProps, HitTestType } from '../hitTest/HitTestComponent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { RenderConfig } from '../render/RenderConfig';
import { RenderSystem } from '../render/RenderSystem';
import { instanceViewportEntity } from './instanceViewportEntity';
import { ViewportComponent } from './ViewportComponent';
import { ViewportEvent } from './ViewportEvent';

export interface ViewportSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class ViewportSystem extends System {
    static after: SystemClass[] = [RenderSystem];
    eventManager?: EventManager;
    viewportComponent: ViewportComponent;
    layoutComponent: LayoutComponent;
    renderConfig: RenderConfig;
    hitTestComp: HitTestComponent;

    constructor(props: ViewportSystemProps) {
        super(props);
        const { canvas } = props;
        const viewportEntity = instanceViewportEntity({
            world: this.world,
            size: [canvas.width, canvas.height],
            position: {
                x: 0,
                y: 0,
            },
            scale: 1,
        });
        this.viewportComponent = viewportEntity.getComponent(ViewportComponent)!;
        this.layoutComponent = viewportEntity.getComponent(LayoutComponent)!;
        this.renderConfig = viewportEntity.getComponent(RenderConfig)!;
        this.hitTestComp = viewportEntity.getComponent(HitTestComponent)!;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.renderConfig = this.world.findComponent(RenderConfig)!;
    }

    update(): void {
        const viewportEvents = this.eventManager?.getEvents(ViewportEvent);
        if (!viewportEvents) {
            return;
        }
        this.updateViewport();
    }

    updateViewport() {
        if (!this.viewportComponent || !this.layoutComponent || !this.renderConfig || !this.hitTestComp) {
            return;
        }
        const { canvas } = this.renderConfig;
        const { scale } = this.viewportComponent;
        const hitData = this.hitTestComp.data as HitTestComponentProps<HitTestType.Rect>;
        hitData.options.size = [canvas.width * scale, canvas.height * scale];
    }
}
