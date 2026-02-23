import { World } from './Stage';

export interface SystemProps {
    world: World;
}

export type SystemClass = new (props: any) => System;

export abstract class System {
    protected world: World;

    /**
     * 声明式约束：该 System 应在哪些 System 之前执行
     * 子类可覆盖此静态属性
     */
    static before?: SystemClass[];

    /**
     * 声明式约束：该 System 应在哪些 System 之后执行
     * 子类可覆盖此静态属性
     */
    static after?: SystemClass[];

    constructor(props: SystemProps) {
        const { world } = props;
        this.world = world;
    }

    start(): void { }

    update(): void { }

    end(): void { }
}
