import { Application, Container, DisplayObject } from 'pixi.js';
import { System, SystemProps } from '../../System';
import { instanceRenderConfigEntity } from './RenderEntity';
import { RenderConfig } from './RenderConfig';
import { getAllRendersInEntity, RenderComType } from './Renderer';
import { LayoutComponent } from '../layout/LayoutComponent';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderSystemProps extends SystemProps {
    canvas: HTMLCanvasElement;
}

export class RenderSystem extends System {
    canvas: HTMLCanvasElement;
    renderConfig: RenderConfig;
    viewportComponent?: ViewportComponent;

    constructor(props: RenderSystemProps) {
        super(props);
        const { canvas } = props;
        this.canvas = canvas;
        const container = new Container();
        container.sortableChildren = true;
        const overlayContainer = new Container();
        overlayContainer.sortableChildren = true;
        const renderStage = new Application({
            view: canvas,
            autoStart: false,
            width: Math.floor(canvas.width),
            height: Math.floor(canvas.height),
            backgroundColor: 0xF5F5F5,
            backgroundAlpha: 1,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        renderStage.stage.addChild(container as DisplayObject);
        renderStage.stage.addChild(overlayContainer as DisplayObject);
        const renderConfigEntity = instanceRenderConfigEntity({
            world: this.world,
            container,
            overlayContainer,
            renderStage,
            canvas,
        });
        this.renderConfig = renderConfigEntity.getComponent(RenderConfig)!;
    }

    start() {
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);
    }

    update() {
        // 更新所有渲染组件的 Pixi 对象
        const renders = this.world.findComponents(RenderComType);
        renders.forEach((render) => {
            render.updateRenderObject();
        });

        // 基于视口裁剪（Frustum Culling）决定渲染哪些实体
        this.renderConfig.container.removeChildren();

        const viewportBounds = this.viewportComponent?.getWorldBounds();
        const renderableEntities = this.world.entities.filter((entity) => {
            // 跳过系统实体
            if (entity.name === DefaultEntityName.RenderConfig ||
                entity.name === DefaultEntityName.Viewport ||
                entity.name === DefaultEntityName.Pointer ||
                entity.name === DefaultEntityName.EventManager ||
                entity.name === DefaultEntityName.Keyboard ||
                entity.name === DefaultEntityName.Task ||
                entity.name === DefaultEntityName.Selection ||
                entity.name === DefaultEntityName.History ||
                entity.name === DefaultEntityName.Guide) {
                return false;
            }
            const layoutComp = entity.getComponent(LayoutComponent);
            if (!layoutComp) {
                return false;
            }
            // 如果没有视口信息，渲染所有实体
            if (!viewportBounds) {
                return true;
            }
            // AABB 视口裁剪
            const aabb = layoutComp.getAABB();
            if (aabb.width === 0 && aabb.height === 0) {
                // 没有尺寸的实体（如点），检查是否在视口内
                return aabb.x >= viewportBounds.x &&
                    aabb.x <= viewportBounds.x + viewportBounds.width &&
                    aabb.y >= viewportBounds.y &&
                    aabb.y <= viewportBounds.y + viewportBounds.height;
            }
            // 矩形相交测试
            return !(aabb.x > viewportBounds.x + viewportBounds.width ||
                aabb.x + aabb.width < viewportBounds.x ||
                aabb.y > viewportBounds.y + viewportBounds.height ||
                aabb.y + aabb.height < viewportBounds.y);
        });

        // 按 zIndex 排序
        renderableEntities.sort((a, b) => {
            const layoutA = a.getComponent(LayoutComponent);
            const layoutB = b.getComponent(LayoutComponent);
            return (layoutA?.zIndex ?? 0) - (layoutB?.zIndex ?? 0);
        });

        // 收集并添加渲染对象
        const displayObjects: DisplayObject[] = [];
        renderableEntities.forEach((entity) => {
            const renders = getAllRendersInEntity(entity);
            renders.forEach((render) => {
                if (render.renderObject && render.visible) {
                    render.renderObject.zIndex = render.zIndex;
                    displayObjects.push(render.renderObject);
                }
            });
        });
        displayObjects.forEach(obj => this.renderConfig.container.addChild(obj));
    }
}
