import { Graphics, DisplayObject } from 'pixi.js';
import { System } from '../../System';
import { DefaultEntityName } from '../../interface/Entity';
import { RenderConfig } from '../render/RenderConfig';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { GuideComponent } from './GuideComponent';

const GRID_COLOR = 0xE0E0E0;
const GRID_ALPHA = 0.5;
const GUIDE_COLOR = 0xFF4081;
const GUIDE_ALPHA = 0.7;

/**
 * 网格 + 智能对齐线渲染系统
 * 在 container 内绘制网格线和对齐线
 */
export class GridRenderSystem extends System {
    private renderConfig?: RenderConfig;
    private viewportComponent?: ViewportComponent;
    private guideComponent?: GuideComponent;
    private gridGraphics: Graphics = new Graphics();
    private guideGraphics: Graphics = new Graphics();
    private initialized = false;

    start(): void {
        this.renderConfig = this.world.findComponent(RenderConfig);
        this.guideComponent = this.world.findComponent(GuideComponent);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);
    }

    update(): void {
        if (!this.renderConfig) return;

        if (!this.initialized) {
            this.guideGraphics.zIndex = 999996;
            this.renderConfig.overlayContainer.addChild(this.guideGraphics as DisplayObject);
            this.initialized = true;
        }

        // 网格每帧添加到 container（RenderSystem 每帧 removeChildren 后重新添加实体，
        // GridRenderSystem 在其之后执行，此时追加网格，zIndex=-1000 确保在所有实体下方）
        this.gridGraphics.zIndex = -1000;
        this.renderConfig.container.addChild(this.gridGraphics as DisplayObject);

        this.drawGrid();
        this.drawGuideLines();
    }

    private drawGrid(): void {
        const g = this.gridGraphics;
        g.clear();

        if (!this.guideComponent?.showGrid || !this.viewportComponent) return;

        const scale = this.viewportComponent.scale;
        let gridSize = this.guideComponent.gridSize;

        // 根据缩放级别动态调整网格间距
        // 当网格在屏幕上太密时（小于 10px），加倍间距
        while (gridSize * scale < 10) {
            gridSize *= 2;
        }
        // 当网格在屏幕上太稀时（大于 100px），减半间距
        while (gridSize * scale > 100 && gridSize > 5) {
            gridSize /= 2;
        }

        const bounds = this.viewportComponent.getWorldBounds();
        const lineWidth = 0.5 / scale;

        g.lineStyle(lineWidth, GRID_COLOR, GRID_ALPHA);

        // 计算起始和结束位置（对齐到网格）
        const startX = Math.floor(bounds.x / gridSize) * gridSize;
        const endX = Math.ceil((bounds.x + bounds.width) / gridSize) * gridSize;
        const startY = Math.floor(bounds.y / gridSize) * gridSize;
        const endY = Math.ceil((bounds.y + bounds.height) / gridSize) * gridSize;

        // 限制最大线数（防止性能问题）
        const maxLines = 200;
        const xLines = (endX - startX) / gridSize;
        const yLines = (endY - startY) / gridSize;

        if (xLines > maxLines || yLines > maxLines) return;

        // 垂直线
        for (let x = startX; x <= endX; x += gridSize) {
            g.moveTo(x, startY);
            g.lineTo(x, endY);
        }

        // 水平线
        for (let y = startY; y <= endY; y += gridSize) {
            g.moveTo(startX, y);
            g.lineTo(endX, y);
        }
    }

    private drawGuideLines(): void {
        const g = this.guideGraphics;
        g.clear();

        if (!this.guideComponent || !this.viewportComponent) return;
        if (!this.guideComponent.showSmartGuides) return;

        const lines = this.guideComponent.activeGuideLines;
        if (lines.length === 0) return;

        const scale = this.viewportComponent.scale;
        const lineWidth = 1 / scale;
        const bounds = this.viewportComponent.getWorldBounds();

        g.lineStyle(lineWidth, GUIDE_COLOR, GUIDE_ALPHA);

        lines.forEach(line => {
            if (line.direction === 'vertical') {
                g.moveTo(line.position, bounds.y);
                g.lineTo(line.position, bounds.y + bounds.height);
            } else {
                g.moveTo(bounds.x, line.position);
                g.lineTo(bounds.x + bounds.width, line.position);
            }
        });
    }
}
