import { BaseComponent, BaseComponentProps } from '../../Component';
import { Position } from '../hitTest/HitTest';

export interface LayoutComponentProps extends BaseComponentProps {
    position?: Position;
}

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
    };

    constructor(props: LayoutComponentProps) {
        super(props);
        const { position } = props;
        if (position) {
            this.updatePosition(position);
        }
    }

    updatePosition(position: Position) {
        this.x = Math.round(position.x);
        this.y = Math.round(position.y);
        this.dirty = true;
    }
}
