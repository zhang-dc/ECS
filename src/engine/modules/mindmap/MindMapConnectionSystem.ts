import { System } from '../../System';
import { ConnectionRenderer } from '../render/ConnectionRenderer';

/**
 * 思维导图连线系统
 *
 * 职责：
 * - 每帧标记所有连线为 dirty，触发重绘
 * - ConnectionRenderer 内部使用 getWorldPosition() 计算世界坐标绘制连线
 * - 连线的创建和删除由 MindMapCommandSystem 负责
 */
export class MindMapConnectionSystem extends System {
    update(): void {
        const connectionRenderers = this.world.findComponents(ConnectionRenderer);
        connectionRenderers.forEach(renderer => {
            if (renderer.sourceEntity && renderer.targetEntity) {
                renderer.dirty = true;
            }
        });
    }
}
