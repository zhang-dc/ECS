import { Entity } from '../../Entity';
import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../hitTest/HitTestComponent';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { LayoutComponent, getWorldAABB } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { PointerButtons } from '../pointer/Pointer';
import { PointerComponent } from '../pointer/PointerComponent';
import { ShapeRenderer } from '../render/ShapeRenderer';
import { ToolComponent } from '../tool/ToolComponent';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { DefaultEntityName } from '../../interface/Entity';
import { CursorComponent, CursorPriority } from '../cursor/CursorComponent';
import { SelectionState } from './SelectionState';
import { SelectionRenderSystem } from './SelectionRenderSystem';

/** 手柄点击容差（屏幕像素） */
const HANDLE_HIT_TOLERANCE = 12;
/** 旋转区域外侧容差（屏幕像素） */
const ROTATE_OUTER_TOLERANCE = HANDLE_HIT_TOLERANCE * 2.5;
/** 角手柄类型集合 */
const CORNER_TYPES = new Set(['tl', 'tr', 'br', 'bl']);
/** 旋转光标 SVG（base64 内联） */
const ROTATE_CURSOR_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.5 2v6h-6'/%3E%3Cpath d='M21.34 13.72A10 10 0 1 1 18.57 4.53L21.5 2'/%3E%3C/svg%3E") 12 12, auto`;

/** 最小尺寸（防止完全塌缩为 0） */
const MIN_SIZE = 1;

/**
 * 手柄方向定义
 * signX/signY: 拖拽 dx/dy 对宽/高的影响方向
 *   +1 = dx 增大 -> 宽度增大（右侧/下侧手柄）
 *   -1 = dx 增大 -> 宽度减小（左侧/上侧手柄）
 *    0 = 该轴不受影响（边手柄）
 * anchorX/anchorY: 固定锚点在 startAABB 中的比例位置
 *   0 = 左/上边, 1 = 右/下边
 */
interface HandleDef {
    signX: number;
    signY: number;
    anchorX: number;
    anchorY: number;
    isCorner: boolean;
}

const HANDLE_DEFS: Record<string, HandleDef> = {
    tl: { signX: -1, signY: -1, anchorX: 1, anchorY: 1, isCorner: true },
    t:  { signX:  0, signY: -1, anchorX: 0, anchorY: 1, isCorner: false },
    tr: { signX:  1, signY: -1, anchorX: 0, anchorY: 1, isCorner: true },
    r:  { signX:  1, signY:  0, anchorX: 0, anchorY: 0, isCorner: false },
    br: { signX:  1, signY:  1, anchorX: 0, anchorY: 0, isCorner: true },
    b:  { signX:  0, signY:  1, anchorX: 0, anchorY: 0, isCorner: false },
    bl: { signX: -1, signY:  1, anchorX: 1, anchorY: 0, isCorner: true },
    l:  { signX: -1, signY:  0, anchorX: 1, anchorY: 0, isCorner: false },
};

/** 每个实体的起始快照 */
interface EntityStartSnapshot {
    entity: Entity;
    x: number;
    y: number;
    width: number;
    height: number;
    /** 初始翻转状态（用于图片纹理镜像叠加） */
    flipX: boolean;
    flipY: boolean;
}

export interface ResizeSystemProps extends SystemProps {
    mask?: HTMLDivElement;
}

/**
 * Resize 系统
 * 检测指针是否落在 resize 手柄上，拖拽时修改实体尺寸
 *
 * 支持：
 * - 单选 / 多选 resize
 * - Shift 等比缩放（角手柄）
 * - Alt 中心对称缩放
 * - Shift+Alt 组合
 * - 反向缩放（翻转）
 * - 手柄悬停光标跟随
 */
export class ResizeSystem extends System {
    private eventManager?: EventManager;
    private pointerComponent?: PointerComponent;
    private viewportComponent?: ViewportComponent;
    private keyboardComponent?: KeyboardComponent;
    private selectionState?: SelectionState;
    private toolComponent?: ToolComponent;
    private selectionRenderSystem?: SelectionRenderSystem;
    private cursorComponent?: CursorComponent;
    private mask?: HTMLDivElement;

    /** 当前正在拖拽的手柄类型 */
    private activeHandle: string | null = null;
    /** 拖拽的目标实体列表 */
    private resizeEntities: Entity[] = [];
    /** 每个实体的起始快照 */
    private entitySnapshots: EntityStartSnapshot[] = [];
    /** 组合包围盒的起始状态 */
    private startAABB = { x: 0, y: 0, width: 0, height: 0 };
    /** 拖拽开始时的指针位置 */
    private startPointerX = 0;
    private startPointerY = 0;
    /** 当前悬停的手柄（用于光标显示） */
    private hoveredHandle: string | null = null;
    /** resize 时元素的旋转角度（用于将 delta 投影到局部坐标系） */
    private resizeRotation = 0;

    /** 是否正在 resize */
    isResizing = false;
    /** 是否正在旋转 */
    private isRotating = false;
    /** 旋转开始时指针相对旋转中心的角度 */
    private rotateStartAngle = 0;
    /** 旋转开始时实体的 rotation 值 */
    private rotateStartRotation = 0;
    /** 旋转中心（世界坐标） */
    private rotateCenterX = 0;
    private rotateCenterY = 0;
    /** 旋转目标实体 */
    private rotateEntity: Entity | null = null;
    /** 旋转开始时实体的局部坐标 */
    private rotateStartX = 0;
    private rotateStartY = 0;
    /** 元素半宽半高 */
    private rotateHalfW = 0;
    private rotateHalfH = 0;
    /** 父级世界偏移 */
    private rotateParentWorldX = 0;
    private rotateParentWorldY = 0;

    constructor(props: ResizeSystemProps) {
        super(props);
        this.mask = props.mask;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.selectionState = this.world.findComponent(SelectionState);
        this.toolComponent = this.world.findComponent(ToolComponent);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
        this.cursorComponent = this.world.findComponent(CursorComponent);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);
    }

    /** 外部注入 SelectionRenderSystem 引用 */
    setSelectionRenderSystem(sys: SelectionRenderSystem): void {
        this.selectionRenderSystem = sys;
    }

    update(): void {
        if (!this.pointerComponent) return;
        // 只在 select 模式下工作
        if (this.toolComponent && this.toolComponent.mode !== 'select') {
            this.resetCursor();
            return;
        }

        // 处理旋转拖拽中
        if (this.isRotating) {
            this.cursorComponent?.setCursor(ROTATE_CURSOR_SVG, CursorPriority.ACTIVE_OPERATION);
            this.handleRotating();
            if (this.pointerComponent.hasPointerUp) {
                this.handleRotateEnd();
            }
            return;
        }

        // 处理 resize 拖拽中
        if (this.isResizing) {
            // 锁定光标为当前手柄方向
            if (this.activeHandle && this.cursorComponent && this.selectionRenderSystem) {
                const handle = this.selectionRenderSystem.handles.find(h => h.type === this.activeHandle);
                if (handle) {
                    this.cursorComponent.setCursor(handle.cursor, CursorPriority.ACTIVE_OPERATION);
                }
            }
            this.handleResizing();
            if (this.pointerComponent.hasPointerUp) {
                this.handleResizeEnd();
            }
            return;
        }

        // 检测手柄悬停（光标跟随）+ 旋转区域悬停
        this.updateHoverCursor();

        // 检测是否点击了手柄或旋转区域
        if (this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) {
            if (!this.checkHandleHit()) {
                this.checkRotateHit();
            }
        }
    }

    // ==================== 手柄检测 ====================

    /** 检测是否点击了 resize 手柄，返回是否命中 */
    private checkHandleHit(): boolean {
        if (!this.selectionRenderSystem || !this.pointerComponent || !this.viewportComponent) return false;

        const handles = this.selectionRenderSystem.handles;
        if (handles.length === 0) return false;

        const scale = this.viewportComponent.scale;
        const tolerance = HANDLE_HIT_TOLERANCE / scale;
        const px = this.pointerComponent.x;
        const py = this.pointerComponent.y;

        for (const handle of handles) {
            if (Math.abs(px - handle.x) < tolerance && Math.abs(py - handle.y) < tolerance) {
                this.startResize(handle.type);
                return true;
            }
        }
        return false;
    }

    private startResize(handleType: string): void {
        if (!this.selectionState || !this.pointerComponent) return;

        const selected = this.selectionState.getSelectedArray();
        if (selected.length === 0) return;

        // 单选旋转元素：使用实际布局尺寸（非 AABB）
        const isSingleRotated = selected.length === 1 &&
            (selected[0].getComponent(LayoutComponent)?.rotation ?? 0) !== 0;

        this.entitySnapshots = [];
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        if (isSingleRotated) {
            const entity = selected[0];
            const layoutComp = entity.getComponent(LayoutComponent)!;
            const shapeRenderer = entity.getComponent(ShapeRenderer);

            // 计算世界坐标
            let wx = layoutComp.x;
            let wy = layoutComp.y;
            let p = entity.parent;
            while (p) {
                const pl = p.getComponent(LayoutComponent);
                if (pl) { wx += pl.x; wy += pl.y; }
                p = p.parent;
            }

            this.entitySnapshots.push({
                entity,
                x: wx,
                y: wy,
                width: layoutComp.width,
                height: layoutComp.height,
                flipX: shapeRenderer?.flipX ?? false,
                flipY: shapeRenderer?.flipY ?? false,
            });
            minX = wx; minY = wy;
            maxX = wx + layoutComp.width;
            maxY = wy + layoutComp.height;
            this.resizeRotation = layoutComp.rotation;
        } else {
            this.resizeRotation = 0;
            for (const entity of selected) {
                const layoutComp = entity.getComponent(LayoutComponent);
                if (!layoutComp) continue;
                const aabb = getWorldAABB(entity);
                const shapeRenderer = entity.getComponent(ShapeRenderer);
                this.entitySnapshots.push({
                    entity,
                    x: aabb.x,
                    y: aabb.y,
                    width: aabb.width,
                    height: aabb.height,
                    flipX: shapeRenderer?.flipX ?? false,
                    flipY: shapeRenderer?.flipY ?? false,
                });
                minX = Math.min(minX, aabb.x);
                minY = Math.min(minY, aabb.y);
                maxX = Math.max(maxX, aabb.x + aabb.width);
                maxY = Math.max(maxY, aabb.y + aabb.height);
            }
        }

        if (this.entitySnapshots.length === 0) return;

        this.activeHandle = handleType;
        this.resizeEntities = selected;
        this.isResizing = true;
        this.world.isResizing = true;
        this.startAABB = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        this.startPointerX = this.pointerComponent.x;
        this.startPointerY = this.pointerComponent.y;
    }

    // ==================== 核心缩放逻辑 ====================

    private handleResizing(): void {
        if (this.resizeEntities.length === 0 || !this.activeHandle || !this.pointerComponent) return;

        const handleDef = HANDLE_DEFS[this.activeHandle];
        if (!handleDef) return;

        // 读取修饰键状态
        const shiftDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Shift) ?? false;
        const altDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Alt) ?? false;

        const rawDx = this.pointerComponent.x - this.startPointerX;
        const rawDy = this.pointerComponent.y - this.startPointerY;

        // 如果元素有旋转，将世界坐标 delta 投影到元素的局部坐标系
        let dx: number, dy: number;
        if (this.resizeRotation !== 0) {
            const cos = Math.cos(this.resizeRotation);
            const sin = Math.sin(this.resizeRotation);
            dx = rawDx * cos + rawDy * sin;
            dy = -rawDx * sin + rawDy * cos;
        } else {
            dx = rawDx;
            dy = rawDy;
        }

        // ---- Step 1: 计算组合包围盒的 raw 新尺寸 ----
        let newW = this.startAABB.width + handleDef.signX * dx;
        let newH = this.startAABB.height + handleDef.signY * dy;

        // 边手柄不影响的轴保持原始尺寸
        if (handleDef.signX === 0) newW = this.startAABB.width;
        if (handleDef.signY === 0) newH = this.startAABB.height;

        // ---- Step 2: Alt 中心对称 — 变化量翻倍 ----
        if (altDown) {
            if (handleDef.signX !== 0) {
                newW = this.startAABB.width + handleDef.signX * dx * 2;
            }
            if (handleDef.signY !== 0) {
                newH = this.startAABB.height + handleDef.signY * dy * 2;
            }
        }

        // ---- Step 3: Shift 等比缩放（仅角手柄） ----
        if (shiftDown && handleDef.isCorner && this.startAABB.height > 0) {
            const aspectRatio = this.startAABB.width / this.startAABB.height;
            if (aspectRatio > 0) {
                const absW = Math.abs(newW);
                const absH = Math.abs(newH);
                if (absW / aspectRatio > absH) {
                    newH = Math.sign(newH || 1) * absW / aspectRatio;
                } else {
                    newW = Math.sign(newW || 1) * absH * aspectRatio;
                }
            }
        }

        // ---- Step 4: 计算新的组合包围盒位置 ----
        let groupX: number;
        let groupY: number;

        if (altDown) {
            // 中心对称：以初始中心为锚点
            const cx = this.startAABB.x + this.startAABB.width / 2;
            const cy = this.startAABB.y + this.startAABB.height / 2;
            groupX = cx - newW / 2;
            groupY = cy - newH / 2;
        } else {
            // 普通模式：锚点固定
            const anchorWorldX = this.startAABB.x + this.startAABB.width * handleDef.anchorX;
            const anchorWorldY = this.startAABB.y + this.startAABB.height * handleDef.anchorY;

            if (handleDef.anchorX === 1) {
                groupX = anchorWorldX - newW;
            } else {
                groupX = anchorWorldX;
            }
            if (handleDef.anchorY === 1) {
                groupY = anchorWorldY - newH;
            } else {
                groupY = anchorWorldY;
            }
        }

        // ---- Step 5: 反向缩放（翻转） ----
        let flippedX = false;
        let flippedY = false;
        if (newW < 0) {
            groupX = groupX + newW;
            newW = Math.abs(newW);
            flippedX = true;
        }
        if (newH < 0) {
            groupY = groupY + newH;
            newH = Math.abs(newH);
            flippedY = true;
        }

        // 最小尺寸防止塌缩
        newW = Math.max(newW, MIN_SIZE);
        newH = Math.max(newH, MIN_SIZE);

        // ---- Step 6: 将组合变换映射到每个实体 ----
        const scaleX = this.startAABB.width > 0 ? newW / this.startAABB.width : 1;
        const scaleY = this.startAABB.height > 0 ? newH / this.startAABB.height : 1;

        const updatedEntities: Entity[] = [];

        for (const snapshot of this.entitySnapshots) {
            const layoutComp = snapshot.entity.getComponent(LayoutComponent);
            if (!layoutComp) continue;

            // 实体在组合包围盒中的相对位置和尺寸
            const relX = snapshot.x - this.startAABB.x;
            const relY = snapshot.y - this.startAABB.y;

            const entityNewX = groupX + relX * scaleX;
            const entityNewY = groupY + relY * scaleY;
            const entityNewW = Math.max(snapshot.width * scaleX, MIN_SIZE);
            const entityNewH = Math.max(snapshot.height * scaleY, MIN_SIZE);

            // 统一取整逻辑：先取整尺寸，再基于固定锚点反算位置，避免位置和尺寸分别取整导致抖动
            let roundedX: number, roundedY: number, roundedW: number, roundedH: number;
            if (altDown) {
                // Alt 中心对称模式
                roundedW = Math.round(entityNewW);
                roundedH = Math.round(entityNewH);
                const snapshotCX = snapshot.x + snapshot.width / 2;
                const snapshotCY = snapshot.y + snapshot.height / 2;
                roundedX = Math.round(snapshotCX - roundedW / 2);
                roundedY = Math.round(snapshotCY - roundedH / 2);
            } else {
                // 普通模式：先取整尺寸，再基于锚点反算位置
                roundedW = Math.round(entityNewW);
                roundedH = Math.round(entityNewH);
                // 基于原始锚点比例计算位置
                const anchorX = handleDef.anchorX;
                const anchorY = handleDef.anchorY;
                roundedX = Math.round(entityNewX - (roundedW - entityNewW) * anchorX);
                roundedY = Math.round(entityNewY - (roundedH - entityNewH) * anchorY);
            }

            // 将世界坐标转换为局部坐标（减去父级链的世界偏移）
            // 对于没有父级的普通实体，parentWorldX/Y 为 0，不影响行为
            let parentWorldX = 0, parentWorldY = 0;
            let p = snapshot.entity.parent;
            while (p) {
                const pl = p.getComponent(LayoutComponent);
                if (pl) { parentWorldX += pl.x; parentWorldY += pl.y; }
                p = p.parent;
            }

            // 旋转元素：需要从局部空间坐标转回世界空间（考虑旋转对锚点的影响）
            if (this.resizeRotation !== 0 && this.entitySnapshots.length === 1) {
                const rot = layoutComp.rotation;
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);

                // 锚点在新局部矩形中的偏移
                const anchorLocalX = roundedW * handleDef.anchorX;
                const anchorLocalY = roundedH * handleDef.anchorY;

                // 锚点在旧局部矩形中的偏移
                const oldAnchorLocalX = snapshot.width * handleDef.anchorX;
                const oldAnchorLocalY = snapshot.height * handleDef.anchorY;

                // 旧锚点的世界坐标 = snapshot.(x,y) + rotate(oldAnchorLocal)
                const oldAnchorWorldX = snapshot.x + oldAnchorLocalX * cosR - oldAnchorLocalY * sinR;
                const oldAnchorWorldY = snapshot.y + oldAnchorLocalX * sinR + oldAnchorLocalY * cosR;

                // 新的 (x,y) = 旧锚点世界坐标 - rotate(新锚点局部偏移)
                const newWorldX = oldAnchorWorldX - (anchorLocalX * cosR - anchorLocalY * sinR);
                const newWorldY = oldAnchorWorldY - (anchorLocalX * sinR + anchorLocalY * cosR);

                layoutComp.x = newWorldX - parentWorldX;
                layoutComp.y = newWorldY - parentWorldY;
            } else {
                layoutComp.x = roundedX - parentWorldX;
                layoutComp.y = roundedY - parentWorldY;
            }
            layoutComp.width = roundedW;
            layoutComp.height = roundedH;
            layoutComp.dirty = true;

            // 更新 HitTestComponent
            const hitTestComp = snapshot.entity.getComponent(HitTestComponent);
            if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                const rectOpts = hitTestComp.data.options as RectHitTestProps;
                rectOpts.size = [roundedW, roundedH];
            }

            // 更新 ShapeRenderer
            const shapeRenderer = snapshot.entity.getComponent(ShapeRenderer);
            if (shapeRenderer) {
                shapeRenderer.updateSize(roundedW, roundedH);
                // 图片纹理翻转：当前翻转状态与初始翻转状态 XOR
                if (shapeRenderer.fillTextureSource) {
                    shapeRenderer.setFlip(
                        flippedX !== snapshot.flipX,
                        flippedY !== snapshot.flipY,
                    );
                }
            }

            updatedEntities.push(snapshot.entity);
        }

        // 触发布局更新
        if (this.eventManager && updatedEntities.length > 0) {
            const layoutEvent = new LayoutEvent({
                data: { entities: updatedEntities },
            });
            this.eventManager.sendEvent(layoutEvent);
        }
    }

    // ==================== 旋转 ====================

    /** 检测是否点击了角手柄外侧的旋转区域 */
    private checkRotateHit(): void {
        if (!this.selectionRenderSystem || !this.pointerComponent || !this.viewportComponent) return;
        if (!this.selectionState) return;

        // 仅单选支持旋转
        const selected = this.selectionState.getSelectedArray();
        if (selected.length !== 1) return;

        const handles = this.selectionRenderSystem.handles;
        if (handles.length === 0) return;

        const scale = this.viewportComponent.scale;
        const tolerance = HANDLE_HIT_TOLERANCE / scale;
        const outerTolerance = ROTATE_OUTER_TOLERANCE / scale;
        const px = this.pointerComponent.x;
        const py = this.pointerComponent.y;

        for (const handle of handles) {
            if (!CORNER_TYPES.has(handle.type)) continue;
            const dist = Math.max(Math.abs(px - handle.x), Math.abs(py - handle.y));
            if (dist >= tolerance && dist < outerTolerance) {
                this.startRotation(selected[0]);
                return;
            }
        }
    }

    private startRotation(entity: Entity): void {
        if (!this.pointerComponent) return;

        const layout = entity.getComponent(LayoutComponent);
        if (!layout) return;

        // 记录初始局部坐标
        this.rotateStartX = layout.x;
        this.rotateStartY = layout.y;
        this.rotateHalfW = layout.width / 2;
        this.rotateHalfH = layout.height / 2;

        // 计算父级世界偏移
        this.rotateParentWorldX = 0;
        this.rotateParentWorldY = 0;
        let p = entity.parent;
        while (p) {
            const pl = p.getComponent(LayoutComponent);
            if (pl) {
                this.rotateParentWorldX += pl.x;
                this.rotateParentWorldY += pl.y;
            }
            p = p.parent;
        }

        // 旋转中心 = 元素中心的世界坐标
        // 当前旋转角度下，中心相对于 (x,y) 的偏移需要考虑已有旋转
        const cos0 = Math.cos(layout.rotation);
        const sin0 = Math.sin(layout.rotation);
        const worldX = this.rotateStartX + this.rotateParentWorldX;
        const worldY = this.rotateStartY + this.rotateParentWorldY;
        this.rotateCenterX = worldX + this.rotateHalfW * cos0 - this.rotateHalfH * sin0;
        this.rotateCenterY = worldY + this.rotateHalfW * sin0 + this.rotateHalfH * cos0;

        const dx = this.pointerComponent.x - this.rotateCenterX;
        const dy = this.pointerComponent.y - this.rotateCenterY;
        this.rotateStartAngle = Math.atan2(dy, dx);
        this.rotateStartRotation = layout.rotation;

        this.rotateEntity = entity;
        this.isRotating = true;
        this.world.isResizing = true;
    }

    private handleRotating(): void {
        if (!this.rotateEntity || !this.pointerComponent) return;

        const layout = this.rotateEntity.getComponent(LayoutComponent);
        if (!layout) return;

        const dx = this.pointerComponent.x - this.rotateCenterX;
        const dy = this.pointerComponent.y - this.rotateCenterY;
        const currentAngle = Math.atan2(dy, dx);
        let deltaAngle = currentAngle - this.rotateStartAngle;

        // Shift 约束：15° 步进
        const shiftDown = this.keyboardComponent?.isKeyDown(KeyboardKey.Shift) ?? false;
        if (shiftDown) {
            const totalAngle = this.rotateStartRotation + deltaAngle;
            const step = Math.PI / 12; // 15°
            const snapped = Math.round(totalAngle / step) * step;
            deltaAngle = snapped - this.rotateStartRotation;
        }

        const newRotation = this.rotateStartRotation + deltaAngle;

        // 调整 x/y 使元素中心保持不动
        // Pixi 绕 (x,y) 旋转，旋转后中心 = (x + halfW*cos - halfH*sin, y + halfW*sin + halfH*cos)
        // 令旋转后中心 = rotateCenterX/Y，反算 x/y
        const cosR = Math.cos(newRotation);
        const sinR = Math.sin(newRotation);
        const newWorldX = this.rotateCenterX - (this.rotateHalfW * cosR - this.rotateHalfH * sinR);
        const newWorldY = this.rotateCenterY - (this.rotateHalfW * sinR + this.rotateHalfH * cosR);

        layout.x = newWorldX - this.rotateParentWorldX;
        layout.y = newWorldY - this.rotateParentWorldY;
        layout.rotation = newRotation;
        layout.dirty = true;

        // 触发布局更新
        if (this.eventManager) {
            const layoutEvent = new LayoutEvent({
                data: { entities: [this.rotateEntity] },
            });
            this.eventManager.sendEvent(layoutEvent);
        }
    }

    private handleRotateEnd(): void {
        if (this.rotateEntity) {
            this.world.emit(StageEvents.ENTITY_MOVE, {
                entities: [this.rotateEntity.name],
            });
        }
        this.rotateEntity = null;
        this.isRotating = false;
        this.world.isResizing = false;
    }

    // ==================== 结束 ====================

    private handleResizeEnd(): void {
        if (this.resizeEntities.length > 0) {
            this.world.emit(StageEvents.ENTITY_MOVE, {
                entities: this.resizeEntities.map(e => e.name),
            });
        }
        this.activeHandle = null;
        this.resizeEntities = [];
        this.entitySnapshots = [];
        this.isResizing = false;
        this.world.isResizing = false;
    }

    // ==================== 光标跟随 ====================

    /** 每帧检测鼠标是否悬停在手柄或旋转区域上，通过 CursorComponent 声明光标需求 */
    private updateHoverCursor(): void {
        if (!this.selectionRenderSystem || !this.pointerComponent || !this.viewportComponent) {
            this.hoveredHandle = null;
            return;
        }

        const handles = this.selectionRenderSystem.handles;
        if (handles.length === 0) {
            this.hoveredHandle = null;
            return;
        }

        const scale = this.viewportComponent.scale;
        const tolerance = HANDLE_HIT_TOLERANCE / scale;
        const px = this.pointerComponent.x;
        const py = this.pointerComponent.y;

        // 先检测 resize 手柄
        let foundHandle: string | null = null;
        let foundCursor: string | null = null;

        for (const handle of handles) {
            if (Math.abs(px - handle.x) < tolerance && Math.abs(py - handle.y) < tolerance) {
                foundHandle = handle.type;
                foundCursor = handle.cursor;
                break;
            }
        }

        this.hoveredHandle = foundHandle;

        if (foundCursor && this.cursorComponent) {
            this.cursorComponent.setCursor(foundCursor, CursorPriority.HOVER_HANDLE);
            return;
        }

        // 未命中 resize 手柄，检测角手柄外侧旋转区域（仅单选）
        const selected = this.selectionState?.getSelectedArray();
        if (selected && selected.length === 1) {
            const outerTolerance = ROTATE_OUTER_TOLERANCE / scale;
            for (const handle of handles) {
                if (!CORNER_TYPES.has(handle.type)) continue;
                const dist = Math.max(Math.abs(px - handle.x), Math.abs(py - handle.y));
                if (dist >= tolerance && dist < outerTolerance) {
                    this.cursorComponent?.setCursor(ROTATE_CURSOR_SVG, CursorPriority.HOVER_HANDLE);
                    return;
                }
            }
        }
    }

    private resetCursor(): void {
        this.hoveredHandle = null;
    }
}
