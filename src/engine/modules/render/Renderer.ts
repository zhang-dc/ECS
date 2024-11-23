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
