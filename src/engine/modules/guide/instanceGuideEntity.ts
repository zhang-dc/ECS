import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { Stage } from '../../Stage';
import { GuideComponent, GuideComponentProps } from './GuideComponent';

export interface InstanceGuideEntityProps {
    world: Stage;
    guideOptions?: Omit<GuideComponentProps, 'name'>;
}

export function instanceGuideEntity(props: InstanceGuideEntityProps) {
    const { world, guideOptions } = props;

    const entity = new Entity({
        name: DefaultEntityName.Guide,
        world,
    });

    const guideComponent = new GuideComponent({
        ...guideOptions,
    });

    entity.addComponent(guideComponent);
    world.addEntity(entity);

    return entity;
}
