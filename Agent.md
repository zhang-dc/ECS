# 编程 Agent 行为准则

## 一、项目结构维护准则

### 1.1 目录结构规范

- **保持现有架构不变**：遵循 `engine/games/ui/canvas` 四大模块划分
- **新增模块必须入对应目录**：
  - 引擎相关功能放 `src/engine/modules/`
  - 游戏逻辑放 `src/games/`
  - UI组件放 `src/ui/`
- **禁止在根目录创建业务代码**

### 1.2 文件命名规范

- 核心类文件：`PascalCase` (如 `Entity.ts`, `Stage.ts`)
- 组件/系统文件：`PascalCase` + 类型后缀 (如 `DragSystem.ts`, `MindMapPanel.tsx`)
- 工具函数：`camelCase` + 业务描述 (如 `deepClone.ts`)
- 类型/接口：`I` 前缀或 `PascalCase` (如 `IEntity.ts`)

---

## 二、模块化开发准则

### 2.1 ECS架构原则

- **Entity**: 仅作为组件容器，不包含业务逻辑
- **Component**: 只存储数据（状态），不包含方法
- **System**: 负责处理逻辑，按功能模块划分（如 `src/engine/modules/render/`）
- **保持System单一职责**：每个System只处理一种功能

### 2.2 模块间通信

- 通过 **Event/Message** 机制通信，禁止直接调用其他模块的内部方法
- 使用已有的 `EventSystem` 和 `HistorySystem`
- 跨模块依赖通过接口（`interface/`）定义

### 2.3 层级关系

```
Engine Core (Entity, Component, System, Stage)
    ↓
Modules (render, drag, select, etc.)
    ↓
Games/Scenes (mainTheme, gamePlay)
    ↓
UI Layer (React Components)
```

---

## 三、代码规范准则

### 3.1 TypeScript使用

- **严格类型**：所有函数参数、返回值必须有类型标注
- **禁止使用 `any`**：如需动态类型，使用 `unknown` 并做类型守卫
- **接口优先**：复杂对象使用 `interface` 定义结构

### 3.2 组件设计

- React组件：使用函数式组件 + Hooks
- ECS组件：继承 `BaseComponent` 基类
- UI组件：遵循单一职责，props接口独立定义

### 3.3 样式管理

- 使用CSS Module或Tailwind CSS
- 组件样式文件与组件同目录（如 `Canvas.css` 与 `Canvas.tsx`）

---

## 四、可持续维护准则

### 4.1 代码可读性

- **命名自解释**：变量/函数名应清晰表达意图，避免无意义命名（如 `data`, `temp`）
- **适当注释**：对复杂逻辑、算法、业务规则添加注释
- **保持函数短小**：单个函数不超过50行，复杂逻辑拆分为子函数

### 4.2 错误处理

- 所有异步操作必须有 `try-catch`
- 关键操作添加防御性检查
- 使用统一的错误日志机制

### 4.3 配置管理

- 全局配置放 `config/` 目录
- 业务配置避免硬编码，使用常量或配置文件

---

## 五、持久化与上下文维护准则

### 5.1 状态持久化设计

- **关键状态必须可序列化**：Entity数据、Component状态应能序列化为JSON
- **分离状态与视图**：状态存储在ECS层，UI仅负责展示
- **提供save/load接口**：每个持久化模块提供 `serialize()` 和 `deserialize()` 方法

### 5.2 上下文不丢失设计

- **使用Stage作为全局上下文容器**：所有Entity和System必须注册到Stage
- **避免全局变量**：通过Stage或Context传递状态
- **模块自包含**：每个模块独立管理自己的状态，不依赖隐式全局状态

### 5.3 依赖可追溯

- **显式依赖声明**：模块间依赖通过构造函数注入
- **接口隔离**：使用 `interface` 定义模块边界，避免直接引用实现
- **依赖方向统一**：上层模块依赖下层模块，禁止反向依赖

### 5.4 文档与可追溯性

- **模块必须有README**：说明模块职责、API、依赖关系
- **公共接口必须有JSDoc**：说明参数、返回值、异常情况
- **复杂逻辑必须有设计文档**：记录决策原因和架构思路

---

## 六、版本与发布准则

### 6.1 Git提交规范

- 提交信息格式：`[类型] 描述`（如 `[feat] 添加拖拽系统`）
- 类型：`feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- 每日工作结束后提交，避免大规模一次性提交

### 6.2 代码审查

- 提交PR前确保本地测试通过
- 遵循 ESLint 配置的代码规范
- 关键模块变更需要代码审查

---

## 七、Agent专属行为准则

### 7.1 修改前评估

- 修改核心类前评估影响范围
- 涉及跨模块改动需明确说明变更原因
- 重大架构调整需与用户确认

### 7.2 变更记录

- 每次代码变更记录在 `Agent.md` 或 CHANGELOG
- 说明变更内容、原因、影响范围

### 7.3 安全与权限

- 不执行未经确认的系统命令
- 不修改 `node_modules` 或配置文件以外的内容
- 不创建/删除非业务相关的文件
