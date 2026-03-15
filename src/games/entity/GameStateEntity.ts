/**
 * 游戏状态实体
 * 将所有游戏组件挂载到 ECS Entity 上
 */
import { Entity } from '../../engine/Entity';
import { Stage } from '../../engine/Stage';
import { EntityName } from '../interface/Entity';
import { TimeComponent } from '../components/TimeComponent';
import { IndicatorComponent } from '../components/IndicatorComponent';
import { ResourceComponent } from '../components/ResourceComponent';
import { PopulationComponent } from '../components/PopulationComponent';

export interface InitGameStateEntityProps {
    world: Stage;
}

/**
 * 创建游戏状态实体，将核心组件注册到 ECS
 */
export function initGameStateEntity(props: InitGameStateEntityProps) {
    const { world } = props;

    const entity = new Entity({
        name: EntityName.Village,
        world,
    });

    // 时间组件
    const timeComponent = new TimeComponent({});
    entity.addComponent(timeComponent);

    // 指标组件
    const indicatorComponent = new IndicatorComponent({});
    entity.addComponent(indicatorComponent);

    // 资源组件
    const resourceComponent = new ResourceComponent({});
    entity.addComponent(resourceComponent);

    // 人口组件
    const populationComponent = new PopulationComponent({});
    entity.addComponent(populationComponent);

    world.addEntity(entity);

    return entity;
}
