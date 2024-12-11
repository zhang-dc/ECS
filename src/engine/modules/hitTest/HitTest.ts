export enum HitTestName {
    ANY_HIT_TEST_ENTITY = 'ANY_HIT_TEST_ENTITY',
    Viewport = 'Viewport',
    Pointer = 'Pointer',
    Renderer = 'Renderer',
}

export type HitTestGroup = {
    [key: string]: string;
}

export interface Position {
    x: number;
    y: number;
}
