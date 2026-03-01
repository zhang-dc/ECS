# Commit & Push Skill

## 名称

commit-push

## 用途

自动分析项目变更，生成符合规范的commit信息，并推送到远程仓库。

## 触发方式

- Agent中直接调用: `@commit-push`
- Cursor命令面板: `Ctrl+Shift+P` -> "Commit & Push"

---

## 执行流程

### 第一步：获取变更信息

```bash
git status
git diff --stat
git diff
```

### 第二步：分析变更内容

根据变更文件分析所属类型：

| 文件类型 | Commit类型 |
|---------|-----------|
| 新增功能文件 | `feat` |
| 修复bug | `fix` |
| 重构代码 | `refactor` |
| 文档变更 | `docs` |
| 样式调整 | `style` |
| 测试相关 | `test` |
| 配置/构建 | `chore` |

### 第三步：生成Commit信息

- 格式: `[类型] 描述`
- 描述要求：简洁明了，不超过50字
- 示例：
  - `[feat] 添加拖拽系统`
  - `[fix] 修复选中框尺寸计算错误`
  - `[refactor] 重构渲染模块`

### 第四步：执行提交

```bash
# 询问用户确认commit信息
git add -A
git commit -m "[类型] 描述"
```

### 第五步：推送到远程

```bash
git push
```

---

## 错误处理

1. **无变更文件**: 提示用户当前没有需要提交的变更
2. **提交失败**: 显示错误信息，提示用户手动处理
3. **推送失败**: 提示用户检查网络连接或远程仓库状态

---

## 确认机制

在执行提交前，必须向用户确认：

1. 展示生成的commit信息
2. 询问是否确认提交
3. 用户确认后才执行 `git add` 和 `git commit`
