import { BaseComponent, BaseComponentProps } from '../../Component';

export interface ViewportComponentProps extends BaseComponentProps {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    minScale?: number;
    maxScale?: number;
}

export class ViewportComponent extends BaseComponent {
    /** 当前缩放比例 */
    scale: number = 1;
    /** 视口在世界坐标中的偏移量 X */
    offsetX: number = 0;
    /** 视口在世界坐标中的偏移量 Y */
    offsetY: number = 0;
    /** 最小缩放比例 */
    minScale: number = 0.1;
    /** 最大缩放比例 */
    maxScale: number = 10;
    /** 视口宽度（屏幕像素） */
    screenWidth: number = 0;
    /** 视口高度（屏幕像素） */
    screenHeight: number = 0;
    /** 标记视口是否有变化 */
    dirty: boolean = false;

    constructor(props: ViewportComponentProps) {
        super(props);
        const {
            scale = 1,
            offsetX = 0,
            offsetY = 0,
            minScale = 0.1,
            maxScale = 10,
        } = props;
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.minScale = minScale;
        this.maxScale = maxScale;
    }

    /**
     * 将屏幕坐标转换为世界坐标
     */
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: this.offsetX + screenX / this.scale,
            y: this.offsetY + screenY / this.scale,
        };
    }

    /**
     * 将世界坐标转换为屏幕坐标
     */
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: (worldX - this.offsetX) * this.scale,
            y: (worldY - this.offsetY) * this.scale,
        };
    }

    /**
     * 以指定屏幕坐标为中心进行缩放
     */
    zoomAt(screenX: number, screenY: number, newScale: number): void {
        const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        // 缩放前的世界坐标
        const worldBefore = this.screenToWorld(screenX, screenY);
        this.scale = clampedScale;
        // 缩放后的世界坐标
        const worldAfter = this.screenToWorld(screenX, screenY);
        // 调整偏移使缩放中心点保持不变
        this.offsetX += worldBefore.x - worldAfter.x;
        this.offsetY += worldBefore.y - worldAfter.y;
        this.dirty = true;
    }

    /**
     * 平移视口（屏幕像素单位）
     */
    pan(deltaScreenX: number, deltaScreenY: number): void {
        this.offsetX -= deltaScreenX / this.scale;
        this.offsetY -= deltaScreenY / this.scale;
        this.dirty = true;
    }

    /**
     * 获取当前视口在世界坐标中的可见区域
     */
    getWorldBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.offsetX,
            y: this.offsetY,
            width: this.screenWidth / this.scale,
            height: this.screenHeight / this.scale,
        };
    }
}
