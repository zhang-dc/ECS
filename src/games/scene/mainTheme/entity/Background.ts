import { Application, DisplayObject } from 'pixi.js';
import { Entity } from '../../../../engine/Entity';
import { SpriteRenderer } from '../../../../engine/modules/render/SpriteRenderer';
import { Stage } from '../../../../engine/Stage';
import { EntityName } from '../../../interface/Entity';
import logo512 from '../../../assets/img/logo512.png';

export interface InstanceMainThemeBackground {
    world: Stage,
    renderStage: Application,
}

export function instanceMainThemeBackground(props: InstanceMainThemeBackground) {
    const { world, renderStage } = props;

    const entity = new Entity({
        name: EntityName.MainThemeBackground,
        world,
    });

    const background = new SpriteRenderer({
        renderStage,
        source: logo512,
        options: {},
    });
    renderStage.stage.addChild(background.renderObject as DisplayObject);

    entity.addComponent(background);

    return entity;
}
