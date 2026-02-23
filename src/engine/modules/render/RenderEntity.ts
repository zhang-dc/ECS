import { Application, Container } from 'pixi.js';
import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { World } from '../../Stage';
import { RenderConfig } from './RenderConfig';

export interface InstanceRenderConfigEntityProps {
    world: World,
    renderStage: Application;
    container: Container;
    canvas: HTMLCanvasElement;
}

export function instanceRenderConfigEntity(props: InstanceRenderConfigEntityProps) {
    const { world, renderStage, container, canvas } = props;

    const entity = new Entity({
        name: DefaultEntityName.RenderConfig,
        world,
    });

    const renderConfig = new RenderConfig({
        renderStage,
        container,
        canvas,
    });

    entity.addComponent(renderConfig);

    return entity;
}
