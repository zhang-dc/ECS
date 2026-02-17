import { Entity } from '../../Entity';
import { DefaultEntityName } from '../../interface/Entity';
import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { HitTestComponent, HitTestType, RectHitTestProps } from '../hitTest/HitTestComponent';
import { HitTestEvent } from '../hitTest/HitTestEvent';
import { LayoutComponent } from '../layout/LayoutComponent';
import { LayoutEvent } from '../layout/LayoutEvent';
import { PointerComponent } from '../pointer/PointerComponent';
import { PointerButtons } from '../pointer/Pointer';
import { RichTextRenderer } from '../render/RichTextRenderer';
import { ShapeRenderer } from '../render/ShapeRenderer';
import { TextRenderer } from '../render/TextRenderer';
import { ViewportComponent } from '../viewport/ViewportComponent';
import { MindMapNodeComponent } from '../mindmap/MindMapNodeComponent';
import { MindMapEvent, MindMapEventType } from '../mindmap/MindMapEvent';
import { RichTextComponent } from './RichTextComponent';
import { TextDataInterface } from '../../rich-text/interfaces/text-data';
import { Selection } from '../../rich-text/interfaces/selection';

/** 文字编辑快照（用于 undo/redo） */
interface TextEditSnapshot {
    textData: TextDataInterface;
    selection: Selection;
}

export interface TextEditSystemProps extends SystemProps {
    mask: HTMLDivElement;
}

/** 思维导图节点内边距（与 MindMapSystem 保持一致） */
const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 8;

/** 双击检测间隔（毫秒） */
const DOUBLE_CLICK_INTERVAL = 300;

/**
 * 文本编辑系统
 *
 * 完全接管编辑态的所有交互状态切换：
 * 1. 进入编辑：自行检测双击（读取 PointerComponent + HitTestEvent），不依赖 InteractEvent
 * 2. 编辑中交互：直接读取 PointerComponent 处理键盘鼠标事件
 * 3. 退出编辑：由 update() 驱动（点击空白/其他实体/Escape），不依赖 blur 事件
 *
 * - 对于 RichTextComponent 实体：使用隐藏 textarea 捕获输入 + Editor API 驱动编辑
 * - 对于旧 TextRenderer 实体（思维导图等）：保留 HTML textarea 覆盖方案
 * - 监听 TEXT_EDIT_REQUEST 事件，支持外部触发编辑
 */
export class TextEditSystem extends System {
    private mask: HTMLDivElement;
    private eventManager?: EventManager;
    private viewportComponent?: ViewportComponent;
    private pointerComponent?: PointerComponent;
    private editingEntity: Entity | null = null;
    private textarea: HTMLTextAreaElement | null = null;
    /** 待编辑的实体（延迟一帧等布局完成） */
    private pendingEditEntity: Entity | null = null;
    private pendingEditDelay: number = 0;
    /** 是否正在使用 rich-text 编辑模式 */
    private isRichTextEditing: boolean = false;
    /** 隐藏 textarea（用于 rich-text 编辑模式的 IME 输入捕获） */
    private hiddenTextarea: HTMLTextAreaElement | null = null;
    /** IME 组合输入中 */
    private isComposing: boolean = false;

    // ===== Undo/Redo 栈 =====
    private undoStack: TextEditSnapshot[] = [];
    private redoStack: TextEditSnapshot[] = [];
    private readonly MAX_UNDO_STEPS = 100;

    // ===== 自行双击检测状态 =====
    /** 上次点击的实体 */
    private lastClickEntity: Entity | null = null;
    /** 上次点击的时间戳 */
    private lastClickTime: number = 0;

    constructor(props: TextEditSystemProps) {
        super(props);
        this.mask = props.mask;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.pointerComponent = this.world.findComponent(PointerComponent);
        const viewportEntity = this.world.findEntityByName(DefaultEntityName.Viewport);
        this.viewportComponent = viewportEntity?.getComponent(ViewportComponent);

        // 监听外部编辑请求
        this.world.on(StageEvents.TEXT_EDIT_REQUEST, (entity: Entity) => {
            this.pendingEditEntity = entity;
            this.pendingEditDelay = 2;
        });
    }

    update(): void {
        // 处理延迟编辑请求
        if (this.pendingEditEntity && this.pendingEditDelay > 0) {
            this.pendingEditDelay--;
            if (this.pendingEditDelay <= 0) {
                const entity = this.pendingEditEntity;
                this.pendingEditEntity = null;
                if (this.editingEntity) {
                    this.finishEditing();
                }
                this.startEditingAny(entity);
            }
        }

        // 根据当前状态分派处理
        if (this.isRichTextEditing && this.editingEntity) {
            // ===== 编辑态：TextEditSystem 完全接管 =====
            this.handleEditingModeUpdate();
        } else {
            // ===== 非编辑态：检测双击进入编辑 =====
            this.handleIdleModeUpdate();
        }
    }

    // ==================== 非编辑态：自行检测双击 ====================

    /**
     * 非编辑态下的每帧更新：
     * 直接读取 PointerComponent 和 HitTestEvent，自行检测双击。
     * 不依赖 InteractSystem 的 DBClick 事件。
     */
    private handleIdleModeUpdate(): void {
        if (!this.pointerComponent) return;

        // 只在本帧有新的鼠标按下时检测
        if (!this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) return;

        // 从 HitTestEvent 中找到 Pointer 命中的可编辑实体
        const hitEntity = this.findHitTextEntity();

        const now = Date.now();

        if (hitEntity) {
            // 检查是否构成双击
            if (
                this.lastClickEntity === hitEntity &&
                now - this.lastClickTime < DOUBLE_CLICK_INTERVAL
            ) {
                // 双击检测成功 → 进入编辑
                this.lastClickEntity = null;
                this.lastClickTime = 0;
                if (this.editingEntity) {
                    this.finishEditing();
                }
                this.startEditingAny(hitEntity);
            } else {
                // 第一次点击，记录
                this.lastClickEntity = hitEntity;
                this.lastClickTime = now;
            }
        } else {
            // 点击了空白区域或非文字实体，重置双击状态
            this.lastClickEntity = null;
            this.lastClickTime = 0;
        }
    }

    /**
     * 从本帧的 HitTestEvent 中找到 Pointer 命中的可编辑文字实体
     * （有 RichTextComponent 或 TextRenderer 的实体）
     */
    private findHitTextEntity(): Entity | null {
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        if (!hitTestEvents?.length) return null;

        let hitEntity: Entity | null = null;

        for (const event of hitTestEvents) {
            const { entityA, entityB } = event;
            let candidate: Entity | null = null;

            if (entityA.name === DefaultEntityName.Pointer) {
                candidate = entityB;
            } else if (entityB.name === DefaultEntityName.Pointer) {
                candidate = entityA;
            }

            if (!candidate) continue;

            // 检查是否是可编辑的文字实体
            const hasRichText = candidate.getComponent(RichTextComponent);
            const hasTextRenderer = candidate.getComponent(TextRenderer);
            if (hasRichText || hasTextRenderer) {
                hitEntity = candidate;
                // 不 break，继续遍历以找到最后一个（最上层的）
            }
        }

        return hitEntity;
    }

    // ==================== 编辑态：完全接管交互 ====================

    /**
     * 编辑态下的每帧更新：
     * 1. 检测鼠标点击 → 定位光标 / 退出编辑
     * 2. 检测鼠标拖拽 → 文本选区
     * 3. 每帧重绘（光标闪烁等）
     */
    private handleEditingModeUpdate(): void {
        if (!this.editingEntity || !this.isRichTextEditing) return;

        // 处理鼠标交互（可能触发 finishEditing，清空 editingEntity）
        this.handleEditingPointerEvents();

        // finishEditing 后 editingEntity 已被清空，不再继续
        if (!this.editingEntity || !this.isRichTextEditing) return;

        // 每帧重绘（光标闪烁等）
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        const richTextRenderer = this.editingEntity.getComponent(RichTextRenderer);
        if (richTextComp && richTextRenderer) {
            richTextRenderer.drawText(richTextComp.editor);
            richTextRenderer.dirty = true;
        }

        // 同步 textarea 位置（跟随 viewport 变化，确保 IME 候选框始终在文字光标附近）
        this.syncTextareaPosition();
    }

    /**
     * 编辑态中的鼠标交互处理：
     * 直接读取 PointerComponent 和 HitTestEvent，不依赖 InteractEvent。
     */
    private handleEditingPointerEvents(): void {
        if (!this.editingEntity || !this.pointerComponent) return;

        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;
        const richTextRenderer = this.editingEntity.getComponent(RichTextRenderer);

        // 1. 本帧有新的鼠标按下
        if (this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) {
            // 检查 Pointer 命中了哪个实体
            const hitEntity = this.findHitEntity();

            if (hitEntity === this.editingEntity) {
                // 点击了当前编辑实体 → 定位光标

                // 先检查是否构成双击选词
                const now = Date.now();
                if (
                    this.lastClickEntity === this.editingEntity &&
                    now - this.lastClickTime < DOUBLE_CLICK_INTERVAL
                ) {
                    // 双击选词
                    const localPos = this.screenToLocal(this.editingEntity);
                    if (localPos) {
                        editor.selectForXY(localPos.x, localPos.y, { clickCount: 2 });
                    }
                    this.lastClickEntity = null;
                    this.lastClickTime = 0;
                } else {
                    // 单击定位光标
                    const localPos = this.screenToLocal(this.editingEntity);
                    if (localPos) {
                        editor.selectForXY(localPos.x, localPos.y, { click: true });
                        richTextRenderer?.resetCursorBlink();
                    }
                    this.lastClickEntity = this.editingEntity;
                    this.lastClickTime = now;
                }

                // 确保隐藏 textarea 保持焦点
                this.hiddenTextarea?.focus();
            } else {
                // 点击了其他实体或空白区域 → 退出编辑
                this.finishEditing();
                return;
            }
        }

        // 2. 鼠标拖拽选区
        if (this.pointerComponent.isMoving && this.pointerComponent.isButtonDown(PointerButtons.PRIMARY)) {
            const localPos = this.screenToLocal(this.editingEntity);
            if (localPos) {
                editor.selectForXY(localPos.x, localPos.y, { move: true });
            }
        }
    }

    /**
     * 从本帧的 HitTestEvent 中找到 Pointer 命中的任意实体
     * 返回 null 表示点击了空白区域
     */
    private findHitEntity(): Entity | null {
        const hitTestEvents = this.eventManager?.getEvents(HitTestEvent);
        if (!hitTestEvents?.length) return null;

        let hitEntity: Entity | null = null;

        for (const event of hitTestEvents) {
            const { entityA, entityB } = event;
            if (entityA.name === DefaultEntityName.Pointer) {
                hitEntity = entityB;
            } else if (entityB.name === DefaultEntityName.Pointer) {
                hitEntity = entityA;
            }
        }

        return hitEntity;
    }

    /**
     * 根据实体类型选择编辑方式
     */
    private startEditingAny(entity: Entity): void {
        const richTextComp = entity.getComponent(RichTextComponent);
        if (richTextComp) {
            this.startRichTextEditing(entity, richTextComp);
            return;
        }

        const textRenderer = entity.getComponent(TextRenderer);
        if (textRenderer) {
            this.startLegacyEditing(entity, textRenderer);
        }
    }

    // ==================== Rich Text 编辑模式 ====================

    private startRichTextEditing(entity: Entity, richTextComp: RichTextComponent): void {
        this.editingEntity = entity;
        this.isRichTextEditing = true;
        this.world.isTextEditing = true;

        const editor = richTextComp.editor;
        editor.isEditor = true;
        editor.selectAll();

        // 创建隐藏 textarea 用于捕获键盘输入和 IME
        // textarea 定位到文字实体的屏幕位置，以便 IME 候选框正确显示在文字附近
        const textarea = document.createElement('textarea');

        // 计算实体在屏幕上的初始位置（遍历父级链得到世界坐标）
        const layoutComp = entity.getComponent(LayoutComponent);
        const vp = this.viewportComponent;
        let initLeft = 0;
        let initTop = 0;
        if (layoutComp && vp) {
            let wx = layoutComp.x;
            let wy = layoutComp.y;
            let p = entity.parent;
            while (p) {
                const pl = p.getComponent(LayoutComponent);
                if (pl) { wx += pl.x; wy += pl.y; }
                p = p.parent;
            }
            const screenPos = vp.worldToScreen(wx, wy);
            initLeft = screenPos.x;
            initTop = screenPos.y;
        }

        // 获取编辑器字号，影响 IME 候选框大小
        const editorFontSize = Math.round(editor.style.fontSize * (vp?.scale ?? 1));

        textarea.style.cssText = `
            position: absolute;
            left: ${initLeft}px;
            top: ${initTop}px;
            width: 1px;
            height: ${editorFontSize}px;
            font-size: ${editorFontSize}px;
            opacity: 0;
            z-index: 0;
            pointer-events: none;
            border: none;
            outline: none;
            resize: none;
            overflow: hidden;
            padding: 0;
            margin: 0;
        `;
        this.mask.appendChild(textarea);
        this.hiddenTextarea = textarea;

        // 键盘事件处理
        textarea.addEventListener('keydown', this.handleRichTextKeyDown);
        textarea.addEventListener('input', this.handleRichTextInput);
        textarea.addEventListener('compositionstart', this.handleCompositionStart);
        textarea.addEventListener('compositionend', this.handleCompositionEnd);

        // 延迟 focus：确保 DOM 插入完成后再 focus
        requestAnimationFrame(() => {
            if (this.hiddenTextarea && this.isRichTextEditing) {
                this.hiddenTextarea.focus();
            }
        });

        // 重置光标闪烁
        const richTextRenderer = entity.getComponent(RichTextRenderer);
        richTextRenderer?.resetCursorBlink();

        // 初始化 undo/redo 栈，保存初始快照
        this.clearUndoRedoStacks();
        this.pushUndoSnapshot();
    }

    private handleRichTextKeyDown = (e: KeyboardEvent): void => {
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;
        const richTextRenderer = this.editingEntity.getComponent(RichTextRenderer);
        const isMod = e.metaKey || e.ctrlKey;

        // 阻止事件冒泡到 canvas 的键盘系统
        e.stopPropagation();

        // 退出编辑
        if (e.key === 'Escape') {
            e.preventDefault();
            this.finishEditing();
            return;
        }

        // IME 组合输入中，不处理
        if (this.isComposing) return;

        // ===== Ctrl/Cmd 快捷键 =====
        if (isMod) {
            // Undo: Ctrl+Z (不带 Shift)
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                richTextRenderer?.resetCursorBlink();
                return;
            }
            // Redo: Ctrl+Shift+Z 或 Ctrl+Y
            if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                this.redo();
                richTextRenderer?.resetCursorBlink();
                return;
            }
            // Bold: Ctrl+B
            if (e.key === 'b') {
                e.preventDefault();
                this.pushUndoSnapshot();
                editor.boldFont(editor.fonMgr as any);
                editor.apply();
                return;
            }
            // Italic: Ctrl+I
            if (e.key === 'i') {
                e.preventDefault();
                this.pushUndoSnapshot();
                editor.italicFont(editor.fonMgr as any);
                editor.apply();
                return;
            }
            // Underline: Ctrl+U
            if (e.key === 'u') {
                e.preventDefault();
                this.pushUndoSnapshot();
                const currentStyle = editor.getStyleForSelection();
                const newDecoration = currentStyle.textDecoration === 'UNDERLINE' ? 'NONE' : 'UNDERLINE';
                editor.setStyle({ textDecoration: newDecoration } as any);
                editor.apply();
                return;
            }
            // Copy: Ctrl+C
            if (e.key === 'c') {
                e.preventDefault();
                this.copySelectionToClipboard(editor);
                return;
            }
            // Cut: Ctrl+X
            if (e.key === 'x') {
                e.preventDefault();
                this.copySelectionToClipboard(editor);
                if (!editor.isCollapse()) {
                    this.pushUndoSnapshot();
                    editor.deleteText();
                    editor.apply();
                    richTextRenderer?.resetCursorBlink();
                    this.syncEditorSize();
                }
                return;
            }
            // Paste: Ctrl+V
            if (e.key === 'v') {
                e.preventDefault();
                navigator.clipboard.readText().then((text) => {
                    if (text && this.editingEntity && this.isRichTextEditing) {
                        const rc = this.editingEntity.getComponent(RichTextComponent);
                        if (!rc) return;
                        this.pushUndoSnapshot();
                        rc.editor.insertText(text);
                        rc.editor.apply();
                        const rr = this.editingEntity.getComponent(RichTextRenderer);
                        rr?.resetCursorBlink();
                        this.syncEditorSize();
                    }
                }).catch(() => {
                    // 剪贴板权限被拒绝，忽略
                });
                return;
            }
            // 全选: Ctrl+A
            if (e.key === 'a') {
                e.preventDefault();
                editor.selectAll();
                return;
            }
        }

        // 方向键
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const dirMap: Record<string, 'left' | 'right' | 'top' | 'bottom'> = {
                'ArrowLeft': 'left',
                'ArrowRight': 'right',
                'ArrowUp': 'top',
                'ArrowDown': 'bottom',
            };
            editor.arrowMove(dirMap[e.key], { shift: e.shiftKey, command: isMod });
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
            return;
        }

        // 删除
        if (e.key === 'Backspace') {
            e.preventDefault();
            this.pushUndoSnapshot();
            editor.deleteText({ option: e.altKey, command: isMod });
            editor.apply();
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
            return;
        }

        // Delete 键
        if (e.key === 'Delete') {
            e.preventDefault();
            this.pushUndoSnapshot();
            editor.deleteText({ fn: true, option: e.altKey, command: isMod });
            editor.apply();
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
            return;
        }

        // 回车
        if (e.key === 'Enter') {
            // 脑图节点或 Ctrl+Enter：结束编辑
            const mindMapComp = this.editingEntity?.getComponent(MindMapNodeComponent);
            if (isMod || mindMapComp) {
                e.preventDefault();
                this.finishEditing();
                return;
            }
            e.preventDefault();
            this.pushUndoSnapshot();
            editor.insertText('\n');
            editor.apply();
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
            return;
        }
    };

    private handleRichTextInput = (e: Event): void => {
        if (!this.editingEntity || !this.isRichTextEditing || this.isComposing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;
        const richTextRenderer = this.editingEntity.getComponent(RichTextRenderer);

        const inputEvent = e as InputEvent;
        const text = inputEvent.data;

        if (text) {
            this.pushUndoSnapshot();
            editor.insertText(text);
            editor.apply();
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
        }

        // 清空 textarea 值（避免累积）
        if (this.hiddenTextarea) {
            this.hiddenTextarea.value = '';
        }
    };

    private handleCompositionStart = (): void => {
        this.isComposing = true;
    };

    private handleCompositionEnd = (e: CompositionEvent): void => {
        this.isComposing = false;
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;
        const richTextRenderer = this.editingEntity.getComponent(RichTextRenderer);

        const text = e.data;
        if (text) {
            this.pushUndoSnapshot();
            editor.insertText(text);
            editor.apply();
            richTextRenderer?.resetCursorBlink();
            this.syncEditorSize();
        }

        // 清空 textarea 值
        if (this.hiddenTextarea) {
            this.hiddenTextarea.value = '';
        }
    };

    /**
     * 将当前鼠标的世界坐标转换为实体局部坐标
     * 对于有父级的实体（如脑图子节点），需要遍历父级链计算世界坐标
     */
    private screenToLocal(entity: Entity): { x: number; y: number } | null {
        if (!this.pointerComponent) return null;
        const layoutComp = entity.getComponent(LayoutComponent);
        if (!layoutComp) return null;

        // 计算实体的世界坐标（遍历父级链）
        let worldX = layoutComp.x;
        let worldY = layoutComp.y;
        let parent = entity.parent;
        while (parent) {
            const pl = parent.getComponent(LayoutComponent);
            if (pl) {
                worldX += pl.x;
                worldY += pl.y;
            }
            parent = parent.parent;
        }

        // 如果是脑图节点，文字有 padding 偏移
        const mindMapComp = entity.getComponent(MindMapNodeComponent);
        const offsetX = mindMapComp ? NODE_PADDING_X : 0;
        const offsetY = mindMapComp ? NODE_PADDING_Y : 0;

        // pointerComponent 的 x/y 已经是世界坐标
        const localX = this.pointerComponent.x - worldX - offsetX;
        const localY = this.pointerComponent.y - worldY - offsetY;
        return { x: localX, y: localY };
    }

    /**
     * 同步 Editor 的尺寸到 LayoutComponent 和 HitTestComponent
     * 脑图节点需要额外加上 padding
     */
    private syncEditorSize(): void {
        if (!this.editingEntity) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;
        const layoutComp = this.editingEntity.getComponent(LayoutComponent);
        if (!layoutComp) return;

        const mindMapComp = this.editingEntity.getComponent(MindMapNodeComponent);
        let w: number;
        let h: number;

        if (mindMapComp) {
            // 脑图节点：文字尺寸 + padding
            const textW = Math.max(editor.width, 20);
            const textH = Math.max(editor.height, mindMapComp.nodeStyle.fontSize * 1.4);
            w = Math.max(textW + NODE_PADDING_X * 2, 80);
            h = Math.max(textH + NODE_PADDING_Y * 2, 32);
        } else {
            w = Math.max(editor.width, 20);
            h = Math.max(editor.height, editor.style.fontSize * 1.4);
        }

        if (Math.abs(layoutComp.width - w) > 0.5 || Math.abs(layoutComp.height - h) > 0.5) {
            layoutComp.width = w;
            layoutComp.height = h;
            layoutComp.dirty = true;

            // 脑图节点还需要更新 shape 尺寸
            if (mindMapComp) {
                const shapeRenderer = this.editingEntity.getComponent(ShapeRenderer);
                if (shapeRenderer) {
                    shapeRenderer.updateSize(w, h);
                }
            }

            const hitTestComp = this.editingEntity.getComponent(HitTestComponent);
            if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                (hitTestComp.data.options as RectHitTestProps).size = [w, h];
            }

            if (this.eventManager) {
                const layoutEvent = new LayoutEvent({ data: { entities: [this.editingEntity] } });
                this.eventManager.sendEvent(layoutEvent);
            }
        }
    }

    /**
     * 同步隐藏 textarea 的位置到文字光标的屏幕坐标
     * 每帧调用，确保 viewport 平移/缩放后 IME 候选框位置正确
     */
    private syncTextareaPosition(): void {
        if (!this.hiddenTextarea || !this.editingEntity || !this.viewportComponent) return;
        const layoutComp = this.editingEntity.getComponent(LayoutComponent);
        if (!layoutComp) return;

        // 计算实体的世界坐标（遍历父级链）
        let entityWorldX = layoutComp.x;
        let entityWorldY = layoutComp.y;
        let parent = this.editingEntity.parent;
        while (parent) {
            const pl = parent.getComponent(LayoutComponent);
            if (pl) {
                entityWorldX += pl.x;
                entityWorldY += pl.y;
            }
            parent = parent.parent;
        }

        // 脑图节点文字有 padding 偏移
        const mindMapComp = this.editingEntity.getComponent(MindMapNodeComponent);
        if (mindMapComp) {
            entityWorldX += NODE_PADDING_X;
            entityWorldY += NODE_PADDING_Y;
        }

        // 使用 getSelectionRects 获取光标位置（实体局部坐标）
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        let localCursorX = 0;
        let localCursorY = 0;
        if (richTextComp) {
            const rects = richTextComp.editor.getSelectionRects();
            if (rects.length > 0) {
                localCursorX = rects[0][0];
                localCursorY = rects[0][1];
            }
        }

        // 将实体世界坐标 + 光标偏移转换为屏幕坐标
        const worldX = entityWorldX + localCursorX;
        const worldY = entityWorldY + localCursorY;
        const screenPos = this.viewportComponent.worldToScreen(worldX, worldY);

        this.hiddenTextarea.style.left = `${screenPos.x}px`;
        this.hiddenTextarea.style.top = `${screenPos.y}px`;
    }

    // ==================== 结束编辑 ====================

    finishEditing(): void {
        if (!this.editingEntity) return;

        if (this.isRichTextEditing) {
            this.finishRichTextEditing();
        } else {
            this.finishLegacyEditing();
        }
    }

    private finishRichTextEditing(): void {
        if (!this.editingEntity) return;
        const entity = this.editingEntity;

        const richTextComp = entity.getComponent(RichTextComponent);
        if (richTextComp) {
            const editor = richTextComp.editor;
            editor.isEditor = false;
            editor.deselection();

            // 最终同步尺寸
            this.syncEditorSize();

            // 最终重绘（移除光标和选区）
            const richTextRenderer = entity.getComponent(RichTextRenderer);
            if (richTextRenderer) {
                richTextRenderer.drawText(editor);
                richTextRenderer.dirty = true;
            }

            // 如果是脑图节点，同步文字到 MindMapNodeComponent 并触发 relayout
            const mindMapComp = entity.getComponent(MindMapNodeComponent);
            if (mindMapComp) {
                const newText = editor.getText();
                mindMapComp.text = newText;

                // 如果是占位文本且用户输入了新内容，取消占位状态
                if (mindMapComp.isPlaceholder && newText !== '' && newText !== mindMapComp.nodeStyle.fontSize.toString()) {
                    mindMapComp.isPlaceholder = false;
                    if (richTextRenderer) {
                        richTextRenderer.renderObject.alpha = 1;
                    }
                }

                // 根据 editor 尺寸更新节点尺寸（包含 padding）
                const textW = Math.max(editor.width, 20);
                const textH = Math.max(editor.height, mindMapComp.nodeStyle.fontSize * 1.4);
                const nodeWidth = Math.max(textW + NODE_PADDING_X * 2, 80);
                const nodeHeight = Math.max(textH + NODE_PADDING_Y * 2, 32);

                const layoutComp = entity.getComponent(LayoutComponent);
                if (layoutComp) {
                    layoutComp.width = nodeWidth;
                    layoutComp.height = nodeHeight;
                    layoutComp.dirty = true;
                }

                const shapeRenderer = entity.getComponent(ShapeRenderer);
                if (shapeRenderer) {
                    shapeRenderer.updateSize(nodeWidth, nodeHeight);
                }

                const hitTestComp = entity.getComponent(HitTestComponent);
                if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                    (hitTestComp.data.options as RectHitTestProps).size = [nodeWidth, nodeHeight];
                }

                // 触发脑图 relayout
                if (this.eventManager) {
                    const mindMapEvent = new MindMapEvent({
                        data: { type: MindMapEventType.RelayoutRequest },
                    });
                    this.eventManager.sendEvent(mindMapEvent);
                }
            }
        }

        // 清理隐藏 textarea
        if (this.hiddenTextarea) {
            this.hiddenTextarea.removeEventListener('keydown', this.handleRichTextKeyDown);
            this.hiddenTextarea.removeEventListener('input', this.handleRichTextInput);
            this.hiddenTextarea.removeEventListener('compositionstart', this.handleCompositionStart);
            this.hiddenTextarea.removeEventListener('compositionend', this.handleCompositionEnd);
            if (this.hiddenTextarea.parentElement) {
                this.hiddenTextarea.parentElement.removeChild(this.hiddenTextarea);
            }
            this.hiddenTextarea = null;
        }

        this.editingEntity = null;
        this.isRichTextEditing = false;
        this.isComposing = false;
        this.world.isTextEditing = false;

        // 清理 undo/redo 栈
        this.clearUndoRedoStacks();

        // 通知外部
        this.world.emit(StageEvents.ENTITY_MOVE, { entities: [entity.name] });
    }

    // ==================== 旧版 TextRenderer 编辑模式（保留兼容） ====================

    private startLegacyEditing(entity: Entity, textRenderer: TextRenderer): void {
        this.editingEntity = entity;
        this.isRichTextEditing = false;
        this.world.isTextEditing = true;

        const layoutComp = entity.getComponent(LayoutComponent);
        if (!layoutComp) return;

        const scale = this.viewportComponent?.scale ?? 1;
        const offsetX = this.viewportComponent?.offsetX ?? 0;
        const offsetY = this.viewportComponent?.offsetY ?? 0;

        const screenX = (layoutComp.x - offsetX) * scale;
        const screenY = (layoutComp.y - offsetY) * scale;
        const screenW = Math.max(layoutComp.width * scale, 60);
        const screenH = Math.max(layoutComp.height * scale, 24);

        const pixiText = textRenderer.renderObject;
        const style = pixiText.style;
        const fontSize = (typeof style.fontSize === 'number' ? style.fontSize : parseInt(String(style.fontSize))) * scale;
        const fontFamily = String(style.fontFamily || 'Arial');
        const fill = style.fill;
        let color = '#333333';
        if (typeof fill === 'number') {
            color = '#' + fill.toString(16).padStart(6, '0');
        } else if (typeof fill === 'string') {
            color = fill;
        }

        const mindMapComp = entity.getComponent(MindMapNodeComponent);
        const isPlaceholder = mindMapComp?.isPlaceholder ?? false;

        const textarea = document.createElement('textarea');
        textarea.value = isPlaceholder ? '' : pixiText.text;
        textarea.placeholder = isPlaceholder ? pixiText.text : '';
        textarea.style.cssText = `
            position: absolute;
            left: ${screenX}px;
            top: ${screenY}px;
            width: ${screenW}px;
            min-height: ${screenH}px;
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            color: ${color};
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #4285F4;
            border-radius: 2px;
            padding: 2px 4px;
            margin: 0;
            outline: none;
            resize: none;
            overflow: hidden;
            box-sizing: border-box;
            z-index: 10000;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;

        textRenderer.renderObject.visible = false;
        this.mask.appendChild(textarea);
        this.textarea = textarea;
        textarea.focus();
        textarea.select();

        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        textarea.addEventListener('input', autoResize);
        autoResize();

        textarea.addEventListener('blur', () => this.finishEditing());
        textarea.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.finishEditing();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || mindMapComp)) {
                e.preventDefault();
                this.finishEditing();
            }
            e.stopPropagation();
        });
    }

    private finishLegacyEditing(): void {
        if (!this.editingEntity || !this.textarea) return;

        const entity = this.editingEntity;
        const textarea = this.textarea;
        let newText = textarea.value.trim();

        this.editingEntity = null;
        this.textarea = null;
        this.world.isTextEditing = false;

        const mindMapComp = entity.getComponent(MindMapNodeComponent);
        if (!newText && mindMapComp) {
            newText = mindMapComp.text;
        }

        const textRenderer = entity.getComponent(TextRenderer);
        if (textRenderer) {
            textRenderer.setText(newText);
            textRenderer.renderObject.visible = true;
            textRenderer.renderObject.text = newText;

            if (mindMapComp) {
                if (mindMapComp.isPlaceholder && newText !== mindMapComp.text) {
                    mindMapComp.isPlaceholder = false;
                    textRenderer.renderObject.alpha = 1;
                }
                mindMapComp.text = newText;

                const nodeStyle = mindMapComp.nodeStyle;
                const estimatedTextWidth = newText.length * nodeStyle.fontSize * 0.7;
                const estimatedTextHeight = nodeStyle.fontSize * 1.4;
                const nodeWidth = Math.max(estimatedTextWidth + NODE_PADDING_X * 2, 80);
                const nodeHeight = Math.max(estimatedTextHeight + NODE_PADDING_Y * 2, 32);

                const layoutComp = entity.getComponent(LayoutComponent);
                if (layoutComp) {
                    layoutComp.width = nodeWidth;
                    layoutComp.height = nodeHeight;
                    layoutComp.dirty = true;
                }

                const hitTestComp = entity.getComponent(HitTestComponent);
                if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                    (hitTestComp.data.options as RectHitTestProps).size = [nodeWidth, nodeHeight];
                }

                const shapeRenderer = entity.getComponent(ShapeRenderer);
                if (shapeRenderer) {
                    shapeRenderer.updateSize(nodeWidth, nodeHeight);
                }

                if (this.eventManager) {
                    const mindMapEvent = new MindMapEvent({
                        data: { type: MindMapEventType.RelayoutRequest },
                    });
                    this.eventManager.sendEvent(mindMapEvent);
                }
            } else {
                const measuredWidth = Math.max(textRenderer.renderObject.width, 20);
                const measuredHeight = Math.max(textRenderer.renderObject.height, 16);

                const layoutComp = entity.getComponent(LayoutComponent);
                if (layoutComp) {
                    layoutComp.width = measuredWidth;
                    layoutComp.height = measuredHeight;
                    layoutComp.dirty = true;
                }

                const hitTestComp = entity.getComponent(HitTestComponent);
                if (hitTestComp && hitTestComp.data.type === HitTestType.Rect) {
                    const rectOpts = hitTestComp.data.options as RectHitTestProps;
                    rectOpts.size = [measuredWidth, measuredHeight];
                }
            }

            if (this.eventManager) {
                const layoutEvent = new LayoutEvent({ data: { entities: [entity] } });
                this.eventManager.sendEvent(layoutEvent);
            }

            this.world.emit(StageEvents.ENTITY_MOVE, { entities: [entity.name] });
        }

        if (textarea.parentElement) {
            textarea.parentElement.removeChild(textarea);
        }
    }

    // ==================== Undo/Redo 栈管理 ====================

    /**
     * 保存当前编辑器状态到 undo 栈（在修改文本前调用）
     */
    private pushUndoSnapshot(): void {
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;

        const snapshot: TextEditSnapshot = {
            textData: JSON.parse(JSON.stringify(editor.textData)),
            selection: JSON.parse(JSON.stringify(editor.__selection)),
        };

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }
        // 新操作清空 redo 栈
        this.redoStack = [];
    }

    /**
     * 撤销：将当前状态压入 redo 栈，从 undo 栈弹出并恢复
     */
    private undo(): void {
        if (this.undoStack.length === 0) return;
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;

        // 保存当前状态到 redo 栈
        const currentSnapshot: TextEditSnapshot = {
            textData: JSON.parse(JSON.stringify(editor.textData)),
            selection: JSON.parse(JSON.stringify(editor.__selection)),
        };
        this.redoStack.push(currentSnapshot);

        // 从 undo 栈弹出并恢复
        const snapshot = this.undoStack.pop()!;
        this.restoreSnapshot(snapshot);
    }

    /**
     * 重做：将当前状态压入 undo 栈，从 redo 栈弹出并恢复
     */
    private redo(): void {
        if (this.redoStack.length === 0) return;
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;

        // 保存当前状态到 undo 栈
        const currentSnapshot: TextEditSnapshot = {
            textData: JSON.parse(JSON.stringify(editor.textData)),
            selection: JSON.parse(JSON.stringify(editor.__selection)),
        };
        this.undoStack.push(currentSnapshot);

        // 从 redo 栈弹出并恢复
        const snapshot = this.redoStack.pop()!;
        this.restoreSnapshot(snapshot);
    }

    /**
     * 恢复快照到编辑器
     */
    private restoreSnapshot(snapshot: TextEditSnapshot): void {
        if (!this.editingEntity || !this.isRichTextEditing) return;
        const richTextComp = this.editingEntity.getComponent(RichTextComponent);
        if (!richTextComp) return;
        const editor = richTextComp.editor;

        // 恢复 textData
        editor.textData = JSON.parse(JSON.stringify(snapshot.textData));
        // 恢复 selection
        editor.__selection = JSON.parse(JSON.stringify(snapshot.selection));

        // 重新排版
        editor.apply();
        this.syncEditorSize();
    }

    /**
     * 清空 undo/redo 栈
     */
    private clearUndoRedoStacks(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    // ==================== 剪贴板辅助 ====================

    /**
     * 将当前选区文本复制到系统剪贴板
     */
    private copySelectionToClipboard(editor: import('../../rich-text/interfaces/editor').Editor): void {
        if (editor.isCollapse()) return;
        const offsets = editor.getSelectCharacterOffset();
        if (!offsets) return;

        const fullText = editor.getText();
        const start = Math.min(offsets.anchor, offsets.focus);
        const end = Math.max(offsets.anchor, offsets.focus);
        const selectedText = fullText.slice(start, end);

        if (selectedText) {
            navigator.clipboard.writeText(selectedText).catch(() => {
                // 剪贴板权限被拒绝，忽略
            });
        }
    }
}
