import { System } from '../../../engine/System';

export class SceneSystem extends System {
    start(): void {
        console.log('start');
    }

    update(): void {
        console.log('update');
    }
}
