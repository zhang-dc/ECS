import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestComponentProps, HitTestType } from '../hitTest/HitTestComponent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { RenderConfig } from '../render/RenderConfig';
import { instanceViewportEntity } from './instanceViewportEntity';
import { ViewportComponent } from './ViewportComponent';
import { ViewportEvent, ViewportOperation } from './ViewportEvent';

export interface ViewportSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
    mask: HTMLDivElement;
}

const ZOOM_SPEED = 0.001;

export class ViewportSystem extends System {
    eventManager?: EventManager;
    viewportComponent: ViewportComponent;
    layoutComponent: LayoutComponent;
    renderConfig!: RenderConfig;
    hitTestComp: HitTestComponent;
    mask: HTMLDivElement;
    /** 缓存的滚轮事件，在 update 中处理 */
    pendingWheelEvents: WheelEvent[] = [];

    constructor(props: ViewportSystemProps) {
        super(props);
        const { canvas, mask } = props;
        this.mask = mask;
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
        this.viewportComponent.screenWidth = canvas.width;
        this.viewportComponent.screenHeight = canvas.height;
        this.layoutComponent = viewportEntity.getComponent(LayoutComponent)!;
        this.hitTestComp = viewportEntity.getComponent(HitTestComponent)!;

        // 监听滚轮事件用于平移和缩放
        mask.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.renderConfig = this.world.findComponent(RenderConfig)!;
    }

    handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        this.pendingWheelEvents.push(event);
    };

    update(): void {
        // 处理滚轮事件
        this.processWheelEvents();

        // 处理来自事件系统的视口事件
        const viewportEvents = this.eventManager?.getEvents(ViewportEvent);
        viewportEvents?.forEach((event) => {
            this.processViewportEvent(event);
        });

        // 如果视口有变化，同步到渲染容器和碰撞检测
        if (this.viewportComponent.dirty) {
            this.syncViewportToRender();
            this.syncViewportToHitTest();
            this.viewportComponent.dirty = false;
            // 通知外部视口变化
            this.world.emit(StageEvents.VIEWPORT_CHANGE, {
                scale: this.viewportComponent.scale,
                offsetX: this.viewportComponent.offsetX,
                offsetY: this.viewportComponent.offsetY,
            });
        }
    }

    processWheelEvents() {
        if (!this.pendingWheelEvents.length) {
            return;
        }
        this.pendingWheelEvents.forEach((event) => {
            if (event.ctrlKey || event.metaKey) {
                // Ctrl/Cmd + 滚轮 = 缩放
                const delta = -event.deltaY * ZOOM_SPEED;
                const newScale = this.viewportComponent.scale * (1 + delta);
                this.viewportComponent.zoomAt(event.offsetX, event.offsetY, newScale);
            } else {
                // 普通滚轮 = 平移
                this.viewportComponent.pan(-event.deltaX, -event.deltaY);
            }
        });
        this.pendingWheelEvents = [];
    }

    processViewportEvent(event: ViewportEvent) {
        const { data } = event;
        switch (data.operation) {
            case ViewportOperation.Pan:
                if (data.deltaScreenX !== undefined && data.deltaScreenY !== undefined) {
                    this.viewportComponent.pan(data.deltaScreenX, data.deltaScreenY);
                }
                break;
            case ViewportOperation.Zoom:
                if (data.newScale !== undefined) {
                    const centerX = this.viewportComponent.screenWidth / 2;
                    const centerY = this.viewportComponent.screenHeight / 2;
                    this.viewportComponent.zoomAt(centerX, centerY, data.newScale);
                }
                break;
            case ViewportOperation.ZoomAt:
                if (data.newScale !== undefined && data.screenX !== undefined && data.screenY !== undefined) {
                    this.viewportComponent.zoomAt(data.screenX, data.screenY, data.newScale);
                }
                break;
            case ViewportOperation.Resize:
                if (this.renderConfig?.canvas) {
                    this.viewportComponent.screenWidth = this.renderConfig.canvas.width;
                    this.viewportComponent.screenHeight = this.renderConfig.canvas.height;
                    this.viewportComponent.dirty = true;
                }
                break;
        }
    }

    /**
     * 将视口变换同步到 Pixi 渲染容器
     */
    syncViewportToRender() {
        if (!this.renderConfig) {
            return;
        }
        const { scale, offsetX, offsetY } = this.viewportComponent;
        // 实体容器
        const container = this.renderConfig.container;
        container.scale.set(scale, scale);
        container.position.set(-offsetX * scale, -offsetY * scale);
        // 覆盖层容器（选择框、手柄、网格线等）需要同步视口变换
        const overlayContainer = this.renderConfig.overlayContainer;
        overlayContainer.scale.set(scale, scale);
        overlayContainer.position.set(-offsetX * scale, -offsetY * scale);
    }

    /**
     * 将视口变换同步到碰撞检测组件
     */
    syncViewportToHitTest() {
        const { screenWidth, screenHeight, scale, offsetX, offsetY } = this.viewportComponent;
        const hitData = this.hitTestComp.data as HitTestComponentProps<HitTestType.Rect>;
        hitData.options.size = [screenWidth / scale, screenHeight / scale];
        // 更新视口实体的布局位置为世界坐标偏移
        this.layoutComponent.x = Math.round(offsetX);
        this.layoutComponent.y = Math.round(offsetY);
        this.layoutComponent.dirty = true;
    }
}
