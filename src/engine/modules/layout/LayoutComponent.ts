import { BaseComponent } from '../../Component';

export class LayoutComponent extends BaseComponent {
    x: number = 0;
    y: number = 0;
    dirty = false;

    transform: {
        x: number;
        y: number;
    } = {
        x: 0,
        y: 0,
    }
}
