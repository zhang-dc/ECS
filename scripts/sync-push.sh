#!/usr/bin/env bash
#
# sync-push.sh — 同步并推送到所有远端
#
# 流程：
# 1. fetch 所有远端
# 2. 找到最新的远端分支
# 3. 将本地 rebase 到最新版本
# 4. 推送到所有远端（落后的远端用 force-with-lease）
#

set -euo pipefail

BRANCH="main"
REMOTES=("craft" "zhangdc")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[sync]${NC} $*"; }
warn()  { echo -e "${YELLOW}[sync]${NC} $*"; }
error() { echo -e "${RED}[sync]${NC} $*" >&2; }

# 检查是否在 git 仓库中
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    error "不在 git 仓库中"
    exit 1
fi

# 检查工作区是否干净（允许 untracked files）
if ! git diff --quiet || ! git diff --cached --quiet; then
    error "工作区有未提交的修改，请先 commit 或 stash"
    exit 1
fi

# 1. Fetch 所有远端
info "正在 fetch 所有远端..."
for remote in "${REMOTES[@]}"; do
    if git remote get-url "$remote" &>/dev/null; then
        git fetch "$remote" "$BRANCH" 2>/dev/null || warn "fetch $remote 失败，跳过"
    else
        warn "远端 $remote 不存在，跳过"
    fi
done

# 2. 找到最新的远端分支
LOCAL_HEAD=$(git rev-parse HEAD)
LATEST_REF="HEAD"
LATEST_COMMIT="$LOCAL_HEAD"

for remote in "${REMOTES[@]}"; do
    ref="$remote/$BRANCH"
    if ! git rev-parse "$ref" &>/dev/null 2>&1; then
        continue
    fi
    remote_commit=$(git rev-parse "$ref")

    # 检查 remote 是否比当前 latest 更新
    if [ "$remote_commit" != "$LATEST_COMMIT" ]; then
        # 如果 latest 是 remote 的祖先，则 remote 更新
        if git merge-base --is-ancestor "$LATEST_COMMIT" "$remote_commit" 2>/dev/null; then
            LATEST_REF="$ref"
            LATEST_COMMIT="$remote_commit"
        # 如果 remote 不是 latest 的祖先，也不是 latest 是 remote 的祖先 → 分叉
        elif ! git merge-base --is-ancestor "$remote_commit" "$LATEST_COMMIT" 2>/dev/null; then
            # 分叉情况：取更新的那个（提交时间更晚的）
            latest_time=$(git log -1 --format=%ct "$LATEST_COMMIT")
            remote_time=$(git log -1 --format=%ct "$remote_commit")
            if [ "$remote_time" -gt "$latest_time" ]; then
                LATEST_REF="$ref"
                LATEST_COMMIT="$remote_commit"
            fi
        fi
    fi
done

# 3. 如果远端有新提交，rebase 本地到最新
if [ "$LATEST_COMMIT" != "$LOCAL_HEAD" ]; then
    if git merge-base --is-ancestor "$LOCAL_HEAD" "$LATEST_COMMIT"; then
        # 本地落后于远端，fast-forward
        info "本地落后于 $LATEST_REF，fast-forward..."
        git rebase "$LATEST_REF"
    elif git merge-base --is-ancestor "$LATEST_COMMIT" "$LOCAL_HEAD"; then
        # 本地领先于远端，无需 rebase
        info "本地领先于所有远端"
    else
        # 有分叉，rebase
        info "检测到分叉，rebase 到 $LATEST_REF..."
        git rebase "$LATEST_REF"
    fi
else
    info "本地已是最新"
fi

# 4. 推送到所有远端
NEW_HEAD=$(git rev-parse HEAD)

for remote in "${REMOTES[@]}"; do
    if ! git remote get-url "$remote" &>/dev/null; then
        continue
    fi

    ref="$remote/$BRANCH"
    if ! git rev-parse "$ref" &>/dev/null 2>&1; then
        # 远端分支不存在，直接 push
        info "push $remote (new branch)..."
        git push -u "$remote" "$BRANCH" 2>&1 && info "OK $remote" || error "FAIL $remote"
        continue
    fi

    remote_commit=$(git rev-parse "$ref")

    if [ "$remote_commit" = "$NEW_HEAD" ]; then
        info "OK $remote already up to date"
        continue
    fi

    if git merge-base --is-ancestor "$remote_commit" "$NEW_HEAD"; then
        # 远端是本地的祖先，正常 push
        info "push $remote..."
        git push "$remote" "$BRANCH" 2>&1 && info "OK $remote" || error "FAIL $remote"
    else
        # 远端不是本地的祖先（rebase 导致历史变化），用 force-with-lease
        warn "push $remote (force-with-lease, history changed by rebase)..."
        git push --force-with-lease "$remote" "$BRANCH" 2>&1 && info "OK $remote" || error "FAIL $remote"
    fi
done

info "同步完成！"
