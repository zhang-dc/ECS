import { BaseComponent, BaseComponentProps } from '../../Component';

export enum CursorPriority {
    /** 工具默认光标（最低优先级） */
    TOOL_DEFAULT = 0,
    /** 悬停在可选择元素上 */
    HOVER_ENTITY = 1,
    /** 悬停在 resize 手柄上 */
    HOVER_HANDLE = 2,
    /** 活跃操作中（拖拽/resize/绘制/框选等） */
    ACTIVE_OPERATION = 3,
}

export interface CursorRequest {
    cursor: string;
    priority: CursorPriority;
}

/**
 * 光标状态组件
 * 各系统通过 setCursor 声明光标需求，CursorSystem 统一决策
 */
export class CursorComponent extends BaseComponent {
    private requests: CursorRequest[] = [];
    private currentCursor: string = 'default';

    constructor(props?: BaseComponentProps) {
        super(props ?? {});
    }

    /** 各系统调用：声明本帧的光标需求 */
    setCursor(cursor: string, priority: CursorPriority): void {
        this.requests.push({ cursor, priority });
    }

    /** 取最高优先级的光标 */
    resolve(): string {
        if (this.requests.length === 0) return 'default';
        let best = this.requests[0];
        for (let i = 1; i < this.requests.length; i++) {
            if (this.requests[i].priority > best.priority) {
                best = this.requests[i];
            }
        }
        return best.cursor;
    }

    /** 每帧末尾清空请求 */
    clear(): void {
        this.requests.length = 0;
    }

    getCurrentCursor(): string {
        return this.currentCursor;
    }

    setCurrentCursor(cursor: string): void {
        this.currentCursor = cursor;
    }
}
