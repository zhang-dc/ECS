import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { PointerButtons } from '../pointer/Pointer';
import { SelectComponent } from '../select/SelectComponent';
import { SelectionState } from '../select/SelectionState';
import { ToolComponent, ToolMode } from '../tool/ToolComponent';
import { CursorComponent, CursorPriority } from './CursorComponent';

/** 工具模式对应的默认光标 */
const TOOL_CURSORS: Record<ToolMode, string> = {
    select: 'default',
    hand: 'grab',
    rect: 'crosshair',
    circle: 'crosshair',
    text: 'text',
    image: 'crosshair',
    mindmap: 'crosshair',
};

export interface CursorSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

/**
 * 光标管理系统
 * 在所有其他系统之后运行，统一决策并写入 DOM
 *
 * 职责：
 * 1. 设置工具默认光标
 * 2. 检测实体悬停（读取 HitTestEvent）
 * 3. 汇总各系统的光标请求
 * 4. resolve 最高优先级并写入 mask.style.cursor
 */
export class CursorSystem extends System {
    private mask: HTMLDivElement;
    private cursorComponent!: CursorComponent;
    private eventManager?: EventManager;
    private pointerComponent?: PointerComponent;
    private toolComponent?: ToolComponent;
    private selectionState?: SelectionState;

    constructor(props: CursorSystemProps) {
        super(props);
        this.mask = props.mask;

        // 创建 CursorComponent 并注册到 world
        const cursorEntity = new Entity({ name: 'Cursor', world: this.world });
        this.cursorComponent = new CursorComponent({ name: 'CursorComponent' });
        cursorEntity.addComponent(this.cursorComponent);
        this.world.addEntity(cursorEntity);
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        this.toolComponent = this.world.findComponent(ToolComponent);
        this.selectionState = this.world.findComponent(SelectionState);
    }

    update(): void {
        // 1. 工具默认光标
        this.setToolDefaultCursor();

        // 2. 实体悬停检测（仅 select 模式且无活跃操作）
        this.detectEntityHover();

        // 3. resolve 并写入 DOM
        const resolved = this.cursorComponent.resolve();
        const current = this.cursorComponent.getCurrentCursor();

        if (resolved !== current) {
            this.mask.style.cursor = resolved;
            this.cursorComponent.setCurrentCursor(resolved);
        }

        // 清空本帧请求
        this.cursorComponent.clear();
    }

    private setToolDefaultCursor(): void {
        if (!this.toolComponent) return;

        const mode = this.toolComponent.mode;
        const cursor = TOOL_CURSORS[mode] ?? 'default';
        this.cursorComponent.setCursor(cursor, CursorPriority.TOOL_DEFAULT);

        // Hand 工具拖拽中 → grabbing
        if (mode === 'hand' && this.pointerComponent?.isButtonDown(PointerButtons.PRIMARY)) {
            this.cursorComponent.setCursor('grabbing', CursorPriority.ACTIVE_OPERATION);
        }

        // 绘制中 → crosshair
        if (this.toolComponent.isDrawing) {
            this.cursorComponent.setCursor('crosshair', CursorPriority.ACTIVE_OPERATION);
        }
    }

    /**
     * 检测指针是否悬停在可选择实体上
     * 仅在 select 模式 + 无活跃操作时生效
     */
    private detectEntityHover(): void {
        if (!this.toolComponent || this.toolComponent.mode !== 'select') return;
        if (this.world.isDragging || this.world.isResizing || this.world.isTextEditing) return;

        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        if (!hitTestEvents?.length) return;

        for (const event of hitTestEvents) {
            const { entityA, entityB } = event;
            let candidate: Entity | null = null;

            if (entityA.name === DefaultEntityName.Pointer) {
                candidate = entityB;
            } else if (entityB.name === DefaultEntityName.Pointer) {
                candidate = entityA;
            }

            if (candidate) {
                const selectComp = candidate.getComponent(SelectComponent);
                if (selectComp?.selectable) {
                    this.cursorComponent.setCursor('move', CursorPriority.HOVER_ENTITY);
                    return;
                }
            }
        }
    }
}
