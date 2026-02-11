import { RenderConfig } from '../modules/render/RenderConfig';
import { System, SystemProps } from '../System';
import { Task } from './Task';

export class TaskFlow extends System {
    task?: Task;
    isRunning = false;
    rafId: number | undefined;
    renderConfig?: RenderConfig;

    constructor(props: SystemProps) {
        super(props);
        this.init();
    }

    init() {
        this.task = this.world.findComponent(Task);
        this.task.systemList.forEach((system) => {
            system.system.start();
        });
        this.renderConfig = this.world.findComponent(RenderConfig);
    }

    run() {
        if (this.isRunning || !this.renderConfig) {
            return;
        }
        this.isRunning = true;
        this.renderConfig.renderStage.start();
        this.runLoop();
    }

    runLoop() {
        if (!this.isRunning) {
            return;
        }
        this.rafId = requestAnimationFrame(() => {
            if (!this.task) {
                return;
            }
            this.task.systemList.forEach((system) => {
                system.system.update();
            });
            this.task.systemList.forEach((system) => {
                system.system.end();
            });
            // 帧结束时清理变更追踪
            this.world.clearFrameTracking();
            this.runLoop();
        });
    }

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
