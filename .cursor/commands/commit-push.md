# Commit & Push

## 说明

自动分析变更文件，生成规范的commit信息并推送到远程仓库。

## 执行流程

此命令会调用Agent执行以下操作：

1. 分析变更文件 (`git status`, `git diff`)
2. 生成符合规范的commit信息
3. 执行 `git add -> commit -> push`

## Commit规范

- 格式: `[类型] 描述`
- 类型: feat, fix, refactor, docs, style, test, chore
