
/**
 * MouseEvent.buttons https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/buttons
 */
export enum PointerButtons {
    /**
     * 没有按键
     */
    NONE = 0b00000,
    /**
     * 鼠标左键
     */
    PRIMARY = 0b00001,
    /**
     * 鼠标右键
     */
    SECONDARY = 0b00010,
    /**
     * 鼠标滚轮或者是中键
     */
    AUXILIARY = 0b00100,
    /**
     * 第四按键 (浏览器后退)
     */
    FOURTH = 0b01000,
    /**
     * 第五按键 (浏览器前进)
     */
    FIFTH = 0b10000,
    /**
     * 任意按键
     */
    ALL = 0b11111,
}
