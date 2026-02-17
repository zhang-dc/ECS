import { System } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayerEvent, LayerOperation } from './LayerEvent';

/**
 * 层级管理系统
 * 处理实体的 Z-Index 排序操作
 */
export class LayerSystem extends System {
    eventManager?: EventManager;

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        const layerEvents = this.eventManager?.getEvents(LayerEvent);
        layerEvents?.forEach((event) => {
            this.processLayerEvent(event);
        });
    }

    processLayerEvent(event: LayerEvent) {
        const { data } = event;
        switch (data.operation) {
            case LayerOperation.BringToFront:
                this.bringToFront(data.entities);
                break;
            case LayerOperation.SendToBack:
                this.sendToBack(data.entities);
                break;
            case LayerOperation.BringForward:
                this.bringForward(data.entities);
                break;
            case LayerOperation.SendBackward:
                this.sendBackward(data.entities);
                break;
            case LayerOperation.SetZIndex:
                if (data.zIndex !== undefined) {
                    this.setZIndex(data.entities, data.zIndex);
                }
                break;
        }
    }

    /** 获取所有实体中最大的 zIndex */
    private getMaxZIndex(): number {
        const layouts = this.world.findComponents(LayoutComponent);
        let max = 0;
        layouts.forEach(layout => {
            if (layout.zIndex > max) {
                max = layout.zIndex;
            }
        });
        return max;
    }

    /** 获取所有实体中最小的 zIndex */
    private getMinZIndex(): number {
        const layouts = this.world.findComponents(LayoutComponent);
        let min = 0;
        layouts.forEach(layout => {
            if (layout.zIndex < min) {
                min = layout.zIndex;
            }
        });
        return min;
    }

    /** 置顶 */
    bringToFront(entities: import('../../Entity').Entity[]) {
        const maxZ = this.getMaxZIndex();
        entities.forEach((entity, index) => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.zIndex = maxZ + 1 + index;
                layout.dirty = true;
            }
        });
    }

    /** 置底 */
    sendToBack(entities: import('../../Entity').Entity[]) {
        const minZ = this.getMinZIndex();
        entities.forEach((entity, index) => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.zIndex = minZ - entities.length + index;
                layout.dirty = true;
            }
        });
    }

    /** 上移一层 */
    bringForward(entities: import('../../Entity').Entity[]) {
        entities.forEach((entity) => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.zIndex += 1;
                layout.dirty = true;
            }
        });
    }

    /** 下移一层 */
    sendBackward(entities: import('../../Entity').Entity[]) {
        entities.forEach((entity) => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.zIndex -= 1;
                layout.dirty = true;
            }
        });
    }

    /** 设置指定 zIndex */
    setZIndex(entities: import('../../Entity').Entity[], zIndex: number) {
        entities.forEach((entity) => {
            const layout = entity.getComponent(LayoutComponent);
            if (layout) {
                layout.zIndex = zIndex;
                layout.dirty = true;
            }
        });
    }
}
