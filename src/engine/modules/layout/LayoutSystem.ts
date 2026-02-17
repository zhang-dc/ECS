import { Entity } from '../../Entity';
import { System } from '../../System';
import { EventManager } from '../event/Event';
import { getRenderComponents } from '../render/Renderer';
import { LayoutComponent } from './LayoutComponent';
import { LayoutEvent } from './LayoutEvent';

export class LayoutSystem extends System {
    eventManager?: EventManager;

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        const events = this.eventManager?.getEvents(LayoutEvent);
        events?.forEach((event) => {
            const { data } = event;
            const { entities } = data;
            entities.forEach((entity) => {
                this.updateEntityLayout(entity);
            });
        });
    }

    updateEntityLayout(entity: Entity) {
        const { parent, children } = entity;
        const layoutComp = entity.getComponent(LayoutComponent);
        if (!layoutComp) {
            return;
        }

        // 计算世界坐标（考虑父级层级）
        let worldX = layoutComp.x;
        let worldY = layoutComp.y;

        if (parent) {
            let parentEntity: Entity | undefined = parent;
            while (parentEntity) {
                const parentLayoutComp = parentEntity.getComponent(LayoutComponent);
                if (parentLayoutComp) {
                    worldX += parentLayoutComp.x;
                    worldY += parentLayoutComp.y;
                }
                parentEntity = parentEntity.parent;
            }
        }

        // 同步到渲染组件
        const renderers = getRenderComponents(entity);
        renderers.forEach((renderer) => {
            renderer.dirty = true;
            renderer.updateProps.x = worldX;
            renderer.updateProps.y = worldY;
            renderer.updateProps.rotation = layoutComp.rotation;
            renderer.updateProps.scaleX = layoutComp.scaleX;
            renderer.updateProps.scaleY = layoutComp.scaleY;
            renderer.updateProps.anchorX = layoutComp.anchorX;
            renderer.updateProps.anchorY = layoutComp.anchorY;
        });

        // 递归更新子实体
        children.forEach((child) => {
            this.updateEntityLayout(child);
        });
    }
}
