import { BaseComponent, BaseComponentProps } from '../../Component';
import { ICommand } from './Command';

export interface HistoryComponentProps extends BaseComponentProps {
    /** 最大历史记录数 */
    maxHistory?: number;
}

/**
 * 历史记录组件 — 管理 Undo/Redo 栈
 */
export class HistoryComponent extends BaseComponent {
    /** 撤销栈 */
    undoStack: ICommand[] = [];
    /** 重做栈 */
    redoStack: ICommand[] = [];
    /** 最大历史记录数 */
    maxHistory: number;
    /** 状态变化标记 */
    dirty: boolean = false;

    constructor(props: HistoryComponentProps) {
        super(props);
        const { maxHistory = 100 } = props;
        this.maxHistory = maxHistory;
    }

    /**
     * 执行命令并记录到历史
     */
    executeCommand(command: ICommand): void {
        command.execute();
        this.undoStack.push(command);
        // 执行新命令后清空重做栈
        this.redoStack = [];
        // 限制历史记录数量
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.dirty = true;
    }

    /**
     * 撤销上一个命令
     */
    undo(): boolean {
        const command = this.undoStack.pop();
        if (!command) {
            return false;
        }
        command.undo();
        this.redoStack.push(command);
        this.dirty = true;
        return true;
    }

    /**
     * 重做上一个被撤销的命令
     */
    redo(): boolean {
        const command = this.redoStack.pop();
        if (!command) {
            return false;
        }
        command.execute();
        this.undoStack.push(command);
        this.dirty = true;
        return true;
    }

    /** 是否可以撤销 */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /** 是否可以重做 */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /** 清空所有历史记录 */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.dirty = true;
    }
}
