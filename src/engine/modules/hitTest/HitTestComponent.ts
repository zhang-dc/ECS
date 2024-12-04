import { BaseComponent, BaseComponentProps } from '../../Component';
import { HitTestName } from './HitTest';

export enum HitTestType {
    Point,
    Rect,
    Circle,
    Polygon,
    Line,
}

export interface BaseHitTestProps {
    /** 偏移 */
    offset: [number, number];
}

export interface PointHitTestProps extends BaseHitTestProps {
}

export interface RectHitTestProps extends BaseHitTestProps {
    size: [number, number];
}

export interface CircleHitTestProps extends BaseHitTestProps {
    radius: number;
}

export interface PolygonHitTestProps extends BaseHitTestProps {
    points: [number, number][];
}

export interface LineHitTestProps extends BaseHitTestProps {
    start: [number, number];
    end: [number, number];
}

export interface HitTestPropsType {
    [HitTestType.Point]: PointHitTestProps;
    [HitTestType.Rect]: RectHitTestProps;
    [HitTestType.Circle]: CircleHitTestProps;
    [HitTestType.Polygon]: PolygonHitTestProps;
    [HitTestType.Line]: LineHitTestProps;
}

export interface HitTestComponentProps<T extends HitTestType> extends BaseComponentProps {
    type: T;
    options: HitTestPropsType[T];
    name: HitTestName | string;
}

/** 碰撞检测组件，需要搭配 LayoutComponent 获取位置使用 */
export class HitTestComponent extends BaseComponent {
    data: HitTestComponentProps<HitTestType>;
    needUpdate = false;

    constructor(props: HitTestComponentProps<HitTestType>) {
        super(props);
        this.data = props;
    }
}
