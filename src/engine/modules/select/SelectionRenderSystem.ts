import { Graphics, DisplayObject } from 'pixi.js';
import { System } from '../../System';
import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { RenderConfig } from '../render/RenderConfig';
import { LayoutComponent, getWorldAABB } from '../layout/LayoutComponent';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { SelectionState } from './SelectionState';

/** resize 手柄大小（屏幕像素） */
const HANDLE_SIZE = 8;
/** 选中框颜色 */
const SELECTION_COLOR = 0x4285F4;
/** 框选矩形填充色 */
const MARQUEE_FILL = 0x4285F4;
const MARQUEE_FILL_ALPHA = 0.08;
const MARQUEE_STROKE_ALPHA = 0.5;

export interface HandleInfo {
    x: number;
    y: number;
    cursor: string;
    /** 手柄类型：tl/t/tr/r/br/b/bl/l */
    type: string;
}

/**
 * 选中框渲染系统
 * 在 RenderSystem 之后运行，绘制：
 * - 选中实体的蓝色边框
 * - 8 个 resize 手柄（单选 / 多选均显示）
 * - 多选时额外绘制整体包围框
 * - 框选矩形
 */
export class SelectionRenderSystem extends System {
    private selectionState?: SelectionState;
    private viewportComponent?: ViewportComponent;
    private renderConfig?: RenderConfig;
    private selectionGraphics: Graphics = new Graphics();
    private marqueeGraphics: Graphics = new Graphics();
    private initialized = false;

    /** 当前帧计算的手柄位置（世界坐标），供 ResizeSystem 使用 */
    handles: HandleInfo[] = [];

    start(): void {
        this.selectionState = this.world.findComponent(SelectionState);
        this.renderConfig = this.world.findComponent(RenderConfig);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);
    }

    update(): void {
        if (!this.renderConfig || !this.selectionState) return;

        // 延迟初始化：将 Graphics 添加到 overlayContainer（不受 RenderSystem.removeChildren 影响）
        if (!this.initialized) {
            this.renderConfig.overlayContainer.addChild(this.selectionGraphics as DisplayObject);
            this.renderConfig.overlayContainer.addChild(this.marqueeGraphics as DisplayObject);
            this.selectionGraphics.zIndex = 999998;
            this.marqueeGraphics.zIndex = 999999;
            this.initialized = true;
        }

        this.drawSelection();
        this.drawMarquee();
    }

    private drawSelection(): void {
        const g = this.selectionGraphics;
        g.clear();
        this.handles = [];

        if (!this.selectionState || this.selectionState.selectedEntities.size === 0) {
            return;
        }

        // 文本编辑态隐藏缩放框，让用户专注于文字编辑
        if (this.world.isTextEditing) {
            return;
        }

        const scale = this.viewportComponent?.scale ?? 1;
        // 线宽在世界坐标中需要反向缩放，使其在屏幕上保持固定粗细
        const lineWidth = 1.5 / scale;
        const handleWorldSize = HANDLE_SIZE / scale;

        const selected = this.selectionState.getSelectedArray();

        // 缓存 AABB 避免重复计算（多选时每个实体会被调用多次 getWorldAABB）
        const aabbCache: Map<Entity, { x: number; y: number; width: number; height: number }> = new Map();
        const validAABBs: { x: number; y: number; width: number; height: number }[] = [];

        selected.forEach(entity => {
            const layoutComp = entity.getComponent(LayoutComponent);
            if (!layoutComp) return;
            const aabb = getWorldAABB(entity);
            aabbCache.set(entity, aabb);
            if (aabb.width > 0 || aabb.height > 0) {
                validAABBs.push(aabb);
            }
        });

        // 单选旋转元素：绘制旋转矩形 + 旋转手柄
        if (selected.length === 1) {
            const entity = selected[0];
            const layoutComp = entity.getComponent(LayoutComponent);
            if (!layoutComp || (layoutComp.width <= 0 && layoutComp.height <= 0)) return;

            // 计算世界坐标原点
            let wx = layoutComp.x;
            let wy = layoutComp.y;
            let parent = entity.parent;
            while (parent) {
                const pl = parent.getComponent(LayoutComponent);
                if (pl) { wx += pl.x; wy += pl.y; }
                parent = parent.parent;
            }

            const w = layoutComp.width;
            const h = layoutComp.height;
            const rot = layoutComp.rotation;
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);

            // 旋转一个局部偏移到世界坐标
            const rx = (lx: number, ly: number) => wx + lx * cos - ly * sin;
            const ry = (lx: number, ly: number) => wy + lx * sin + ly * cos;

            // 4 个角的世界坐标
            const tlX = rx(0, 0), tlY = ry(0, 0);
            const trX = rx(w, 0), trY = ry(w, 0);
            const brX = rx(w, h), brY = ry(w, h);
            const blX = rx(0, h), blY = ry(0, h);

            // 绘制旋转选中框
            g.lineStyle(lineWidth, SELECTION_COLOR, 1);
            g.moveTo(tlX, tlY);
            g.lineTo(trX, trY);
            g.lineTo(brX, brY);
            g.lineTo(blX, blY);
            g.closePath();

            // 8 个手柄位置（旋转后的角 + 边中点）
            const halfHandle = handleWorldSize / 2;
            const handlePositions: HandleInfo[] = [
                { x: tlX, y: tlY, cursor: 'nwse-resize', type: 'tl' },
                { x: (tlX + trX) / 2, y: (tlY + trY) / 2, cursor: 'ns-resize', type: 't' },
                { x: trX, y: trY, cursor: 'nesw-resize', type: 'tr' },
                { x: (trX + brX) / 2, y: (trY + brY) / 2, cursor: 'ew-resize', type: 'r' },
                { x: brX, y: brY, cursor: 'nwse-resize', type: 'br' },
                { x: (brX + blX) / 2, y: (brY + blY) / 2, cursor: 'ns-resize', type: 'b' },
                { x: blX, y: blY, cursor: 'nesw-resize', type: 'bl' },
                { x: (blX + tlX) / 2, y: (blY + tlY) / 2, cursor: 'ew-resize', type: 'l' },
            ];

            handlePositions.forEach(handle => {
                g.lineStyle(lineWidth, SELECTION_COLOR, 1);
                g.beginFill(0xFFFFFF, 1);
                if (rot === 0) {
                    g.drawRect(handle.x - halfHandle, handle.y - halfHandle, handleWorldSize, handleWorldSize);
                } else {
                    // 绘制旋转的手柄方块
                    const hCos = cos * halfHandle;
                    const hSin = sin * halfHandle;
                    // 手柄中心到四角的偏移（旋转后）
                    const dxA = hCos - (-hSin); // (+halfHandle, -halfHandle) rotated
                    const dyA = hSin + (-hCos);
                    const dxB = hCos - hSin;    // (+halfHandle, +halfHandle) rotated
                    const dyB = hSin + hCos;
                    g.moveTo(handle.x + dxA, handle.y + dyA);  // top-right of handle
                    g.lineTo(handle.x + dxB, handle.y + dyB);  // bottom-right
                    g.lineTo(handle.x - dxA, handle.y - dyA);  // bottom-left
                    g.lineTo(handle.x - dxB, handle.y - dyB);  // top-left
                    g.closePath();
                }
                g.endFill();
            });

            this.handles = handlePositions;
            return;
        }

        // 多选：每个元素绘制旋转描边框，无手柄
        selected.forEach(entity => {
            const lc = entity.getComponent(LayoutComponent);
            if (!lc || (lc.width <= 0 && lc.height <= 0)) return;

            let ewx = lc.x, ewy = lc.y;
            let ep = entity.parent;
            while (ep) {
                const pl = ep.getComponent(LayoutComponent);
                if (pl) { ewx += pl.x; ewy += pl.y; }
                ep = ep.parent;
            }

            g.lineStyle(lineWidth, SELECTION_COLOR, 1);
            if (lc.rotation === 0) {
                g.drawRect(ewx, ewy, lc.width, lc.height);
            } else {
                const ec = Math.cos(lc.rotation), es = Math.sin(lc.rotation);
                const erx = (lx: number, ly: number) => ewx + lx * ec - ly * es;
                const ery = (lx: number, ly: number) => ewy + lx * es + ly * ec;
                g.moveTo(erx(0, 0), ery(0, 0));
                g.lineTo(erx(lc.width, 0), ery(lc.width, 0));
                g.lineTo(erx(lc.width, lc.height), ery(lc.width, lc.height));
                g.lineTo(erx(0, lc.height), ery(0, lc.height));
                g.closePath();
            }
        });
    }

    private drawMarquee(): void {
        const g = this.marqueeGraphics;
        g.clear();

        if (!this.selectionState?.isMarqueeSelecting) return;

        const rect = this.selectionState.getMarqueeRect();
        if (!rect || (rect.width < 1 && rect.height < 1)) return;

        const scale = this.viewportComponent?.scale ?? 1;
        const lineWidth = 1 / scale;

        // 半透明蓝色填充 + 蓝色边框
        g.lineStyle(lineWidth, SELECTION_COLOR, MARQUEE_STROKE_ALPHA);
        g.beginFill(MARQUEE_FILL, MARQUEE_FILL_ALPHA);
        g.drawRect(rect.x, rect.y, rect.width, rect.height);
        g.endFill();
    }
}
