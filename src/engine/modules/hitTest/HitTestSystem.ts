import { Entity } from '../../Entity';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent } from '../layout/LayoutComponent';
import { HitTestGroup, HitTestName, Position } from './HitTest';
import { HitTestComponent, HitTestType, PointHitTestProps, RectHitTestProps } from './HitTestComponent';
import { HitTestEvent } from './HitTestEvent';
import { QuadTree, AABB } from './QuadTree';

export interface HitTestSystemProps extends SystemProps {
    hitTestOptions?: {
        hitTestGroup?: HitTestGroup;
        extendHitTestGroup: HitTestGroup;
    }
}

/** 四叉树的世界范围（足够大以覆盖无边画布） */
const WORLD_BOUNDS: AABB = {
    x: -1000000,
    y: -1000000,
    width: 2000000,
    height: 2000000,
};

export class HitTestSystem extends System {
    eventManager?: EventManager;
    /** 可以碰撞检测的组件类型 */
    hitTestGroup: HitTestGroup = {
        [HitTestName.Viewport]: HitTestName.ANY_HIT_TEST_ENTITY,
    };
    /** 不同 name 的碰撞检测组件 */
    hitTestCompMap: Map<string, HitTestComponent[]> = new Map();
    /** 所有的碰撞检测组件 */
    hitTestCompList: HitTestComponent[] = [];
    /** 空间索引四叉树 */
    quadTree: QuadTree<HitTestComponent>;

    constructor(props: HitTestSystemProps) {
        super(props);
        const { extendHitTestGroup, hitTestGroup } = props.hitTestOptions ?? {};
        if (hitTestGroup) {
            this.hitTestGroup = hitTestGroup;
        }
        if (extendHitTestGroup) {
            this.hitTestGroup = {
                ...this.hitTestGroup,
                ...extendHitTestGroup,
            };
        }
        this.quadTree = new QuadTree<HitTestComponent>(WORLD_BOUNDS);

        this.world.addComponentAddedListener(HitTestComponent, (type, comp) => {
            const { name } = comp.data;
            const list = this.hitTestCompMap.get(name) ?? [];
            list.push(comp);
            this.hitTestCompMap.set(name, list);
            this.hitTestCompList.push(comp);
        });
        this.world.addComponentRemovedListener(HitTestComponent, (type, comp) => {
            const { name } = comp.data;
            let list = this.hitTestCompMap.get(name) ?? [];
            list = list.filter(c => c !== comp);
            this.hitTestCompMap.set(name, list);
            this.hitTestCompList = this.hitTestCompList.filter(c => c !== comp);
        });
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        this.rebuildQuadTree();
        this.checkHitTest();
    }

    /** 每帧重建四叉树 */
    rebuildQuadTree() {
        this.quadTree.clear();
        this.hitTestCompList.forEach(comp => {
            if (!comp.entity) return;
            const layout = comp.entity.getComponent(LayoutComponent);
            if (!layout) return;

            const { offset } = comp.data.options;
            const bounds = this.getCompBounds(comp, layout, offset);
            if (bounds) {
                this.quadTree.insert({ bounds, data: comp });
            }
        });
    }

    /** 获取实体的世界坐标（遍历父级链累加局部坐标） */
    private getWorldXY(entity: Entity, layout: LayoutComponent): { x: number; y: number } {
        let wx = layout.x;
        let wy = layout.y;
        let parent = entity.parent;
        while (parent) {
            const pl = parent.getComponent(LayoutComponent);
            if (pl) {
                wx += pl.x;
                wy += pl.y;
            }
            parent = parent.parent;
        }
        return { x: wx, y: wy };
    }

    /** 获取碰撞组件的 AABB（使用世界坐标） */
    getCompBounds(comp: HitTestComponent, layout: LayoutComponent, offset: [number, number]): AABB | null {
        const { type, options } = comp.data;
        const entity = comp.entity;
        if (!entity) return null;

        const worldPos = this.getWorldXY(entity, layout);
        const x = worldPos.x + offset[0];
        const y = worldPos.y + offset[1];

        if (type === HitTestType.Point) {
            return { x, y, width: 0, height: 0 };
        }
        if (type === HitTestType.Rect) {
            const rectOpts = options as RectHitTestProps;
            return { x, y, width: rectOpts.size[0], height: rectOpts.size[1] };
        }
        return null;
    }

    checkHitTest() {
        const nameAList = Object.keys(this.hitTestGroup);
        nameAList.forEach(nameA => {
            const nameB = this.hitTestGroup[nameA];
            if (!nameB) {
                return;
            }
            const listA = this.hitTestCompMap.get(nameA);
            if (!listA?.length) {
                return;
            }

            listA.forEach(compA => {
                if (!compA.entity) return;
                const layoutA = compA.entity.getComponent(LayoutComponent);
                if (!layoutA) return;

                const { offset: offsetA } = compA.data.options;
                const boundsA = this.getCompBounds(compA, layoutA, offsetA);
                if (!boundsA) return;

                // 使用四叉树查询候选碰撞对象
                let candidates: HitTestComponent[];
                if (nameB === HitTestName.ANY_HIT_TEST_ENTITY) {
                    // 对于 ANY，扩展查询范围
                    const queryBounds = this.expandBounds(boundsA);
                    candidates = this.quadTree.query(queryBounds).map(item => item.data);
                } else {
                    candidates = this.hitTestCompMap.get(nameB) ?? [];
                }

                candidates.forEach(compB => {
                    if (compA === compB) return;
                    this.hitTestByType({ compA, compB });
                });
            });
        });
    }

    /** 扩展查询范围以确保覆盖 */
    expandBounds(bounds: AABB): AABB {
        // 对于 Point 类型，给一个最小查询范围
        if (bounds.width === 0 && bounds.height === 0) {
            return {
                x: bounds.x - 1,
                y: bounds.y - 1,
                width: 2,
                height: 2,
            };
        }
        return bounds;
    }

    hitTestByType(props: {
        compA: HitTestComponent,
        compB: HitTestComponent,
    }) {
        const { compA, compB } = props;
        const { options: optionsA, type: typeA } = compA.data;
        const { options: optionsB, type: typeB } = compB.data;
        const entityA = compA.entity;
        const entityB = compB.entity;
        if (!entityA || !entityB) {
            return;
        }
        const { offset: offsetA } = optionsA;
        const { offset: offsetB } = optionsB;
        const layoutA = entityA.getComponent(LayoutComponent);
        const layoutB = entityB.getComponent(LayoutComponent);
        if (!layoutA || !layoutB) {
            return;
        }
        const worldA = this.getWorldXY(entityA, layoutA);
        const worldB = this.getWorldXY(entityB, layoutB);
        const hitTestPosA = {
            x: worldA.x + offsetA[0],
            y: worldA.y + offsetA[1],
        };
        const hitTestPosB = {
            x: worldB.x + offsetB[0],
            y: worldB.y + offsetB[1],
        };
        if (typeA === HitTestType.Point && typeB === HitTestType.Rect) {
            this.pointInRect({
                options: optionsA,
                position: hitTestPosA,
                entity: entityA,
            }, {
                options: optionsB as RectHitTestProps,
                position: hitTestPosB,
                entity: entityB,
            });
        }
        if (typeA === HitTestType.Rect && typeB === HitTestType.Rect) {
            this.rectHitRect({
                options: optionsA as RectHitTestProps,
                position: hitTestPosA,
                entity: entityA,
            }, {
                options: optionsB as RectHitTestProps,
                position: hitTestPosB,
                entity: entityB,
            });
        }
    }

    pointInRect(point: {
        options: PointHitTestProps,
        position: Position,
        entity: Entity,
    }, rect: {
        options: RectHitTestProps,
        position: Position,
        entity: Entity,
    }) {
        const { entity: pointEntity } = point;
        const { entity: rectEntity } = rect;
        if (point.position.x >= rect.position.x && point.position.x <= rect.position.x + rect.options.size[0] &&
            point.position.y >= rect.position.y && point.position.y <= rect.position.y + rect.options.size[1]) {
            const event = new HitTestEvent({
                data: {
                    entityA: pointEntity,
                    entityB: rectEntity,
                }
            });
            this.eventManager?.sendEvent(event);
        }
    }

    rectHitRect(
        rectA: {
            options: RectHitTestProps,
            position: Position,
            entity: Entity,
        },
        rectB: {
            options: RectHitTestProps,
            position: Position,
            entity: Entity,
        },
    ) {
        const { entity: rectAEntity, options: optionsA } = rectA;
        const { entity: rectBEntity, options: optionsB } = rectB;
        if (!optionsA.size[0] || !optionsA.size[1] || !optionsB.size[0] || !optionsB.size[1]) {
            return;
        }
        const rectALeft = rectA.position.x;
        const rectARight = rectA.position.x + rectA.options.size[0];
        const rectATop = rectA.position.y;
        const rectABottom = rectA.position.y + rectA.options.size[1];
        const rectBLeft = rectB.position.x;
        const rectBRight = rectB.position.x + rectB.options.size[0];
        const rectBTop = rectB.position.y;
        const rectBBottom = rectB.position.y + rectB.options.size[1];
        const xNotHit = rectBLeft > rectARight || rectALeft > rectBRight;
        const yNotHit = rectABottom < rectBTop || rectBBottom < rectATop;
        if (!(xNotHit || yNotHit)) {
            const event = new HitTestEvent({
                data: {
                    entityA: rectAEntity,
                    entityB: rectBEntity,
                }
            });
            this.eventManager?.sendEvent(event);
        }
    }
}
