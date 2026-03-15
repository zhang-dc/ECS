# 技术文档：光标状态反馈 (Cursor Feedback)

> Phase 1 - 需求 4

## 1. 现状分析

### 1.1 当前光标控制

光标仅在一个地方被设置：

- **ResizeSystem** (`src/engine/modules/select/ResizeSystem.ts`, `updateHoverCursor` 方法)
  - 每帧检测指针与 resize 手柄的距离
  - 命中时设置 `mask.style.cursor` 为对应方向
  - 未命中时重置为空字符串 `''`

### 1.2 问题

- 工具切换后光标不变化
- 悬停元素无 `move` 光标
- Hand 工具拖拽无 `grabbing` 光标
- 绘制工具无 `crosshair` 光标
- 多个系统可能争夺光标控制权，无优先级机制

## 2. 技术方案

### 2.1 核心设计：CursorComponent + CursorSystem

引入集中式光标管理，通过 **CursorComponent** 收集各系统的光标请求，由 **CursorSystem** 统一决策并应用。

#### 设计原则
- 各系统通过 CursorComponent 声明光标需求，不直接操作 DOM
- CursorSystem 根据优先级选择最终光标
- 单一 DOM 写入点，避免多系统竞争

### 2.2 CursorComponent

```typescript
// src/engine/modules/cursor/CursorComponent.ts

export enum CursorPriority {
    TOOL_DEFAULT = 0,     // 工具默认光标（最低优先级）
    HOVER_ENTITY = 1,     // 悬停在元素上
    HOVER_HANDLE = 2,     // 悬停在 resize 手柄上
    ACTIVE_OPERATION = 3, // 活跃操作中（最高优先级）
}

export interface CursorRequest {
    cursor: string;           // CSS cursor 值
    priority: CursorPriority;
    source: string;           // 请求来源标识（调试用）
}

export class CursorComponent extends Component {
    private requests: CursorRequest[] = [];
    private currentCursor: string = 'default';

    /** 各系统调用：声明光标需求 */
    setCursor(cursor: string, priority: CursorPriority, source: string): void {
        this.requests.push({ cursor, priority, source });
    }

    /** CursorSystem 调用：获取最高优先级的光标 */
    resolve(): string {
        if (this.requests.length === 0) return 'default';
        // 按优先级降序，取最高优先级
        this.requests.sort((a, b) => b.priority - a.priority);
        return this.requests[0].cursor;
    }

    /** 每帧末尾清空 */
    clear(): void {
        this.requests = [];
    }

    getCurrentCursor(): string {
        return this.currentCursor;
    }

    setCurrentCursor(cursor: string): void {
        this.currentCursor = cursor;
    }
}
```

### 2.3 CursorSystem

```typescript
// src/engine/modules/cursor/CursorSystem.ts

export class CursorSystem extends System {
    private mask: HTMLElement;
    private cursorComponent: CursorComponent;

    start(): void {
        this.mask = document.getElementById('canvas-mask')!;
        this.cursorComponent = this.world.getComponent(CursorComponent);
    }

    /** 在所有其他系统之后执行 */
    update(): void {
        const resolved = this.cursorComponent.resolve();
        const current = this.cursorComponent.getCurrentCursor();

        // 仅在光标变化时写入 DOM（减少重排）
        if (resolved !== current) {
            this.mask.style.cursor = resolved;
            this.cursorComponent.setCurrentCursor(resolved);
        }

        // 清空本帧请求，准备下一帧
        this.cursorComponent.clear();
    }
}
```

### 2.4 各系统改造

#### 2.4.1 ToolSystem — 工具默认光标

在 `update()` 中根据当前工具模式设置默认光标：

```typescript
// src/engine/modules/tool/ToolSystem.ts — update() 中新增

private TOOL_CURSORS: Record<ToolMode, string> = {
    select: 'default',
    hand: 'grab',
    rect: 'crosshair',
    circle: 'crosshair',
    text: 'text',
    image: 'crosshair',
    mindmap: 'crosshair',
};

// 在 update() 开头添加
const toolCursor = this.TOOL_CURSORS[this.toolComponent.mode];
this.cursorComponent.setCursor(toolCursor, CursorPriority.TOOL_DEFAULT, 'ToolSystem');

// Hand 工具拖拽中
if (this.toolComponent.mode === 'hand' && pointer.isButtonDown(PointerButtons.PRIMARY)) {
    this.cursorComponent.setCursor('grabbing', CursorPriority.ACTIVE_OPERATION, 'ToolSystem:hand-drag');
}

// 绘制中
if (this.toolComponent.isDrawing) {
    this.cursorComponent.setCursor('crosshair', CursorPriority.ACTIVE_OPERATION, 'ToolSystem:drawing');
}
```

#### 2.4.2 ResizeSystem — 手柄悬停 & resize 中

替换现有的 `updateHoverCursor()` 直接 DOM 操作：

```typescript
// src/engine/modules/select/ResizeSystem.ts

// 移除: this.mask.style.cursor = foundCursor ?? '';
// 替换为:

// 手柄悬停
if (foundCursor) {
    this.cursorComponent.setCursor(foundCursor, CursorPriority.HOVER_HANDLE, 'ResizeSystem:hover');
}

// resize 操作中
if (this.isResizing && this.activeHandle) {
    const handle = this.handles.find(h => h.type === this.activeHandle);
    if (handle) {
        this.cursorComponent.setCursor(handle.cursor, CursorPriority.ACTIVE_OPERATION, 'ResizeSystem:resizing');
    }
}
```

#### 2.4.3 SelectSystem — 元素悬停 & 框选

```typescript
// src/engine/modules/select/SelectSystem.ts

// 元素悬停检测：在 update() 中，当 hitTest 命中实体时
if (toolComponent.mode === 'select' && hoveredEntity && !this.isResizing) {
    this.cursorComponent.setCursor('move', CursorPriority.HOVER_ENTITY, 'SelectSystem:hover');
}

// 框选中
if (this.selectionState.isMarqueeSelecting) {
    this.cursorComponent.setCursor('crosshair', CursorPriority.ACTIVE_OPERATION, 'SelectSystem:marquee');
}
```

#### 2.4.4 DragSystem — 拖拽元素中

```typescript
// src/engine/modules/drag/DragSystem.ts

if (this.isDragging) {
    this.cursorComponent.setCursor('move', CursorPriority.ACTIVE_OPERATION, 'DragSystem:dragging');
}
```

#### 2.4.5 TextEditSystem — 文本编辑中

```typescript
// src/engine/modules/text/TextEditSystem.ts

if (this.world.isTextEditing) {
    this.cursorComponent.setCursor('text', CursorPriority.ACTIVE_OPERATION, 'TextEditSystem:editing');
}
```

### 2.5 元素悬停检测

当前 HitTestSystem 主要用于 Pointer 与实体的碰撞检测，结果通过 HitTestEvent 传递给 InteractSystem。要实现「悬停元素显示 move 光标」，需要获取当前帧指针下方的实体。

**方案**：在 SelectSystem 中复用 HitTestEvent 数据。

```typescript
// SelectSystem 已经接收 InteractEvent
// 当收到 InteractType.Hover 事件时，记录 hoveredEntity
// 在 update() 中据此设置光标
```

实际上 InteractSystem 已有 `InteractType.Hover` 类型但未见使用。需要确认 InteractSystem 是否发送 Hover 事件，如果没有，需要补充：

```typescript
// InteractSystem.ts — checkPointerMove() 中
// 当指针在实体上移动（非拖拽状态）时，发送 Hover 事件
if (!this.world.isDragging && !this.world.isResizing) {
    eventManager.send(entity, InteractEventData(InteractType.Hover));
}
```

## 3. System 执行顺序

光标系统需要在所有产生光标请求的系统之后执行：

```
现有系统执行顺序:
1.  EventSystem
2.  HitTestSystem
3.  PointerSystem
4.  InteractSystem
5.  ResizeSystem         → setCursor(HOVER_HANDLE / ACTIVE_OPERATION)
6.  SelectSystem         → setCursor(HOVER_ENTITY / ACTIVE_OPERATION)
7.  DragSystem           → setCursor(ACTIVE_OPERATION)
8.  HistorySystem
9.  GuideSystem
10. ToolSystem           → setCursor(TOOL_DEFAULT / ACTIVE_OPERATION)
11. MindMap 系列
12. LayerSystem
13. LayoutSystem
14. RenderSystem
15. SelectionRenderSystem
16. GridRenderSystem
17. ViewportSystem
18. 【新增】CursorSystem  → resolve() + 写入 DOM
```

## 4. 涉及文件清单

| 文件 | 操作 | 改动内容 |
|------|------|---------|
| `src/engine/modules/cursor/CursorComponent.ts` | **新建** | 光标状态组件 |
| `src/engine/modules/cursor/CursorSystem.ts` | **新建** | 光标决策系统 |
| `src/engine/modules/cursor/index.ts` | **新建** | 模块导出 |
| `src/engine/Scene.ts` | **修改** | 注册 CursorComponent, 添加 CursorSystem |
| `src/engine/modules/tool/ToolSystem.ts` | **修改** | 添加工具默认光标 + 拖拽/绘制光标 |
| `src/engine/modules/select/ResizeSystem.ts` | **修改** | 替换 DOM 操作为 setCursor 调用 |
| `src/engine/modules/select/SelectSystem.ts` | **修改** | 添加元素悬停 + 框选光标 |
| `src/engine/modules/drag/DragSystem.ts` | **修改** | 添加拖拽中光标 |
| `src/engine/modules/text/TextEditSystem.ts` | **修改** | 添加文本编辑光标 |
| `src/engine/modules/interact/InteractSystem.ts` | **修改** | 补充 Hover 事件发送（如缺失） |

## 5. 数据流图

```
┌─────────────┐   ┌──────────────┐   ┌────────────┐   ┌────────────┐
│ ToolSystem   │   │ ResizeSystem │   │ SelectSystem│   │ DragSystem │
│ TOOL_DEFAULT │   │ HOVER_HANDLE │   │ HOVER_ENTITY│   │ ACTIVE_OP  │
│ ACTIVE_OP    │   │ ACTIVE_OP    │   │ ACTIVE_OP   │   │            │
└──────┬───────┘   └──────┬───────┘   └──────┬──────┘   └─────┬──────┘
       │                  │                   │                │
       └──────────────────┴───────────────────┴────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │ CursorComponent   │
                         │ requests: [...]   │
                         └────────┬──────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ CursorSystem      │
                         │ resolve() → 取最  │
                         │ 高优先级的 cursor  │
                         └────────┬──────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ mask.style.cursor │
                         │ (单一 DOM 写入点)  │
                         └──────────────────┘
```

## 6. 测试验证

### 6.1 手动测试清单

1. **工具切换**: 依次按 V/H/R/O/T/I/M，确认光标立即变化
2. **Hand 工具**: 切换到 Hand → grab → 按下拖拽 → grabbing → 释放 → grab
3. **元素悬停**: Select 工具下，移入元素 → move，移出 → default
4. **手柄悬停**: 选中元素，移到各手柄 → 对应方向 resize 光标
5. **resize 中**: 按住手柄拖拽，移动到手柄外，光标不变
6. **拖拽元素**: 拖拽选中元素 → move，释放 → 恢复
7. **框选**: 空白区域拖拽 → crosshair
8. **文本编辑**: 双击文本 → text
9. **绘制图形**: Rect 工具拖拽 → crosshair

### 6.2 边界情况

- 快速切换工具时光标不闪烁
- resize 中移出画布再移回，光标恢复正确
- 文本编辑中切换工具，光标正确更新
- 多选元素后悬停任一元素显示 move

## 7. 扩展性

- **旋转光标**: 后续需求1实现旋转交互时，只需在 ResizeSystem 中新增旋转区域检测，调用 `setCursor('url(rotate.svg), auto', CursorPriority.HOVER_HANDLE, 'ResizeSystem:rotate')` 即可
- **空格+拖拽**: 后续需求5实现时，在 ToolSystem 中检测空格键按下，临时设置 `grab/grabbing` 光标，优先级为 `ACTIVE_OPERATION`
- **锁定元素**: 悬停锁定元素时可设置 `not-allowed` 光标
