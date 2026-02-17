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
import { SelectionState } from './SelectionState';
import { SelectionRenderSystem } from './SelectionRenderSystem';

/** 手柄点击容差（屏幕像素） */
const HANDLE_HIT_TOLERANCE = 12;

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

    /** 是否正在 resize */
    isResizing = false;

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

        // 处理 resize 拖拽中
        if (this.isResizing) {
            this.handleResizing();
            if (this.pointerComponent.hasPointerUp) {
                this.handleResizeEnd();
            }
            return;
        }

        // 检测手柄悬停（光标跟随）
        this.updateHoverCursor();

        // 检测是否点击了手柄
        if (this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) {
            this.checkHandleHit();
        }
    }

    // ==================== 手柄检测 ====================

    private checkHandleHit(): void {
        if (!this.selectionRenderSystem || !this.pointerComponent || !this.viewportComponent) return;

        const handles = this.selectionRenderSystem.handles;
        if (handles.length === 0) return;

        const scale = this.viewportComponent.scale;
        const tolerance = HANDLE_HIT_TOLERANCE / scale;
        const px = this.pointerComponent.x;
        const py = this.pointerComponent.y;

        for (const handle of handles) {
            if (Math.abs(px - handle.x) < tolerance && Math.abs(py - handle.y) < tolerance) {
                this.startResize(handle.type);
                return;
            }
        }
    }

    private startResize(handleType: string): void {
        if (!this.selectionState || !this.pointerComponent) return;

        const selected = this.selectionState.getSelectedArray();
        if (selected.length === 0) return;

        // 快照每个实体的起始状态
        this.entitySnapshots = [];
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

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

        const dx = this.pointerComponent.x - this.startPointerX;
        const dy = this.pointerComponent.y - this.startPointerY;

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

            // Alt 中心对称模式：先取整尺寸，再从固定中心反算位置，避免手柄抖动
            let roundedX: number, roundedY: number, roundedW: number, roundedH: number;
            if (altDown) {
                roundedW = Math.round(entityNewW);
                roundedH = Math.round(entityNewH);
                const snapshotCX = snapshot.x + snapshot.width / 2;
                const snapshotCY = snapshot.y + snapshot.height / 2;
                roundedX = Math.round(snapshotCX - roundedW / 2);
                roundedY = Math.round(snapshotCY - roundedH / 2);
            } else {
                roundedX = Math.round(entityNewX);
                roundedY = Math.round(entityNewY);
                roundedW = Math.round(entityNewW);
                roundedH = Math.round(entityNewH);
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

            layoutComp.x = roundedX - parentWorldX;
            layoutComp.y = roundedY - parentWorldY;
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

    /** 每帧检测鼠标是否悬停在手柄上，更新光标 */
    private updateHoverCursor(): void {
        if (!this.selectionRenderSystem || !this.pointerComponent || !this.viewportComponent) {
            this.resetCursor();
            return;
        }

        const handles = this.selectionRenderSystem.handles;
        if (handles.length === 0) {
            this.resetCursor();
            return;
        }

        const scale = this.viewportComponent.scale;
        const tolerance = HANDLE_HIT_TOLERANCE / scale;
        const px = this.pointerComponent.x;
        const py = this.pointerComponent.y;

        let foundHandle: string | null = null;
        let foundCursor: string | null = null;

        for (const handle of handles) {
            if (Math.abs(px - handle.x) < tolerance && Math.abs(py - handle.y) < tolerance) {
                foundHandle = handle.type;
                foundCursor = handle.cursor;
                break;
            }
        }

        if (foundHandle !== this.hoveredHandle) {
            this.hoveredHandle = foundHandle;
            if (this.mask) {
                this.mask.style.cursor = foundCursor ?? '';
            }
        }
    }

    private resetCursor(): void {
        if (this.hoveredHandle !== null) {
            this.hoveredHandle = null;
            if (this.mask) {
                this.mask.style.cursor = '';
            }
        }
    }
}
