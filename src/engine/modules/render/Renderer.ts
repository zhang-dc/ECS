import { Entity } from '../../Entity';
import { RenderComponent } from './RenderComponent';
import { LineRenderer } from './LineRenderer';
import { RectRenderer } from './RectRenderer';
import { SpriteRenderer } from './SpriteRenderer';

export const RenderComType = [
    // 基类
    RenderComponent,
    // 子类
    LineRenderer,
    RectRenderer,
    SpriteRenderer,
];

export function getRenderComponents(entity: Entity) {
    const components = RenderComType.reduce((acc: RenderComponent[], type) => {
        const comps = entity.getComponents(type);
        acc.push(...comps);
        return acc;
    }, []);
    return components;
}

export function getAllRendersInEntity(entity: Entity) {
    const renderers: RenderComponent[] = [];
    const entities: Entity[] = [entity];
    for (let entity of entities) {
        const { children } = entity;
        if (children.length) {
            entities.push(...children);
        }
        const renders = getRenderComponents(entity);
        renderers.push(...renders);
    }
    return renderers;
}
