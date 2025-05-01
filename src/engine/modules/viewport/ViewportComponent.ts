import { BaseComponent, BaseComponentProps } from '../../Component';

export interface ViewportComponentProps extends BaseComponentProps {
    scale?: number;
}

export class ViewportComponent extends BaseComponent {
    scale: number = 1;

    constructor(props: ViewportComponentProps) {
        super(props);
        const { scale = 1 } = props;
        this.scale = scale;
    }
}
