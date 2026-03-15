# Canvas 画布功能需求文档（对标 Figma 基础能力）

## Context

当前项目基于 Pixi.js + ECS 架构实现了一个无限画布编辑器，已具备基本的图形绘制、选择、拖拽、缩放、文本编辑、Mind Map 等功能。为对标 Figma 基础画布能力，需要补齐缺失功能并打磨现有功能。

后续计划：按需求列表逐个生成需求文档和技术文档，分步实现。

---

## 一、缺失功能需求

### P0 - 基础交互必备

#### 1. 旋转交互 (Rotation Interaction)
- **描述**: 选中元素时，在四角手柄外侧区域显示旋转光标，拖拽实现旋转
- **要求**:
  - 悬停在角手柄外侧区域时显示旋转光标
  - 拖拽旋转，以元素中心为旋转原点
  - Shift 键约束为 15° 步进
  - 旋转角度实时显示在元素附近
  - 属性面板数值输入同步
  - 旋转后缩放手柄方向随之旋转
- **涉及模块**: ResizeSystem, SelectionRenderSystem, RightPanel

#### 2. 分组与解组 (Group / Ungroup)
- **描述**: 支持将多个元素编组为一个整体，双击进入组内编辑
- **要求**:
  - Ctrl+G 编组，Ctrl+Shift+G 解组
  - 组作为单一实体参与选择、移动、缩放
  - 双击进入组内，可单独编辑子元素
  - 组有独立的包围盒（自动计算子元素范围）
  - 支持嵌套分组
  - 图层面板中显示组的层级结构
- **涉及模块**: Entity 层级, SelectSystem, DragSystem, ResizeSystem, RenderSystem

#### 3. 右键上下文菜单 (Context Menu)
- **描述**: 右键点击画布/元素时弹出操作菜单
- **要求**:
  - 画布空白区域: 粘贴、全选、缩放选项
  - 单选元素: 复制/粘贴/删除、编组、图层顺序（置顶/置底/上移/下移）、锁定/解锁
  - 多选元素: 编组、对齐、分布
  - 支持键盘快捷键提示显示
  - 支持子菜单（如"对齐"展开二级菜单）
- **涉及模块**: 新增 ContextMenu UI 组件

#### 4. 光标状态反馈 (Cursor Feedback)
- **描述**: 根据当前工具和悬停状态切换光标样式
- **要求**:
  - Select 工具: 默认箭头，悬停元素时 move，悬停手柄时对应方向 resize
  - Hand 工具: grab / grabbing
  - 绘制工具 (Rect/Circle/Text): crosshair
  - 旋转区域: 自定义旋转光标
  - 文本编辑中: text
- **涉及模块**: Canvas.tsx, ToolSystem, ResizeSystem, InteractSystem

#### 5. 空格+拖拽平移 (Space + Drag Pan)
- **描述**: 按住空格键临时切换为手型工具，释放后恢复原工具
- **要求**:
  - 空格按下期间激活手型模式，光标变为 grab
  - 拖拽时平移视口，光标变为 grabbing
  - 释放空格后恢复之前的工具
  - 不影响文本编辑中的空格输入
- **涉及模块**: ToolSystem, KeyboardSystem, ViewportSystem

---

### P1 - 核心编辑能力

#### 6. 图层面板 (Layers Panel)
- **描述**: 左侧面板显示所有元素的图层列表
- **要求**:
  - 树形结构显示所有元素（含分组层级）
  - 点击图层选中对应元素，反之亦然
  - 可见性切换（眼睛图标）
  - 锁定切换（锁图标，锁定后不可选择/移动）
  - 拖拽排序调整图层顺序
  - 双击重命名
  - 多选支持（Shift/Ctrl）
- **涉及模块**: 新增 LayersPanel UI 组件, LayerSystem, SelectSystem

#### 7. 样式增强 - 渐变与特效 (Gradient & Effects)
- **描述**: 丰富元素的视觉样式能力
- **要求**:
  - 线性渐变、径向渐变填充
  - 多重填充叠加（多层 fill）
  - 描边: 粗细、样式（实线/虚线/点线）、位置（内/中/外）
  - 投影 (Drop Shadow): 颜色、偏移、模糊、扩散
  - 内阴影 (Inner Shadow)
  - 圆角: 支持四个角独立设置
- **涉及模块**: RenderComponent 各 Renderer, RightPanel

#### 8. 导出功能 (Export)
- **描述**: 将画布内容导出为常见格式
- **要求**:
  - 导出选中元素或整个画布
  - 支持 PNG (1x/2x/3x)
  - 支持 SVG
  - 支持 JSON（项目数据存储/恢复）
  - 导出预览
- **涉及模块**: 新增 ExportSystem, ExportDialog UI

#### 9. 像素对齐与吸附 (Pixel Snapping)
- **描述**: 移动和缩放时自动对齐到整数像素
- **要求**:
  - 默认开启，可通过设置关闭
  - 拖拽移动时坐标取整
  - 缩放时尺寸取整
  - 配合 Smart Guides 的吸附行为
- **涉及模块**: DragSystem, ResizeSystem, GuideSystem

#### 10. 文字排版控制 (Typography Controls)
- **描述**: 完善文本编辑的排版能力
- **要求**:
  - 字体选择器（系统字体列表）
  - 字号、字重、行高、字间距控制
  - 文本对齐: 左/中/右/两端对齐
  - 文本框模式: 自适应宽度 vs 固定宽度自动换行
  - 文本颜色
  - 上/下标、删除线
- **涉及模块**: RichTextComponent, TextRenderer, RightPanel

#### 11. 线段与箭头工具 (Line & Arrow Tool)
- **描述**: 绘制直线和带箭头的线段
- **要求**:
  - 点击拖拽绘制直线
  - Shift 约束为 0°/45°/90°
  - 支持箭头端点样式（无/箭头/圆点/菱形）
  - 线宽、颜色、虚线样式
  - 选中后可拖拽端点调整
- **涉及模块**: 新增 LineTool, LineRenderer 增强, ToolSystem

---

### P2 - 进阶设计能力

#### 12. 钢笔工具 / 矢量路径 (Pen Tool / Vector Path)
- **描述**: 贝塞尔曲线绘制和路径编辑
- **要求**:
  - 点击添加锚点，拖拽产生曲线手柄
  - 闭合/开放路径
  - 编辑模式: 移动锚点、调整手柄、添加/删除锚点
  - 路径转换为填充形状
- **涉及模块**: 新增 PenTool, PathRenderer, PathEditSystem

#### 13. Frame / 画框 (Frame Container)
- **描述**: 类似 Figma 的 Frame 概念，作为设计容器
- **要求**:
  - 创建固定尺寸画框
  - 内容裁切（超出部分不可见）
  - 子元素相对于 Frame 定位
  - 常用设备预设尺寸
  - 嵌套 Frame
- **涉及模块**: 新增 FrameComponent, FrameRenderer, ClipSystem

#### 14. 布尔运算 (Boolean Operations)
- **描述**: 对两个或多个形状进行布尔运算
- **要求**:
  - 合并 (Union)
  - 减去 (Subtract)
  - 相交 (Intersect)
  - 排除 (Exclude)
  - 结果可展平为路径
- **涉及模块**: 新增 BooleanSystem, 依赖 PathRenderer

#### 15. 约束与自动布局 (Constraints & Auto Layout)
- **描述**: 元素间的约束关系和自动排版
- **要求**:
  - 固定约束: 左/右/上/下/中心/缩放
  - Auto Layout: 水平/垂直排列、间距、padding
  - Hug Contents / Fill Container
- **涉及模块**: 新增 ConstraintComponent, AutoLayoutSystem

#### 16. 标尺与参考线 (Ruler & Guides)
- **描述**: 画布顶部和左侧标尺，可拖出参考线
- **要求**:
  - 水平/垂直标尺，跟随缩放和平移
  - 从标尺拖出参考线
  - 参考线吸附
  - 显示/隐藏切换
- **涉及模块**: 新增 RulerSystem, RulerRenderer

---

## 二、现有功能打磨需求

### M1 - 选择系统优化
- 框选增加「完全包含」模式（默认相交，按住某键切换）
- 重叠元素点击穿透（连续点击依次选中下层）
- 元素锁定能力（锁定后不可选中、移动）
- **涉及文件**: `src/engine/modules/select/SelectSystem.ts`

### M2 - 缩放手柄增强
- 旋转后手柄方向随旋转角度修正
- 等比缩放的视觉提示（如虚线辅助线）
- 文字元素缩放时调整字号而非拉伸
- **涉及文件**: `src/engine/modules/select/ResizeSystem.ts`, `SelectionRenderSystem.ts`

### M3 - 拖拽系统增强
- Alt+拖拽复制纳入 undo 历史
- 拖拽过程中显示距离数值标注
- 移动时默认对齐整数像素
- **涉及文件**: `src/engine/modules/drag/DragSystem.ts`

### M4 - Smart Guides 增强
- 增加等间距提示（多元素间等距分布提示）
- 吸附时显示距离数值
- **涉及文件**: `src/engine/modules/guide/GuideSystem.ts`, `GridRenderSystem.ts`

### M5 - 视口控制增强
- Ctrl+0 缩放到 100%
- Ctrl+1 适应屏幕
- Ctrl+2 缩放到选中元素
- 双指触控板手势验证与优化
- **涉及文件**: `src/engine/modules/viewport/ViewportSystem.ts`

### M6 - 属性面板增强
- 数值输入框支持拖拽调整（左右拖拽改值）
- 集成专业颜色选择器（替代原生 input[type=color]）
- 多选混合状态显示（不同值显示 "Mixed"）
- **涉及文件**: `src/ui/RightPanel.tsx`

### M7 - 键盘快捷键补全
- 方向键微调 1px，Shift+方向键 10px
- Ctrl+G 编组 / Ctrl+Shift+G 解组
- Ctrl+] 上移一层 / Ctrl+[ 下移一层
- **涉及文件**: `src/engine/modules/keyboard/KeyboardSystem.ts`

### M8 - 性能优化
- 大量元素场景压测（1000+ 元素）
- 文字在不同缩放比下的清晰度优化
- QuadTree 动态世界边界（替代硬编码）
- **涉及文件**: `src/engine/modules/hitTest/HitTestSystem.ts`, `RenderSystem.ts`

---

## 三、实施路线建议

### Phase 1 - 基础交互完善
1. 光标状态反馈 (需求4)
2. 空格+拖拽平移 (需求5)
3. 旋转交互 (需求1)
4. 右键上下文菜单 (需求3)
5. 选择系统优化 (M1)
6. 键盘快捷键补全 (M7)

### Phase 2 - 核心编辑能力
7. 分组与解组 (需求2)
8. 图层面板 (需求6)
9. 像素对齐与吸附 (需求9)
10. Smart Guides 增强 (M4)
11. 拖拽系统增强 (M3)
12. 缩放手柄增强 (M2)

### Phase 3 - 样式与输出
13. 样式增强 (需求7)
14. 文字排版控制 (需求10)
15. 属性面板增强 (M6)
16. 线段与箭头工具 (需求11)
17. 导出功能 (需求8)

### Phase 4 - 进阶能力
18. Frame / 画框 (需求13)
19. 钢笔工具 (需求12)
20. 布尔运算 (需求14)
21. 标尺与参考线 (需求16)
22. 约束与自动布局 (需求15)

### Phase 5 - 性能与体验
23. 性能优化 (M8)
24. 视口控制增强 (M5)
