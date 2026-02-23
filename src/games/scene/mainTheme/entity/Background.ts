import { Application, DisplayObject } from 'pixi.js';
import { Entity } from '../../../../engine/Entity';
import { SpriteRenderer } from '../../../../engine/modules/render/SpriteRenderer';
import { World } from '../../../../engine/Stage';
import { EntityName } from '../../../interface/Entity';
import logo512 from '../../../assets/img/logo512.png';
import { HitTestComponent, HitTestType } from '../../../../engine/modules/hitTest/HitTestComponent';
import { LayoutComponent } from '../../../../engine/modules/layout/LayoutComponent';

export interface InstanceMainThemeBackground {
    world: World,
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
        options: {
            width: 100,
            height: 100,
        },
        zIndex: 0,
        visible: true,
    });
    const hitTestComp = new HitTestComponent({
        name: EntityName.MainThemeBackground,
        type: HitTestType.Rect,
        options: {
            offset: [0, 0],
            size: [100, 100],
        },
    });
    const layoutComp = new LayoutComponent({
        position: {
            x: 0,
            y: 0,
        },
    });

    entity.addComponent(background);
    entity.addComponent(hitTestComp);
    entity.addComponent(layoutComp);

    return entity;
}
