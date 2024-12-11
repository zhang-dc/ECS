import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { Position } from '../hitTest/HitTest';
import { HitTestComponent, HitTestType } from '../hitTest/HitTestComponent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { ViewportComponent } from './ViewportComponent';

export interface InstanceViewportEntityProps {
    world: Stage;
    size: [number, number];
    position?: Position;
}

export function instanceViewportEntity(props: InstanceViewportEntityProps) {
    const {
        world, size, position,
    } = props;

    const entity = new Entity({
        name: DefaultEntityName.Viewport,
        world,
    });

    const viewportComp = new ViewportComponent({});
    const hitTestComp = new HitTestComponent({
        type: HitTestType.Rect,
        options: {
            offset: [0, 0],
            size,
        },
        name: DefaultEntityName.Viewport,
    });
    const layoutComp = new LayoutComponent({
        position,
    })

    entity.addComponent(viewportComp);
    entity.addComponent(hitTestComp);
    entity.addComponent(layoutComp);

    world.addEntity(entity);

    return entity;
}
