import { DefaultEntityName } from '../../interface/Entity';
import { System, SystemProps } from '../../System';
import { LayoutComponent } from '../layout/LayoutComponent';
import { instancePointerEntity } from './instancePointerEntity';
import { PointerButtons } from './Pointer';
import { PointerComponent } from './PointerComponent';
import { ViewportComponent } from '../viewport/ViewportComponent';

export interface PointerSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

export const POINTER_MOVE_DISTANCE = 4;

enum PointerEventNames {
    PointerDown = 'pointerdown',
    PointerUp = 'pointerup',
    PointerMove = 'pointermove',
    MouseLeave = 'mouseleave',
    PointerLeave = 'pointerleave',
}

export class PointerSystem extends System {
    pointerComp?: PointerComponent;
    layoutComp?: LayoutComponent;
    viewportComp?: ViewportComponent;
    eventMap = new Map<PointerEventNames, PointerEvent[]>();

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
        mask.addEventListener(PointerEventNames.PointerDown, this.handlePointerDownEvent);
        mask.addEventListener(PointerEventNames.PointerUp, this.handlePointerUpEvent);
        mask.addEventListener(PointerEventNames.PointerMove, this.handlePointerMoveEvent);
        mask.addEventListener(PointerEventNames.PointerLeave, this.handlePointerLeaveEvent);
    }

    start(): void {
        const pointerEntity = this.world.findEntityByName(DefaultEntityName.Pointer);
        if (!pointerEntity) {
            return;
        }
        this.pointerComp = pointerEntity.getComponent(PointerComponent);
        this.layoutComp = pointerEntity.getComponent(LayoutComponent);
        this.viewportComp = this.world.findEntityByName(DefaultEntityName.Viewport)?.getComponent(ViewportComponent);
    }

    end(): void {
        this.resetPointerStatus();
    }

    update(): void {
        const pointerDownEvent = this.eventMap.get(PointerEventNames.PointerDown)?.[0];
        const pointerUpEvent = this.eventMap.get(PointerEventNames.PointerUp)?.[0];
        const pointerMoveEvent = this.eventMap.get(PointerEventNames.PointerMove)?.[0];
        const pointerLeaveEvent = this.eventMap.get(PointerEventNames.PointerLeave)?.[0];
        if (pointerDownEvent) {
            this.handlePointerDown(pointerDownEvent);
        }
        if (pointerUpEvent) {
            this.handlePointerUp(pointerUpEvent);
        }
        if (pointerMoveEvent) {
            this.handlePointerMove(pointerMoveEvent);
        }
        if (pointerLeaveEvent) {
            this.handlePointerLeave();
        }
    }

    handlePointerDownEvent = (event: PointerEvent) => {
        const currentEvents = this.eventMap.get(PointerEventNames.PointerDown);
        const newEvents = (currentEvents ?? []);
        newEvents.push(event);
        if (!currentEvents) {
            this.eventMap.set(PointerEventNames.PointerDown, newEvents);
        }
    };

    handlePointerUpEvent = (event: PointerEvent) => {
        const currentEvents = this.eventMap.get(PointerEventNames.PointerUp);
        const newEvents = (currentEvents ?? []);
        newEvents.push(event);
        if (!currentEvents) {
            this.eventMap.set(PointerEventNames.PointerUp, newEvents);
        }
    };

    handlePointerMoveEvent = (event: PointerEvent) => {
        const currentEvents = this.eventMap.get(PointerEventNames.PointerMove);
        const newEvents = (currentEvents ?? []);
        newEvents.push(event);
        if (!currentEvents) {
            this.eventMap.set(PointerEventNames.PointerMove, newEvents);
        }
    };

    handlePointerLeaveEvent = (event: PointerEvent) => {
        const currentEvents = this.eventMap.get(PointerEventNames.MouseLeave);
        const newEvents = (currentEvents ?? []);
        newEvents.push(event);
        if (!currentEvents) {
            this.eventMap.set(PointerEventNames.MouseLeave, newEvents);
        }
    };

    handlePointerDown = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.hasPointerDown = event.buttons;
        this.pointerComp.isPointerDown = event.buttons;

        // 同步指针位置，确保 HitTestSystem 使用正确的坐标
        this.pointerComp.screenX = event.offsetX;
        this.pointerComp.screenY = event.offsetY;
        if (this.viewportComp && this.layoutComp) {
            const worldPos = this.viewportComp.screenToWorld(event.offsetX, event.offsetY);
            this.pointerComp.x = worldPos.x;
            this.pointerComp.y = worldPos.y;
            this.layoutComp.x = worldPos.x;
            this.layoutComp.y = worldPos.y;
        }
    };

    handlePointerUp = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.isPointerDown = event.buttons & event.buttons;
        this.pointerComp.hasPointerUp = true;
    };

    handlePointerMove = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.pointerComp || !this.layoutComp) {
            return;
        }
        this.pointerComp.isPointerDown = event.buttons;
        this.pointerComp.screenX = event.offsetX;
        this.pointerComp.screenY = event.offsetY;
        if (!this.viewportComp) {
            return;
        }
        // 使用视口组件的坐标变换方法将屏幕坐标转换为世界坐标
        const worldPos = this.viewportComp.screenToWorld(event.offsetX, event.offsetY);
        const pointerX = worldPos.x;
        const pointerY = worldPos.y;
        const distance = Math.sqrt((pointerX - this.pointerComp.x) ** 2 + (pointerY - this.pointerComp.y) ** 2);
        if (distance > POINTER_MOVE_DISTANCE / this.viewportComp.scale) {
            this.pointerComp.isMoving = true;
        } else {
            this.pointerComp.isMoving = false;
        }
        this.pointerComp.deltaX = pointerX - this.pointerComp.x;
        this.pointerComp.deltaY = pointerY - this.pointerComp.y;
        this.pointerComp.isMoving = true;
        this.pointerComp.x = pointerX;
        this.pointerComp.y = pointerY;
        this.layoutComp.x = pointerX;
        this.layoutComp.y = pointerY;
    };

    resetPointerStatus() {
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.hasPointerDown = PointerButtons.NONE;
        this.pointerComp.hasPointerUp = false;
        this.pointerComp.deltaX = 0;
        this.pointerComp.deltaY = 0;
        this.pointerComp.isMoving = false;
        [
            PointerEventNames.PointerDown,
            PointerEventNames.PointerUp,
            PointerEventNames.PointerMove,
            PointerEventNames.MouseLeave,
        ].forEach((eventName) => {
            this.eventMap.set(eventName, []); 
        });
    }

    handlePointerLeave = () => {
        if (!this.pointerComp) {
            return;
        }
        this.pointerComp.isMoving = false;
        this.pointerComp.deltaX = 0;
        this.pointerComp.deltaY = 0;
    };
}
