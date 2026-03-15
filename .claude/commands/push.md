同步并推送代码到所有远端仓库（craft 和 zhangdc）。

执行 scripts/sync-push.sh 脚本，流程：
1. fetch 所有远端最新版本
2. 如果远端有本地没有的提交，rebase 到最新
3. 推送到所有远端（落后的远端用 force-with-lease 安全推送）

请直接执行：`bash scripts/sync-push.sh`

如果 rebase 有冲突，帮用户解决冲突后继续。
