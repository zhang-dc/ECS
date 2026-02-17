import { Graphics } from 'pixi.js';
import { RenderComponent, RenderComponentProps } from './RenderComponent';
import { Entity } from '../../Entity';
import { LayoutComponent } from '../layout/LayoutComponent';

export enum ConnectionLineType {
    /** 直线 */
    Straight = 'Straight',
    /** 贝塞尔曲线 */
    Bezier = 'Bezier',
    /** 折线 */
    Orthogonal = 'Orthogonal',
}

export interface ConnectionStyle {
    color?: number;
    width?: number;
    alpha?: number;
    /** 是否显示箭头 */
    showArrow?: boolean;
    /** 箭头大小 */
    arrowSize?: number;
}

export interface ConnectionRendererProps extends RenderComponentProps {
    /** 起始实体 */
    sourceEntity?: Entity;
    /** 目标实体 */
    targetEntity?: Entity;
    /** 连线类型 */
    lineType?: ConnectionLineType;
    /** 连线样式 */
    style?: ConnectionStyle;
}

/**
 * 连线渲染器 — 在两个实体之间绘制连接线
 */
export class ConnectionRenderer extends RenderComponent {
    renderObject: Graphics;
    updateProps: Record<string, unknown> = {};
    sourceEntity?: Entity;
    targetEntity?: Entity;
    lineType: ConnectionLineType;
    connectionStyle: ConnectionStyle;

    constructor(props: ConnectionRendererProps) {
        super(props);
        const {
            sourceEntity,
            targetEntity,
            lineType = ConnectionLineType.Bezier,
            style = {},
        } = props;
        this.sourceEntity = sourceEntity;
        this.targetEntity = targetEntity;
        this.lineType = lineType;
        this.connectionStyle = {
            color: 0x666666,
            width: 2,
            alpha: 1,
            showArrow: true,
            arrowSize: 8,
            ...style,
        };
        this.renderObject = new Graphics();
        this.dirty = true;
    }

    /** 设置连接的源和目标实体 */
    setConnection(source: Entity, target: Entity) {
        this.sourceEntity = source;
        this.targetEntity = target;
        this.dirty = true;
    }

    updateRenderObject() {
        if (!this.dirty) {
            return;
        }
        this.drawConnection();

        // 连线使用世界坐标绘制，忽略 LayoutSystem 设置的 x/y 位置
        // 只保留 zIndex 等非位置属性
        delete this.updateProps.x;
        delete this.updateProps.y;

        Object.keys(this.updateProps).forEach((key) => {
            const value = this.updateProps[key];
            if (value !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this.renderObject as any)[key] = value;
            }
        });
        super.updateRenderObject();
    }

    /** 获取实体的世界坐标（遍历父级链累加局部坐标） */
    private getWorldPosition(entity: Entity): { x: number; y: number; w: number; h: number } {
        const layout = entity.getComponent(LayoutComponent);
        if (!layout) return { x: 0, y: 0, w: 0, h: 0 };
        let wx = layout.x, wy = layout.y;
        let parent = entity.parent;
        while (parent) {
            const pl = parent.getComponent(LayoutComponent);
            if (pl) { wx += pl.x; wy += pl.y; }
            parent = parent.parent;
        }
        return { x: wx, y: wy, w: layout.width, h: layout.height };
    }

    /** 绘制连接线 */
    private drawConnection() {
        const g = this.renderObject;
        g.clear();

        if (!this.sourceEntity || !this.targetEntity) {
            return;
        }

        const sourceLayout = this.sourceEntity.getComponent(LayoutComponent);
        const targetLayout = this.targetEntity.getComponent(LayoutComponent);
        if (!sourceLayout || !targetLayout) {
            return;
        }

        // 获取源和目标的世界坐标中心点
        const sourcePos = this.getWorldPosition(this.sourceEntity);
        const targetPos = this.getWorldPosition(this.targetEntity);
        const sx = sourcePos.x + sourcePos.w / 2;
        const sy = sourcePos.y + sourcePos.h / 2;
        const tx = targetPos.x + targetPos.w / 2;
        const ty = targetPos.y + targetPos.h / 2;

        const { color, width, alpha, showArrow, arrowSize } = this.connectionStyle;

        g.lineStyle(width!, color!, alpha!);

        switch (this.lineType) {
            case ConnectionLineType.Straight:
                g.moveTo(sx, sy);
                g.lineTo(tx, ty);
                break;

            case ConnectionLineType.Bezier: {
                const dx = tx - sx;
                const cpOffset = Math.abs(dx) * 0.5;
                g.moveTo(sx, sy);
                g.bezierCurveTo(
                    sx + cpOffset, sy,
                    tx - cpOffset, ty,
                    tx, ty,
                );
                break;
            }

            case ConnectionLineType.Orthogonal: {
                const midX = (sx + tx) / 2;
                g.moveTo(sx, sy);
                g.lineTo(midX, sy);
                g.lineTo(midX, ty);
                g.lineTo(tx, ty);
                break;
            }
        }

        // 绘制箭头
        if (showArrow && arrowSize) {
            this.drawArrow(g, sx, sy, tx, ty, arrowSize);
        }
    }

    /** 在目标端绘制箭头 */
    private drawArrow(g: Graphics, sx: number, sy: number, tx: number, ty: number, size: number) {
        const angle = Math.atan2(ty - sy, tx - sx);
        const { color, alpha } = this.connectionStyle;

        g.beginFill(color!, alpha!);
        g.drawPolygon([
            tx, ty,
            tx - size * Math.cos(angle - Math.PI / 6),
            ty - size * Math.sin(angle - Math.PI / 6),
            tx - size * Math.cos(angle + Math.PI / 6),
            ty - size * Math.sin(angle + Math.PI / 6),
        ]);
        g.endFill();
    }
}
