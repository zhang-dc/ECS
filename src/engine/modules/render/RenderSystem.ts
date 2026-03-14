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

    /** 缓存系统实体名称集合，用于快速查找 */
    private systemEntityNames: Set<string> = new Set([
        DefaultEntityName.RenderConfig,
        DefaultEntityName.Viewport,
        DefaultEntityName.Pointer,
        DefaultEntityName.EventManager,
        DefaultEntityName.Keyboard,
        DefaultEntityName.Task,
        DefaultEntityName.Selection,
        DefaultEntityName.History,
        DefaultEntityName.Guide,
    ]);

    /** 上次渲染的实体 ID 集合，用于增量更新 */
    private lastRenderableEntityIds: Set<string> = new Set();
    /** 上次视口边界，用于检测视口变化 */
    private lastViewportBounds: { x: number; y: number; width: number; height: number } | null = null;

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
        // 获取当前视口边界
        const viewportBounds = this.viewportComponent?.getWorldBounds();

        // 检测视口是否变化
        const viewportChanged = this.hasViewportChanged(viewportBounds);

        // 延迟实体变化检测：只有当视口没变化时才需要检测实体变化
        // 因为视口变化时无论如何都需要重新渲染
        let entitiesChanged = false;
        if (!viewportChanged) {
            const currentEntityIds = new Set<string>();
            this.world.entities.forEach(entity => {
                if (entity.id) {
                    currentEntityIds.add(entity.id);
                }
            });
            entitiesChanged = this.hasEntitiesChanged(currentEntityIds);
        }

        // 先检测是否需要更新 dirty 渲染组件（只在视口和实体都没变化时才考虑跳过）
        let hasDirty = false;
        if (!viewportChanged && !entitiesChanged) {
            hasDirty = this.hasDirtyRenderers();
            // 如果没有 dirty 的渲染组件，跳过全部渲染逻辑
            if (!hasDirty) {
                return;
            }
        }

        // 更新 dirty 的渲染组件
        const renders = this.world.findComponents(RenderComType);
        renders.forEach((render) => {
            if (render.dirty) {
                render.updateRenderObject();
            }
        });

        // 更新缓存
        if (!viewportChanged && !entitiesChanged) {
            // 只有在没有提前返回时才需要更新实体缓存
            const currentEntityIds = new Set<string>();
            this.world.entities.forEach(entity => {
                if (entity.id) {
                    currentEntityIds.add(entity.id);
                }
            });
            this.lastViewportBounds = viewportBounds ? { ...viewportBounds } : null;
            this.lastRenderableEntityIds = currentEntityIds;
        } else {
            this.lastViewportBounds = viewportBounds ? { ...viewportBounds } : null;
            const currentEntityIds = new Set<string>();
            this.world.entities.forEach(entity => {
                if (entity.id) {
                    currentEntityIds.add(entity.id);
                }
            });
            this.lastRenderableEntityIds = currentEntityIds;
        }

        // 基于视口裁剪（Frustum Culling）决定渲染哪些实体
        this.renderConfig.container.removeChildren();

        const renderableEntities = this.world.entities.filter((entity) => {
            // 使用缓存的系统实体名称集合快速查找
            if (this.systemEntityNames.has(entity.name)) {
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
            const entityRenders = getAllRendersInEntity(entity);
            entityRenders.forEach((render) => {
                if (render.renderObject && render.visible) {
                    render.renderObject.zIndex = render.zIndex;
                    displayObjects.push(render.renderObject);
                }
            });
        });
        displayObjects.forEach(obj => this.renderConfig.container.addChild(obj));
    }

    /** 检测视口是否变化 */
    private hasViewportChanged(currentBounds: { x: number; y: number; width: number; height: number } | null | undefined): boolean {
        if (!this.lastViewportBounds && !currentBounds) {
            return false;
        }
        if (!this.lastViewportBounds || !currentBounds) {
            return true;
        }
        return (
            this.lastViewportBounds.x !== currentBounds.x ||
            this.lastViewportBounds.y !== currentBounds.y ||
            this.lastViewportBounds.width !== currentBounds.width ||
            this.lastViewportBounds.height !== currentBounds.height
        );
    }

    /** 检测实体列表是否变化 */
    private hasEntitiesChanged(currentIds: Set<string>): boolean {
        if (currentIds.size !== this.lastRenderableEntityIds.size) {
            return true;
        }
        for (const id of currentIds) {
            if (!this.lastRenderableEntityIds.has(id)) {
                return true;
            }
        }
        return false;
    }

    /** 检测是否有 dirty 的渲染组件 */
    private hasDirtyRenderers(): boolean {
        const renders = this.world.findComponents(RenderComType);
        for (const render of renders) {
            if (render.dirty) {
                return true;
            }
        }
        return false;
    }
}
