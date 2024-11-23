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
        // 更新 stage 上的 entity
        if (!parent) {
            const renderers = getRenderComponents(entity);
            renderers.forEach((renderer) => {
                renderer.dirty = true;
                renderer.updateProps.x = layoutComp.x;
                renderer.updateProps.y = layoutComp.y;
            });
        } else {
            // 更新相对位置
            let { x, y } = layoutComp;
            let parentEntity: Entity|undefined = parent;
            while (parentEntity) {
                const parentLayoutComp = parentEntity.getComponent(LayoutComponent);
                if (!parentLayoutComp) {
                    parentEntity = parentEntity.parent;
                    continue;
                }
                x += parentLayoutComp.x;
                y += parentLayoutComp.y;
            }
            const renderers = getRenderComponents(entity);
            renderers.forEach((renderer) => {
                renderer.dirty = true;
                renderer.updateProps.x = x;
                renderer.updateProps.y = y;
            });
        }
        children.forEach((entity) => {
            this.updateEntityLayout(entity);
        });
    }
}
