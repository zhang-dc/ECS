import { Application, Container } from 'pixi.js';
import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { RenderConfig } from './RenderConfig';

export interface InstanceRenderConfigEntityProps {
    world: Stage,
    renderStage: Application;
    container: Container;
}

export function instanceRenderConfigEntity(props: InstanceRenderConfigEntityProps) {
    const { world, renderStage, container } = props;

    const entity = new Entity({
        name: DefaultEntityName.RenderConfig,
        world,
    });

    const renderConfig = new RenderConfig({
        renderStage,
        container,
    });

    entity.addComponent(renderConfig);

    world.addEntity(entity);

    return entity;
}
