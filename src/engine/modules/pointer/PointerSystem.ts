import { System, SystemProps } from '../../System';
import { instancePointerEntity } from './instancePointerEntity';
import { PointerButtons } from './Pointer';
import { PointerComponent } from './PointerComponent';

export interface PointerSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

export const POINTER_MOVE_DISTANCE = 4;

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

    end(): void {
        this.updatePointerStatus();
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
        this.pointerComp.isPointerDown = event.buttons & event.buttons;
        this.pointerComp.hasPointerUp = event.buttons;
    }

    handlePointerMove(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.isPointerDown = event.buttons;
        const curX = event.offsetX;
        const curY = event.offsetY;
        const distance = Math.sqrt((curX - this.pointerComp.x) ** 2 + (curY - this.pointerComp.y) ** 2);
        if (distance > POINTER_MOVE_DISTANCE) {
            this.pointerComp.isMoving = true;
        } else {
            this.pointerComp.isMoving = false;
        }
        this.pointerComp.x = event.offsetX;
        this.pointerComp.y = event.offsetY;
    }

    updatePointerStatus() {
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.hasPointerDown = PointerButtons.NONE;
        this.pointerComp.hasPointerUp = PointerButtons.NONE;
    }
}
