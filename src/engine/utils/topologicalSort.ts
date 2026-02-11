import { System, SystemClass } from '../System';

export interface SystemEntry {
    system: System;
    /** 旧 API 兼容：如果同时提供了 systemIndex，作为无约束时的默认排序依据 */
    systemIndex?: number;
}

/**
 * 拓扑排序 —— 根据 System 类上的 before/after 静态属性排序
 *
 * 规则：
 * - SystemA.after = [SystemB] 表示 SystemB -> SystemA（B 在 A 之前）
 * - SystemA.before = [SystemB] 表示 SystemA -> SystemB（A 在 B 之前）
 * - 检测循环依赖并报错
 * - 对于没有约束关系的 System，保持原始顺序
 */
export function topologicalSort(entries: SystemEntry[]): SystemEntry[] {
    if (entries.length <= 1) return entries;

    // 构建 System 类 -> SystemEntry 的映射
    const classToEntry = new Map<SystemClass, SystemEntry>();
    for (const entry of entries) {
        const cls = entry.system.constructor as SystemClass;
        classToEntry.set(cls, entry);
    }

    // 构建有向图：edges[i] 包含 i 必须在其之前执行的所有节点索引
    // 即 edges[i] = [j, k] 表示 i 必须在 j 和 k 之前执行
    const n = entries.length;
    const adjList: Set<number>[] = Array.from({ length: n }, () => new Set());
    const inDegree: number[] = new Array(n).fill(0);

    // 建立 System 类 -> 索引的映射
    const classToIndex = new Map<SystemClass, number>();
    for (let i = 0; i < n; i++) {
        const cls = entries[i].system.constructor as SystemClass;
        classToIndex.set(cls, i);
    }

    // 解析约束关系
    for (let i = 0; i < n; i++) {
        const cls = entries[i].system.constructor as SystemClass;

        // after: [A, B] 表示 A -> 当前, B -> 当前（A、B 在当前之前）
        const afterList = (cls as any).after as SystemClass[] | undefined;
        if (afterList) {
            for (const dep of afterList) {
                const depIndex = classToIndex.get(dep);
                if (depIndex !== undefined && !adjList[depIndex].has(i)) {
                    adjList[depIndex].add(i);
                    inDegree[i]++;
                }
            }
        }

        // before: [A, B] 表示 当前 -> A, 当前 -> B（当前在 A、B 之前）
        const beforeList = (cls as any).before as SystemClass[] | undefined;
        if (beforeList) {
            for (const dep of beforeList) {
                const depIndex = classToIndex.get(dep);
                if (depIndex !== undefined && !adjList[i].has(depIndex)) {
                    adjList[i].add(depIndex);
                    inDegree[depIndex]++;
                }
            }
        }
    }

    // Kahn 算法拓扑排序
    const queue: number[] = [];
    for (let i = 0; i < n; i++) {
        if (inDegree[i] === 0) {
            queue.push(i);
        }
    }

    // 对入度为 0 的节点按原始顺序排序，保持稳定性
    queue.sort((a, b) => a - b);

    const result: SystemEntry[] = [];
    let processed = 0;

    while (queue.length > 0) {
        const current = queue.shift()!;
        result.push(entries[current]);
        processed++;

        // 收集所有可以解锁的节点
        const newReady: number[] = [];
        Array.from(adjList[current]).forEach(neighbor => {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                newReady.push(neighbor);
            }
        });
        // 按原始顺序排序，保持稳定性
        newReady.sort((a, b) => a - b);
        queue.push(...newReady);
    }

    if (processed !== n) {
        // 检测到循环依赖
        const remaining = entries
            .filter((_, i) => inDegree[i] > 0)
            .map(e => e.system.constructor.name);
        throw new Error(
            `System 执行顺序存在循环依赖: ${remaining.join(' -> ')}。` +
            `请检查 before/after 约束配置。`
        );
    }

    return result;
}
