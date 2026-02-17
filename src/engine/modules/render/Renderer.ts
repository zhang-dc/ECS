import { Entity } from '../../Entity';
import { RenderComponent } from './RenderComponent';
import { ConnectionRenderer } from './ConnectionRenderer';
import { LineRenderer } from './LineRenderer';
import { RectRenderer } from './RectRenderer';
import { RichTextRenderer } from './RichTextRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { TextRenderer } from './TextRenderer';

export const RenderComType = [
    // 基类
    RenderComponent,
    // 子类
    LineRenderer,
    RectRenderer,
    TextRenderer,
    RichTextRenderer,
    ShapeRenderer,
    ConnectionRenderer,
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
