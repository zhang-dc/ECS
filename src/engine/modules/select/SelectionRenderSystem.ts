import { Graphics, DisplayObject } from 'pixi.js';
import { System } from '../../System';
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

        // 为每个选中实体绘制边框
        selected.forEach(entity => {
            const layoutComp = entity.getComponent(LayoutComponent);
            if (!layoutComp) return;

            const aabb = getWorldAABB(entity);
            if (aabb.width === 0 && aabb.height === 0) return;

            // 蓝色边框
            g.lineStyle(lineWidth, SELECTION_COLOR, 1);
            g.drawRect(aabb.x, aabb.y, aabb.width, aabb.height);
        });

        // 计算手柄所用的包围盒
        // 单选：用该实体的 AABB；多选：用所有选中实体的组合 AABB
        let boundsX = 0, boundsY = 0, boundsW = 0, boundsH = 0;
        let hasBounds = false;

        if (selected.length === 1) {
            const layoutComp = selected[0].getComponent(LayoutComponent);
            if (layoutComp) {
                const aabb = getWorldAABB(selected[0]);
                if (aabb.width > 0 || aabb.height > 0) {
                    boundsX = aabb.x;
                    boundsY = aabb.y;
                    boundsW = aabb.width;
                    boundsH = aabb.height;
                    hasBounds = true;
                }
            }
        } else if (selected.length > 1) {
            // 多选：计算组合包围盒
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            selected.forEach(entity => {
                const layoutComp = entity.getComponent(LayoutComponent);
                if (!layoutComp) return;
                const aabb = getWorldAABB(entity);
                if (aabb.width === 0 && aabb.height === 0) return;
                minX = Math.min(minX, aabb.x);
                minY = Math.min(minY, aabb.y);
                maxX = Math.max(maxX, aabb.x + aabb.width);
                maxY = Math.max(maxY, aabb.y + aabb.height);
            });

            if (minX < Infinity) {
                boundsX = minX;
                boundsY = minY;
                boundsW = maxX - minX;
                boundsH = maxY - minY;
                hasBounds = true;

                // 多选时绘制整体包围框（虚线效果用较低透明度）
                g.lineStyle(lineWidth, SELECTION_COLOR, 0.4);
                g.drawRect(boundsX, boundsY, boundsW, boundsH);
            }
        }

        // 绘制 resize 手柄
        if (hasBounds && (boundsW > 0 || boundsH > 0)) {
            const halfHandle = handleWorldSize / 2;

            const handlePositions: HandleInfo[] = [
                { x: boundsX, y: boundsY, cursor: 'nwse-resize', type: 'tl' },
                { x: boundsX + boundsW / 2, y: boundsY, cursor: 'ns-resize', type: 't' },
                { x: boundsX + boundsW, y: boundsY, cursor: 'nesw-resize', type: 'tr' },
                { x: boundsX + boundsW, y: boundsY + boundsH / 2, cursor: 'ew-resize', type: 'r' },
                { x: boundsX + boundsW, y: boundsY + boundsH, cursor: 'nwse-resize', type: 'br' },
                { x: boundsX + boundsW / 2, y: boundsY + boundsH, cursor: 'ns-resize', type: 'b' },
                { x: boundsX, y: boundsY + boundsH, cursor: 'nesw-resize', type: 'bl' },
                { x: boundsX, y: boundsY + boundsH / 2, cursor: 'ew-resize', type: 'l' },
            ];

            handlePositions.forEach(handle => {
                // 白色填充 + 蓝色边框的方块
                g.lineStyle(lineWidth, SELECTION_COLOR, 1);
                g.beginFill(0xFFFFFF, 1);
                g.drawRect(
                    handle.x - halfHandle,
                    handle.y - halfHandle,
                    handleWorldSize,
                    handleWorldSize,
                );
                g.endFill();
            });

            this.handles = handlePositions;
        }
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
