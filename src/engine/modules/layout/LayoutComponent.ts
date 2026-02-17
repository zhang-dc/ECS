import { BaseComponent, BaseComponentProps } from '../../Component';
import { Entity } from '../../Entity';
import { Position } from '../hitTest/HitTest';

export interface LayoutComponentProps extends BaseComponentProps {
    position?: Position;
    width?: number;
    height?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    anchorX?: number;
    anchorY?: number;
    zIndex?: number;
}

export class LayoutComponent extends BaseComponent {
    /** 世界坐标 X */
    x: number = 0;
    /** 世界坐标 Y */
    y: number = 0;
    /** 宽度 */
    width: number = 0;
    /** 高度 */
    height: number = 0;
    /** 旋转角度（弧度） */
    rotation: number = 0;
    /** X 轴缩放 */
    scaleX: number = 1;
    /** Y 轴缩放 */
    scaleY: number = 1;
    /** 锚点 X（0-1） */
    anchorX: number = 0;
    /** 锚点 Y（0-1） */
    anchorY: number = 0;
    /** 层级 Z-Index */
    zIndex: number = 0;
    /** 标记是否有更新 */
    dirty = false;

    constructor(props: LayoutComponentProps) {
        super(props);
        const {
            position,
            width = 0,
            height = 0,
            rotation = 0,
            scaleX = 1,
            scaleY = 1,
            anchorX = 0,
            anchorY = 0,
            zIndex = 0,
        } = props;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.zIndex = zIndex;
        if (position) {
            this.updatePosition(position);
        }
    }

    updatePosition(position: Position) {
        this.x = Math.round(position.x);
        this.y = Math.round(position.y);
        this.dirty = true;
    }

    /**
     * 获取实体的轴对齐包围盒（AABB），用于视口裁剪和碰撞检测
     */
    getAABB(): { x: number; y: number; width: number; height: number } {
        const w = this.width * this.scaleX;
        const h = this.height * this.scaleY;

        if (this.rotation === 0) {
            return {
                x: this.x - w * this.anchorX,
                y: this.y - h * this.anchorY,
                width: w,
                height: h,
            };
        }

        // 有旋转时，计算旋转后的 AABB
        const cx = this.x;
        const cy = this.y;
        const ax = -w * this.anchorX;
        const ay = -h * this.anchorY;
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        // 四个角点
        const corners = [
            { x: ax, y: ay },
            { x: ax + w, y: ay },
            { x: ax + w, y: ay + h },
            { x: ax, y: ay + h },
        ];

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const corner of corners) {
            const rx = cx + corner.x * cos - corner.y * sin;
            const ry = cy + corner.x * sin + corner.y * cos;
            minX = Math.min(minX, rx);
            minY = Math.min(minY, ry);
            maxX = Math.max(maxX, rx);
            maxY = Math.max(maxY, ry);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
}

/**
 * 获取实体的世界坐标 AABB（遍历父级链累加局部坐标）
 * 用于选中框、框选、碰撞检测等需要世界坐标的场景
 */
export function getWorldAABB(entity: Entity): { x: number; y: number; width: number; height: number } {
    const layout = entity.getComponent(LayoutComponent);
    if (!layout) return { x: 0, y: 0, width: 0, height: 0 };

    // 累加父级链坐标得到世界坐标
    let wx = layout.x;
    let wy = layout.y;
    let parent = entity.parent;
    while (parent) {
        const pl = parent.getComponent(LayoutComponent);
        if (pl) {
            wx += pl.x;
            wy += pl.y;
        }
        parent = parent.parent;
    }

    const w = layout.width * layout.scaleX;
    const h = layout.height * layout.scaleY;

    if (layout.rotation === 0) {
        return {
            x: wx - w * layout.anchorX,
            y: wy - h * layout.anchorY,
            width: w,
            height: h,
        };
    }

    // 有旋转时，计算旋转后的 AABB
    const ax = -w * layout.anchorX;
    const ay = -h * layout.anchorY;
    const cos = Math.cos(layout.rotation);
    const sin = Math.sin(layout.rotation);

    const corners = [
        { x: ax, y: ay },
        { x: ax + w, y: ay },
        { x: ax + w, y: ay + h },
        { x: ax, y: ay + h },
    ];

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const corner of corners) {
        const rx = wx + corner.x * cos - corner.y * sin;
        const ry = wy + corner.x * sin + corner.y * cos;
        minX = Math.min(minX, rx);
        minY = Math.min(minY, ry);
        maxX = Math.max(maxX, rx);
        maxY = Math.max(maxY, ry);
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
