import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { instanceViewportEntity } from './instanceViewportEntity';
import { ViewportComponent } from './ViewportComponent';

export interface ViewportSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class ViewportSystem extends System {
    eventManager?: EventManager;
    viewportComponent: ViewportComponent;

    constructor(props: ViewportSystemProps) {
        super(props);
        const { canvas } = props;
        const viewportEntity = instanceViewportEntity({
            world: this.world,
            size: [canvas.width, canvas.height],
            position: {
                x: - canvas.width / 2,
                y: - canvas.height / 2
            },
        });
        const viewportComponent = viewportEntity.getComponent(ViewportComponent)!;
        this.viewportComponent = viewportComponent;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {

    }
}
