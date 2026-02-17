/**
 * 四叉树空间索引
 * 用于加速碰撞检测和视口裁剪中的空间查询
 */

export interface AABB {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface QuadTreeItem<T> {
    bounds: AABB;
    data: T;
}

const MAX_ITEMS = 8;
const MAX_DEPTH = 8;

export class QuadTree<T> {
    private bounds: AABB;
    private depth: number;
    private items: QuadTreeItem<T>[] = [];
    private children: QuadTree<T>[] | null = null;

    constructor(bounds: AABB, depth: number = 0) {
        this.bounds = bounds;
        this.depth = depth;
    }

    /** 清空四叉树 */
    clear(): void {
        this.items = [];
        if (this.children) {
            this.children.forEach(child => child.clear());
            this.children = null;
        }
    }

    /** 插入一个元素 */
    insert(item: QuadTreeItem<T>): void {
        // 如果有子节点，尝试插入子节点
        if (this.children) {
            const index = this.getChildIndex(item.bounds);
            if (index !== -1) {
                this.children[index].insert(item);
                return;
            }
        }

        this.items.push(item);

        // 如果超过容量且未达到最大深度，进行分裂
        if (this.items.length > MAX_ITEMS && this.depth < MAX_DEPTH && !this.children) {
            this.subdivide();

            // 重新分配现有元素
            const oldItems = this.items;
            this.items = [];
            oldItems.forEach(oldItem => {
                const index = this.getChildIndex(oldItem.bounds);
                if (index !== -1 && this.children) {
                    this.children[index].insert(oldItem);
                } else {
                    this.items.push(oldItem);
                }
            });
        }
    }

    /** 查询与给定区域相交的所有元素 */
    query(range: AABB, result: QuadTreeItem<T>[] = []): QuadTreeItem<T>[] {
        if (!this.intersects(this.bounds, range)) {
            return result;
        }

        this.items.forEach(item => {
            if (this.intersects(item.bounds, range)) {
                result.push(item);
            }
        });

        if (this.children) {
            this.children.forEach(child => {
                child.query(range, result);
            });
        }

        return result;
    }

    /** 获取四叉树中所有元素 */
    getAll(result: QuadTreeItem<T>[] = []): QuadTreeItem<T>[] {
        result.push(...this.items);
        if (this.children) {
            this.children.forEach(child => child.getAll(result));
        }
        return result;
    }

    /** 分裂为四个子节点 */
    private subdivide(): void {
        const { x, y, width, height } = this.bounds;
        const halfW = width / 2;
        const halfH = height / 2;
        const nextDepth = this.depth + 1;

        this.children = [
            // 右上
            new QuadTree<T>({ x: x + halfW, y, width: halfW, height: halfH }, nextDepth),
            // 左上
            new QuadTree<T>({ x, y, width: halfW, height: halfH }, nextDepth),
            // 左下
            new QuadTree<T>({ x, y: y + halfH, width: halfW, height: halfH }, nextDepth),
            // 右下
            new QuadTree<T>({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, nextDepth),
        ];
    }

    /** 获取元素应该插入的子节点索引，-1 表示跨越多个子节点 */
    private getChildIndex(itemBounds: AABB): number {
        if (!this.children) return -1;

        const { x, y, width, height } = this.bounds;
        const midX = x + width / 2;
        const midY = y + height / 2;

        const itemRight = itemBounds.x + itemBounds.width;
        const itemBottom = itemBounds.y + itemBounds.height;

        const fitsTop = itemBounds.y >= y && itemBottom <= midY;
        const fitsBottom = itemBounds.y >= midY && itemBottom <= y + height;
        const fitsLeft = itemBounds.x >= x && itemRight <= midX;
        const fitsRight = itemBounds.x >= midX && itemRight <= x + width;

        if (fitsTop && fitsRight) return 0;
        if (fitsTop && fitsLeft) return 1;
        if (fitsBottom && fitsLeft) return 2;
        if (fitsBottom && fitsRight) return 3;

        return -1;
    }

    /** 判断两个 AABB 是否相交 */
    private intersects(a: AABB, b: AABB): boolean {
        return !(
            a.x > b.x + b.width ||
            a.x + a.width < b.x ||
            a.y > b.y + b.height ||
            a.y + a.height < b.y
        );
    }
}
