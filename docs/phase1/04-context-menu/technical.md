# 技术文档：右键上下文菜单 (Context Menu)

> Phase 1 - 需求 3

## 1. 现状分析

### 1.1 当前右键处理

`PointerSystem` 构造函数中：

```typescript
mask.oncontextmenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
};
```

右键被完全拦截，无后续处理。

### 1.2 右键事件在 ECS 中的传递

`InteractSystem` 已经检测 `PointerButtons.SECONDARY` 按钮并发送 `InteractEvent(PointerDown)`，但目前没有系统消费此事件。

### 1.3 已有操作的 Bridge 接口

ECSBridge 已暴露以下 actions（React hooks 可直接调用）：

- `copySelected()`, `pasteClipboard()`, `duplicateSelected()`
- `deleteSelected()`
- `bringToFront()`, `sendToBack()`
- `selectAll()`, `deselectAll()`
- `zoomToFit()`, `zoomTo(scale)`

## 2. 技术方案

### 2.1 核心设计：纯 React 组件

右键菜单是纯 UI 层功能，不涉及 ECS 帧循环。使用 React 组件 + CSS 实现，通过 ECSBridge actions 执行操作。

### 2.2 架构

```
Canvas.tsx
├── ContextMenu (新增 React 组件)
│   ├── 监听 mask 的 contextmenu 事件
│   ├── 根据右键位置和选中状态决定菜单内容
│   ├── 调用 ECSBridge actions 执行操作
│   └── 点击外部/Escape 关闭
```

### 2.3 ContextMenu 组件

```typescript
// src/ui/ContextMenu.tsx

interface ContextMenuProps {
    /** 菜单位置（屏幕坐标） */
    x: number;
    y: number;
    /** 当前选中状态 */
    selectedCount: number;
    /** 操作回调 */
    actions: {
        copySelected: () => void;
        pasteClipboard: () => void;
        duplicateSelected: () => void;
        deleteSelected: () => void;
        bringToFront: () => void;
        sendToBack: () => void;
        selectAll: () => void;
        zoomToFit: () => void;
        zoomTo: (scale: number) => void;
    };
    /** 关闭回调 */
    onClose: () => void;
}
```

### 2.4 右键事件捕获

在 `Canvas.tsx` 中，将 `PointerSystem` 的 `oncontextmenu` 拦截改为触发菜单：

```typescript
// Canvas.tsx 中
const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

// 在 mask 上监听 contextmenu
useEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        // 右键点击未选中元素时，先选中它
        // （通过 ECSBridge 检查 hitTest）
        setContextMenu({ x: e.clientX, y: e.clientY });
    };
    mask.addEventListener('contextmenu', handleContextMenu);
    return () => mask.removeEventListener('contextmenu', handleContextMenu);
}, [bridge]);
```

需要修改 `PointerSystem` 不再拦截 contextmenu（改由 Canvas.tsx 处理）。

### 2.5 右键选中逻辑

右键点击未选中元素时需要先选中它。这需要在 contextmenu 事件中获取当前 hitTest 结果。

方案：在 Canvas.tsx 的 contextmenu handler 中，使用 ECSBridge 的 viewport 信息将屏幕坐标转为世界坐标，然后调用新增的 `bridge.getEntityAtPosition(worldX, worldY)` 方法来查找元素。

```typescript
// ECSBridge 新增
getEntityAtPosition(worldX: number, worldY: number): Entity | null {
    // 遍历所有 SelectComponent 实体，检测 AABB 命中
}
```

### 2.6 菜单边界处理

菜单显示时检查是否超出画布容器边界，如果超出则翻转方向：

```typescript
// 如果菜单底部超出容器，向上弹出
// 如果菜单右侧超出容器，向左弹出
```

### 2.7 PointerSystem 修改

移除 `mask.oncontextmenu` 的 preventDefault，改为在 Canvas.tsx 层处理。PointerSystem 仍然需要拦截 contextmenu 以阻止浏览器默认菜单，但通过 Canvas.tsx 的 addEventListener 在同一个 mask 上先捕获。

实际上更简单的方案：保留 PointerSystem 的 preventDefault，Canvas.tsx 在 mask 上额外添加 contextmenu listener（capture phase），在 listener 中设置菜单状态。两者不冲突。

## 3. 涉及文件清单

| 文件 | 操作 | 改动内容 |
| --- | --- | --- |
| `src/ui/ContextMenu.tsx` | **新建** | 右键菜单 React 组件 |
| `src/ui/ContextMenu.css` | **新建** | 菜单样式 |
| `src/canvas/Canvas.tsx` | **修改** | 添加 contextmenu 状态和事件监听，渲染 ContextMenu |
| `src/engine/bridge/ECSBridge.ts` | **修改** | 新增 `getEntityAtPosition()` 方法 |

## 4. 测试验证

1. 空白区域右键 → 粘贴、全选、缩放选项
2. 选中元素右键 → 复制、粘贴、删除、图层操作
3. 未选中元素右键 → 先选中，再显示菜单
4. 多选右键 → 多选菜单
5. 点击菜单项 → 执行操作并关闭
6. 点击外部 → 关闭
7. Escape → 关闭
8. 靠近边界右键 → 菜单不超出
