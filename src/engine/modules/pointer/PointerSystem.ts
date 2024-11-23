import { System, SystemProps } from '../../System';
import { instancePointerEntity } from './instancePointerEntity';
import { PointerComponent } from './PointerComponent';

export interface PointerSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

export class PointerSystem extends System {
    pointerComp?: PointerComponent;

    constructor(props: PointerSystemProps) {
        super(props);
        instancePointerEntity({
            world: this.world,
        });
        const { mask } = props;
        mask.oncontextmenu = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        mask.addEventListener('pointerdown', this.handlePointerDown);
        mask.addEventListener('pointerup', this.handlePointerUp);
        mask.addEventListener('pointermove', this.handlePointerMove);
    }

    start(): void {
        this.pointerComp = this.world.findComponent(PointerComponent);
    }

    update(): void {
        
    }

    handlePointerDown(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.hasPointerDown = event.buttons;
        this.pointerComp.isPointerDown = event.buttons;
    }

    handlePointerUp(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.isPointerDown = event.buttons;
    }

    handlePointerMove(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.isPointerDown = event.buttons;
        this.pointerComp.isMoving = true;
        this.pointerComp.x = event.offsetX;
        this.pointerComp.y = event.offsetY;
    }
}