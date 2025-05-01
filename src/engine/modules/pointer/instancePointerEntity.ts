import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { HitTestName } from '../hitTest/HitTest';
import { HitTestComponent, HitTestType } from '../hitTest/HitTestComponent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { PointerComponent } from './PointerComponent';

export interface InstancePointerEntityProps {
    world: Stage;
}

export function instancePointerEntity(props: InstancePointerEntityProps) {
    const {
        world,
    } = props;

    const entity = new Entity({
        name: DefaultEntityName.Pointer,
        world,
    });

    const pointerComp = new PointerComponent({});
    const layoutComp = new LayoutComponent({});
    const hitTestComp = new HitTestComponent({
        name: HitTestName.Pointer,
        type: HitTestType.Point,
        options: {
            offset: [0, 0],
        },
    });


    entity.addComponent(pointerComp);
    entity.addComponent(layoutComp);
    entity.addComponent(hitTestComp);

    world.addEntity(entity);

    return entity;
}
