import { DefaultEntityName } from '../interface/Entity';
import { RenderConfig } from '../modules/render/RenderConfig';
import { System, SystemProps } from '../System';
import { Task } from './Task';

export class TaskFlow extends System {
    task?: Task;
    isRunning = false;
    rafId: number|undefined;
    renderConfig?: RenderConfig;

    constructor(props: SystemProps) {
        super(props);
        this.start();
    }

    start() {
        this.task = this.world.findComponent(Task);
        this.task.systemList.forEach((system) => {
            system.system.start();
        });
        this.renderConfig = this.world.findComponent(RenderConfig);
    }

    /**
     * 启动队列
     * @returns 
     */
    run() {
        if (this.isRunning || !this.renderConfig) {
            return;
        }
        this.isRunning = true;
        this.rafId = requestAnimationFrame(() => {
            if (!this.task) {
                return;
            }
            this.task.systemList.forEach((system) => {
                system.system.update();
            });
        });
        this.renderConfig.renderStage.start();
    }

    /**
     * 暂停队列
     */
    stop() {
        if (!this.isRunning || !this.renderConfig) {
            return;
        }
        this.isRunning = false;
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        this.renderConfig.renderStage.stop();
    }
}
