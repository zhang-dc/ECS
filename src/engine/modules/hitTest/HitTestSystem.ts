import { Entity } from '../../Entity';
import { System, SystemClass, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { LayoutComponent } from '../layout/LayoutComponent';
import { PointerSystem } from '../pointer/PointerSystem';
import { HitTestGroup, HitTestName, Position } from './HitTest';
import { HitTestComponent, HitTestComponentProps, HitTestType, PointHitTestProps, RectHitTestProps } from './HitTestComponent';
import { HitTestEvent } from './HitTestEvent';

export interface HitTestSystemProps extends SystemProps {
    hitTestOptions?: {
        hitTestGroup?: HitTestGroup;
        extendHitTestGroup: HitTestGroup;
    }
}

export class HitTestSystem extends System {
    static after: SystemClass[] = [PointerSystem];
    eventManager?: EventManager;
    /** 可以碰撞检测的组件类型 */
    hitTestGroup: HitTestGroup = {
        [HitTestName.Viewport]: HitTestName.ANY_HIT_TEST_ENTITY,
    };
    /** 不同 name 的碰撞检测组件 */
    hitTestCompMap: Map<string, HitTestComponent[]> = new Map();
    /** 所有的碰撞检测组件 */
    hitTestCompList: HitTestComponent[] = [];
    /** */
    hitTestCache: [] = [];

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
            list = list.filter(c => c!== comp);
            this.hitTestCompMap.set(name, list);
            this.hitTestCompList = this.hitTestCompList.filter(c => c!== comp);
        });
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
    }

    update(): void {
        this.checkHitTest();
    }

    checkHitTest() {
        const nameAList = Object.keys(this.hitTestGroup);
        nameAList.forEach(nameA => {
            const nameB = this.hitTestGroup[nameA];
            if (!nameB) {
                return;
            }
            const listA = this.hitTestCompMap.get(nameA);
            // console.log(nameA, listA);
            let listB = this.hitTestCompMap.get(nameB) ?? [];
            if (nameB === HitTestName.ANY_HIT_TEST_ENTITY) {
                listB = this.hitTestCompList;
            }
            // console.log(nameB, nameB);
            if (!listA?.length || !listB?.length) {
                return;
            }
            listA.forEach(compA => {
                listB.forEach(compB => {
                    this.hitTestByType({
                        compA,
                        compB,
                    });
                });
            });
        });
    }

    hitTestByType(props: {
        compA: HitTestComponent,
        compB: HitTestComponent,
    }) {
        const { compA, compB } = props;
        const { options: optionsA, type: typeA } = compA.data;
        const { options: optionsB, type: typeB } = compB.data;
        // 通过 World 反向查找 Component 所属的 Entity
        const entityA = this.world.getEntityByComponent(compA);
        const entityB = this.world.getEntityByComponent(compB);
        if (!entityA || !entityB) {
            return;
        }
        const { offset: offsetA } = optionsA;
        const { offset: offsetB } = optionsB;
        const posA = entityA.getComponent(LayoutComponent);
        const posB = entityB.getComponent(LayoutComponent);
        if (!posA || !posB) {
            return;
        }
        const hitTestPosA = {
            x: posA.x + offsetA[0],
            y: posA.y + offsetA[1],
        };
        const hitTestPosB = {
            x: posB.x + offsetB[0],
            y: posB.y + offsetB[1],
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
        // console.log(point.position, rect.position);
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
        // 判断是否相交
        const xNotHit = rectBLeft > rectARight || rectALeft > rectBRight;
        const yNotHIt = rectABottom < rectBTop || rectBBottom < rectATop;
        if (!(xNotHit || yNotHIt)) {
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
