# 技术文档：旋转交互 (Rotation Interaction)

> Phase 1 - 需求 1

## 1. 现状分析

### 1.1 已有基础

- **LayoutComponent.rotation**: 已存在（弧度），默认为 0
- **LayoutComponent.getAABB()**: 已处理旋转情况，计算旋转后的 AABB
- **getWorldAABB()**: 同上，支持旋转
- **LayoutSystem**: `updateProps.rotation = layoutComp.rotation` → 同步到渲染层
- **ShapeRenderer.updateRenderObject()**: 通过 `(renderObject as any)[key] = value` 将 rotation 写入 Pixi DisplayObject
- **RightPanel**: 已有旋转输入框，`rotation * 180 / Math.PI` 转换为度数显示

### 1.2 缺失部分

- **ResizeSystem**: 无旋转区域检测，无旋转拖拽逻辑
- **SelectionRenderSystem**: 选中框不随元素旋转（绘制的是 AABB 矩形，非旋转矩形）
- **CursorSystem**: 无旋转光标

## 2. 技术方案

### 2.1 核心实现位置：ResizeSystem

旋转和 resize 同属选中元素的变换操作，共享手柄位置检测逻辑。在 ResizeSystem 中扩展旋转功能是最自然的方案。

### 2.2 旋转区域检测

在 `updateHoverCursor()` 中扩展：先检测 resize 手柄命中，未命中时检测是否在角手柄外侧的旋转区域。

```typescript
// 旋转区域：距角手柄中心 tolerance ~ tolerance * 2.5 范围
const ROTATE_OUTER_TOLERANCE = HANDLE_HIT_TOLERANCE * 2.5;

// 只检测四个角手柄（tl/tr/br/bl）
const cornerHandles = handles.filter(h => ['tl', 'tr', 'br', 'bl'].includes(h.type));

for (const handle of cornerHandles) {
    const dist = Math.max(Math.abs(px - handle.x), Math.abs(py - handle.y));
    if (dist >= tolerance && dist < outerTolerance) {
        // 在旋转区域
        foundRotateHandle = handle.type;
        break;
    }
}
```

### 2.3 旋转拖拽逻辑

新增状态：
```typescript
// ResizeSystem 新增
private isRotating = false;
/** 旋转开始时指针相对旋转中心的角度 */
private rotateStartAngle = 0;
/** 旋转开始时元素的 rotation 值 */
private rotateStartRotation = 0;
/** 旋转中心（世界坐标） */
private rotateCenterX = 0;
private rotateCenterY = 0;
```

旋转开始：
```typescript
private startRotation(): void {
    const selected = this.selectionState.getSelectedArray();
    if (selected.length !== 1) return; // MVP 仅支持单选

    const entity = selected[0];
    const aabb = getWorldAABB(entity);

    // 旋转中心 = AABB 中心
    this.rotateCenterX = aabb.x + aabb.width / 2;
    this.rotateCenterY = aabb.y + aabb.height / 2;

    // 记录起始角度
    const dx = this.pointerComponent.x - this.rotateCenterX;
    const dy = this.pointerComponent.y - this.rotateCenterY;
    this.rotateStartAngle = Math.atan2(dy, dx);

    const layout = entity.getComponent(LayoutComponent);
    this.rotateStartRotation = layout?.rotation ?? 0;

    this.isRotating = true;
    this.world.isResizing = true; // 复用 isResizing 阻止其他系统
}
```

旋转中：
```typescript
private handleRotating(): void {
    const selected = this.selectionState.getSelectedArray();
    if (selected.length !== 1) return;

    const entity = selected[0];
    const layout = entity.getComponent(LayoutComponent);
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

    layout.rotation = this.rotateStartRotation + deltaAngle;
    layout.dirty = true;

    // 触发布局更新
    const layoutEvent = new LayoutEvent({ data: { entities: [entity] } });
    this.eventManager?.sendEvent(layoutEvent);
}
```

旋转结束：
```typescript
private handleRotateEnd(): void {
    this.world.emit(StageEvents.ENTITY_MOVE, {
        entities: this.selectionState.getSelectedArray().map(e => e.name),
    });
    this.isRotating = false;
    this.world.isResizing = false;
}
```

### 2.4 update() 流程改造

```typescript
update(): void {
    if (!this.pointerComponent) return;
    if (this.toolComponent && this.toolComponent.mode !== 'select') {
        this.resetCursor();
        return;
    }

    // 旋转中
    if (this.isRotating) {
        this.cursorComponent?.setCursor('crosshair', CursorPriority.ACTIVE_OPERATION);
        this.handleRotating();
        if (this.pointerComponent.hasPointerUp) {
            this.handleRotateEnd();
        }
        return;
    }

    // resize 中（已有逻辑）
    if (this.isResizing) { ... }

    // 悬停检测：先检测 resize 手柄，再检测旋转区域
    this.updateHoverCursor();

    // 点击检测：先检测 resize 手柄命中，再检测旋转区域命中
    if (this.pointerComponent.hasButtonDown(PointerButtons.PRIMARY)) {
        if (!this.checkHandleHit()) {
            this.checkRotateHit();
        }
    }
}
```

### 2.5 选中框旋转渲染

**MVP 阶段**: 选中框仍然使用 AABB（轴对齐包围盒）绘制。这意味着旋转后选中框会是一个更大的矩形包住旋转后的元素。这与 Figma 不同（Figma 的选中框跟随旋转），但实现简单，后续可优化。

**后续优化（非本次范围）**: SelectionRenderSystem 绘制旋转矩形而非 AABB，手柄位置也跟随旋转。

### 2.6 光标

MVP 使用 `crosshair` 光标表示旋转区域。后续可替换为自定义旋转图标 `url(data:image/svg+xml,...), auto`。

## 3. 涉及文件清单

| 文件 | 操作 | 改动内容 |
| --- | --- | --- |
| `src/engine/modules/select/ResizeSystem.ts` | **修改** | 新增旋转状态、旋转区域检测、旋转拖拽逻辑 |
| `src/engine/modules/cursor/CursorComponent.ts` | 无修改 | 已有 HOVER_HANDLE 和 ACTIVE_OPERATION 优先级，直接复用 |

仅需修改 1 个文件。

## 4. 详细改动点

### ResizeSystem.ts

1. **新增状态字段**: `isRotating`, `rotateStartAngle`, `rotateStartRotation`, `rotateCenterX/Y`, `hoveredRotate`
2. **修改 `update()`**: 在 isResizing 检测前增加 isRotating 分支
3. **修改 `updateHoverCursor()`**: resize 手柄未命中时，检测角手柄外侧旋转区域
4. **修改 `checkHandleHit()` → 返回 boolean**: 表示是否命中，未命中时在 update 中继续检测旋转
5. **新增 `checkRotateHit()`**: 检测点击是否在旋转区域，是则调用 `startRotation()`
6. **新增 `startRotation()`**: 记录起始角度和旋转中心
7. **新增 `handleRotating()`**: 每帧更新旋转角度
8. **新增 `handleRotateEnd()`**: 清理状态，发送 ENTITY_MOVE

## 5. 测试验证

### 5.1 手动测试清单

1. 单选元素 → 鼠标移到角手柄外侧 → 光标变为 crosshair
2. 从旋转区域拖拽 → 元素旋转 → 释放后角度保持
3. Shift + 拖拽 → 角度吸附 15° 步进（0°、15°、30°...）
4. 旋转后属性面板角度值正确
5. Ctrl+Z 撤回旋转
6. 多选时，角手柄外侧不显示旋转光标
7. 旋转后仍可 resize（手柄位置基于 AABB，仍可工作）
8. 旋转后拖拽元素位置正确

### 5.2 边界情况

- 旋转 360° 以上
- 快速拖拽旋转
- 旋转过程中按 Escape（应取消？MVP 不处理，松开鼠标结束）
- 元素很小时旋转区域与 resize 区域是否重叠（tolerance 参数需调优）
