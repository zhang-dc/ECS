# 需求文档：光标状态反馈 (Cursor Feedback)

> Phase 1 - 需求 4 | 优先级: P0

## 1. 背景

当前画布仅在悬停 resize 手柄时切换光标样式，其余场景（工具切换、悬停元素、拖拽中、文本编辑等）均使用浏览器默认光标。这导致用户缺乏操作预期，交互体验远低于 Figma 等成熟编辑器。

## 2. 目标

根据当前工具模式、交互状态、悬停目标，实时切换画布光标样式，让用户在操作前就能预判行为。

## 3. 功能需求

### 3.1 工具模式光标

| 工具模式 | 默认光标 | 说明 |
|---------|---------|------|
| Select (V) | `default` | 标准箭头 |
| Hand (H) | `grab` | 手型，表示可拖拽画布 |
| Rect (R) | `crosshair` | 十字线，表示绘制模式 |
| Circle (O) | `crosshair` | 十字线 |
| Text (T) | `text` | 文本光标 |
| Image (I) | `crosshair` | 十字线 |
| MindMap (M) | `crosshair` | 十字线 |

### 3.2 交互状态光标（覆盖工具默认光标）

| 交互状态 | 光标 | 触发条件 |
|---------|------|---------|
| 拖拽画布中 | `grabbing` | Hand 工具拖拽中 |
| 悬停可选元素 | `move` | Select 工具 + 指针在元素上方 |
| 拖拽元素中 | `move` | Select 工具 + 拖拽选中元素 |
| 悬停 resize 手柄 | 方向 resize 光标 | Select 工具 + 指针在手柄附近 |
| resize 中 | 对应方向 resize 光标 | 拖拽 resize 手柄中 |
| 框选中 | `crosshair` | Select 工具 + 空白区域拖拽 |
| 文本编辑中 | `text` | 双击文本进入编辑模式 |
| 绘制图形中 | `crosshair` | Rect/Circle 工具拖拽中 |

### 3.3 光标优先级（从高到低）

1. **活跃操作**: resize 中 / 拖拽元素中 / 拖拽画布中 / 绘制中 / 框选中
2. **悬停检测**: resize 手柄悬停 > 元素悬停
3. **工具默认**: 当前工具的默认光标

### 3.4 resize 手柄光标映射

| 手柄位置 | 光标 |
|---------|------|
| 上(t) / 下(b) | `ns-resize` |
| 左(l) / 右(r) | `ew-resize` |
| 左上(tl) / 右下(br) | `nwse-resize` |
| 右上(tr) / 左下(bl) | `nesw-resize` |

> 注：后续实现旋转功能后，resize 光标需随元素旋转角度动态调整方向。

## 4. 非功能需求

- 光标切换延迟 < 16ms（单帧内完成）
- 不引入额外 DOM 操作开销（复用现有 `#canvas-mask` style.cursor）
- 自定义光标图标（如旋转光标）预留扩展接口

## 5. 验收标准

- [ ] 切换到 Hand 工具时，光标立即变为 `grab`
- [ ] Hand 工具拖拽中，光标变为 `grabbing`
- [ ] 切换到 Rect/Circle/Image/MindMap 工具时，光标变为 `crosshair`
- [ ] 切换到 Text 工具时，光标变为 `text`
- [ ] Select 工具下悬停元素时，光标变为 `move`
- [ ] Select 工具下悬停 resize 手柄时，显示对应方向 resize 光标
- [ ] 拖拽元素过程中，光标保持 `move`
- [ ] resize 过程中，光标锁定为对应方向
- [ ] 框选过程中，光标变为 `crosshair`
- [ ] 工具切换后光标立即更新
- [ ] 文本编辑中光标为 `text`
