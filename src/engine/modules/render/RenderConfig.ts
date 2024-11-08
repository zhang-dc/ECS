import { Application, Container } from 'pixi.js';
import { Component, ComponentProps } from '../../Component';
import { DefaultEntityName } from '../../interface/Entity';

export interface RenderConfigProps extends ComponentProps {
    renderStage: Application;
    container: Container;
}

export class RenderConfig extends Component {
    renderStage: Application;
    container: Container;

    constructor(props: RenderConfigProps) {
        super(props);
        const {
            name = DefaultEntityName.RenderConfig,
            renderStage,
            container,
        } = props;
        this.name = name;
        this.renderStage = renderStage;
        this.container = container;
    }
}
