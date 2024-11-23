import { BaseComponent, BaseComponentProps } from '../../Component';
import { DefaultEntityName } from '../../interface/Entity';
import { PointerButtons } from './Pointer';

export class PointerComponent extends BaseComponent {
    /**
     * 当前帧指针刚按下
     * MouseEvent.buttons https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/buttons
     */
    hasPointerDown: number = 0;
    /**
     * 当前帧指针处于按下状态
     * MouseEvent.buttons https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/buttons
     */
    isPointerDown: number = 0;
    /**
     * 指针的位置
     */
    x: number = 0;
    y: number = 0;
    /**
     * 指针是否在移动
     */
    isMoving = false;

    constructor(props: BaseComponentProps) {
        super(props);
        const {
            name = DefaultEntityName.Pointer,
        } = props;
        this.name = name;
    }

    isButtonDown(button: PointerButtons) {
        return (this.isPointerDown & button) === button;
    }
}