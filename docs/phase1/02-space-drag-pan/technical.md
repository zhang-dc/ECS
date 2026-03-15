# 技术文档：空格+拖拽平移 (Space + Drag Pan)

> Phase 1 - 需求 5

## 1. 现状分析

### 1.1 当前平移实现

- **Hand 工具模式** (`ToolSystem.handleHandMode()`): 检测 `PRIMARY` 按下 + `isMoving`，发送 `ViewportEvent(Pan)` 给 `ViewportSystem` 执行平移
- **鼠标滚轮**: `ViewportSystem` 直接监听 wheel 事件实现平移/缩放

### 1.2 工具切换机制

- `ToolSystem.switchTool()` 会修改 `toolComponent.mode` 并 `emit(TOOL_CHANGE)` → 触发 UI 更新
- 键盘快捷键 (H) 通过 `switchTool('hand')` 切换 → UI 面板会跟随变化

### 1.3 键盘状态追踪

- `KeyboardSystem` 通过 `keydown/keyup` 事件更新 `keyboardComponent.keyMap`
- `KeyboardKey.Space = ' '` 已定义在枚举中
- `KeyboardSystem.handleKeyboardEvent()` 对所有按键调用 `event.preventDefault()` — 空格键不会触发页面滚动

### 1.4 文本编辑中的键盘隔离

- `TextEditSystem` 创建隐藏 `textarea`，其 `keydown` handler 调用 `e.stopPropagation()` 阻止事件冒泡到 `KeyboardSystem`
- 因此文本编辑中空格键不会进入 `keyboardComponent.keyMap`，天然隔离

## 2. 技术方案

### 2.1 核心设计

在 `ToolSystem` 中增加**临时手型模式**（Space Pan），与正式 Hand 工具模式分离：

- 新增 `isSpacePanning: boolean` 状态标记
- 空格按下时**不调用 `switchTool()`**，而是直接进入临时平移逻辑
- 通过 `CursorComponent` 设置光标（`grab` / `grabbing`），优先级 `ACTIVE_OPERATION`
- 释放空格后清除标记，无需恢复操作（原 `toolComponent.mode` 始终未改变）

### 2.2 实现细节

#### 修改文件：`src/engine/modules/tool/ToolSystem.ts`

```typescript
// 新增状态
private isSpacePanning: boolean = false;

// 新增依赖
private cursorComponent?: CursorComponent;
```

在 `start()` 中获取 `CursorComponent`：
```typescript
this.cursorComponent = this.world.findComponent(CursorComponent);
```

在 `update()` 中，`handleKeyboardShortcuts()` 之后、mode switch 之前插入空格平移处理：

```typescript
update(): void {
    if (!this.pointerComponent) return;

    this.handleKeyboardShortcuts();

    // ===== 空格临时平移 =====
    this.handleSpacePan();

    // 空格平移激活时，跳过正常工具模式处理
    if (this.isSpacePanning) return;

    const mode = this.toolComponent.mode;
    switch (mode) { ... }
}
```

#### `handleSpacePan()` 实现

```typescript
private handleSpacePan(): void {
    if (!this.keyboardComponent || !this.pointerComponent) return;

    const spaceDown = this.keyboardComponent.isKeyDown(KeyboardKey.Space);

    // 不在以下状态时才允许空格平移
    if (this.world.isTextEditing) return;
    if (this.toolComponent.isDrawing) return;
    if (this.toolComponent.mode === 'hand') return;

    if (spaceDown && !this.isSpacePanning) {
        // 进入临时平移模式
        this.isSpacePanning = true;
    }

    if (this.isSpacePanning) {
        if (!spaceDown) {
            // 空格释放 → 退出临时平移
            this.isSpacePanning = false;
            return;
        }

        // 设置光标
        if (this.pointerComponent.isButtonDown(PointerButtons.PRIMARY)) {
            // 拖拽中 → grabbing
            this.cursorComponent?.setCursor('grabbing', CursorPriority.ACTIVE_OPERATION);
        } else {
            // 空格按住未拖拽 → grab
            this.cursorComponent?.setCursor('grab', CursorPriority.ACTIVE_OPERATION);
        }

        // 执行平移（复用 handleHandMode 逻辑）
        if (this.pointerComponent.isButtonDown(PointerButtons.PRIMARY)
            && this.pointerComponent.isMoving) {
            const event = new ViewportEvent({
                data: {
                    operation: ViewportOperation.Pan,
                    deltaScreenX: this.pointerComponent.deltaX,
                    deltaScreenY: this.pointerComponent.deltaY,
                },
            });
            this.eventManager?.sendEvent(event);
        }
    }
}
```

### 2.3 为什么不修改 `toolComponent.mode`

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| 修改 mode 为 'hand' | 复用 handleHandMode | 触发 TOOL_CHANGE → UI 面板闪烁，需要额外记录/恢复原 mode |
| 独立 isSpacePanning 标记 | 不影响 UI，逻辑隔离 | 平移逻辑有少量重复（3 行） |

选择方案 B：**独立标记**。3 行平移逻辑的重复远小于引入 mode 保存/恢复和 UI 抑制的复杂度。

### 2.4 与其他系统的交互

- **SelectSystem / DragSystem**: `isSpacePanning` 激活时，`update()` 直接 return 跳过 mode switch，不执行任何工具模式处理。空格平移期间不会触发选择或拖拽
- **CursorSystem**: 空格平移期间，ToolSystem 以 `ACTIVE_OPERATION` 优先级设置 `grab/grabbing`，覆盖其他光标
- **KeyboardSystem**: 空格按键状态通过 `keyMap` 传递，ToolSystem 每帧读取
- **TextEditSystem**: 文本编辑中 `stopPropagation()` 阻止空格进入 keyMap，不会误触发

### 2.5 与 ResizeSystem/DragSystem 的冲突处理

空格平移检测在 `update()` 的 mode switch 之前。当 `isSpacePanning = true` 时直接 return，不进入 select 模式的正常流程。但 ResizeSystem 和 DragSystem 的 `update()` 独立执行，需确保它们不会在空格平移期间启动新的拖拽/缩放：

- **ResizeSystem**: 已有 `if (toolComponent.mode !== 'select') return` 保护，但空格平移时 mode 仍为 select。不过 ResizeSystem 只在 `hasButtonDown(PRIMARY)` 时检测手柄命中 — 空格平移中即使左键按下，只要指针不在手柄上就不会触发 resize。如果恰好在手柄上按空格+左键，resize 会优先触发，这是合理行为
- **DragSystem**: 类似，依赖 InteractEvent(PointerDown) 触发。空格平移中如果左键点击在实体上，DragSystem 会收到事件。需要在 DragSystem 中增加 `isSpacePanning` 检查

解决方案：将 `isSpacePanning` 暴露到 `Stage` 上（类似 `isDragging`），让 DragSystem 检查。

```typescript
// Stage.ts 已有:
isDragging = false;
isResizing = false;
isTextEditing = false;

// 新增:
isSpacePanning = false;
```

DragSystem 的 `handleDragStart()` 开头增加：
```typescript
if (this.world.isSpacePanning) return;
```

## 3. 涉及文件清单

| 文件 | 操作 | 改动内容 |
| --- | --- | --- |
| `src/engine/modules/tool/ToolSystem.ts` | **修改** | 新增 `handleSpacePan()` 方法，update 中调用 |
| `src/engine/Stage.ts` | **修改** | 新增 `isSpacePanning: boolean` 标志 |
| `src/engine/modules/drag/DragSystem.ts` | **修改** | `handleDragStart()` 增加 `isSpacePanning` 检查 |
| `src/engine/modules/cursor/CursorComponent.ts` | 无修改 | 已有 `ACTIVE_OPERATION` 优先级，直接复用 |

## 4. 测试验证

### 4.1 手动测试清单

1. **基本流程**: Select 工具 → 按住空格 → 光标变 grab → 左键拖拽 → 画布平移 + 光标 grabbing → 释放空格 → 恢复 default
2. **Rect 工具**: 切换到 Rect → 按住空格 → grab → 拖拽平移 → 释放空格 → 恢复 crosshair
3. **绘制中**: Rect 工具开始绘制（左键按下拖拽）→ 按空格 → 不生效，继续绘制
4. **文本编辑**: 双击文本进入编辑 → 按空格 → 正常输入空格字符
5. **Hand 工具**: 切换到 Hand → 按空格 → 无额外效果
6. **拖拽保护**: Select 工具 → 按住空格 → 左键点击元素 → 不应触发元素拖拽，应平移画布
7. **UI 不变**: 空格平移期间，工具面板仍显示原工具高亮
