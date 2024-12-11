import { BaseComponent, BaseComponentProps } from '../../Component';

export interface InteractComponentProps extends BaseComponentProps {

}

export class InteractComponent extends BaseComponent {
    constructor(props: InteractComponentProps) {
        super(props);
    }
}