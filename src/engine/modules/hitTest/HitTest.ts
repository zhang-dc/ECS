export enum HitTestName {
    Pointer = 'Pointer',
}

export type HitTestGroup = {
    [key: string]: string;
}

export interface Position {
    x: number;
    y: number;
}
