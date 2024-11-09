import { Stage } from './Stage';

export interface SystemProps {
    world: Stage;
}

export abstract class System {
    protected world: Stage;

    constructor(props: SystemProps) {
        const { world } = props;
        this.world = world;
    }

    start(): void { }

    update(): void { }
}
