/**
 * 命令接口 — 所有可撤销操作的基类
 */
export interface ICommand {
    /** 命令描述 */
    description: string;
    /** 执行命令 */
    execute(): void;
    /** 撤销命令 */
    undo(): void;
}

/**
 * 属性变更命令 — 记录单个属性的变更
 */
export class PropertyChangeCommand<T extends object, K extends keyof T> implements ICommand {
    description: string;
    private target: T;
    private property: K;
    private oldValue: T[K];
    private newValue: T[K];

    constructor(target: T, property: K, oldValue: T[K], newValue: T[K], description?: string) {
        this.target = target;
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.description = description ?? `Change ${String(property)}`;
    }

    execute(): void {
        this.target[this.property] = this.newValue;
    }

    undo(): void {
        this.target[this.property] = this.oldValue;
    }
}

/**
 * 批量命令 — 将多个命令组合为一个原子操作
 */
export class BatchCommand implements ICommand {
    description: string;
    private commands: ICommand[];

    constructor(commands: ICommand[], description?: string) {
        this.commands = commands;
        this.description = description ?? 'Batch operation';
    }

    execute(): void {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo(): void {
        // 逆序撤销
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}

/**
 * 自定义命令 — 通过回调函数实现
 */
export class CustomCommand implements ICommand {
    description: string;
    private executeFn: () => void;
    private undoFn: () => void;

    constructor(executeFn: () => void, undoFn: () => void, description?: string) {
        this.executeFn = executeFn;
        this.undoFn = undoFn;
        this.description = description ?? 'Custom operation';
    }

    execute(): void {
        this.executeFn();
    }

    undo(): void {
        this.undoFn();
    }
}
