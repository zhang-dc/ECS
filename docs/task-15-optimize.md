# 任务15: 性能优化

## 任务目标

优化游戏性能，确保在Web端流畅运行。

## 依赖关系

- **前置依赖**: Task 1-14
- **后续16

## 实现依赖**: Task 内容

### 15.1 性能分析

```typescript
/**
 * 性能监控
 */
export class PerformanceMonitor {
    private frameTimes: number[] = [];
    private lastFrameTime: number = 0;
    
    // 性能指标
    averageFPS: number = 0;
    minFPS: number = 60;
    maxFPS: number = 60;
    
    start() {
        requestAnimationFrame(this.update.bind(this));
    }
    
    private update(timestamp: number) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        const fps = 1000 / deltaTime;
        this.frameTimes.push(fps);
        
        // 保持最近60帧的数据
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // 计算平均值
        this.averageFPS = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
        this.minFPS = Math.min(...this.frameTimes);
        this.maxFPS = Math.max(...this.frameTimes);
        
        // 输出性能日志
        if (this.averageFPS < 30) {
            console.warn(`[Performance] 低帧率: ${this.averageFPS.toFixed(1)} FPS`);
        }
    }
}
```

### 15.2 优化策略

#### 1. 渲染优化
```typescript
// 视锥剔除 - 只渲染可见区域
export class ViewportCulling {
    shouldRender(entity: Entity, viewport: Viewport): boolean {
        const bounds = entity.getBounds();
        return viewport.intersects(bounds);
    }
}

// 对象池 - 减少GC
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    
    constructor(factory: () => T) {
        this.factory = factory;
    }
    
    acquire(): T {
        return this.pool.pop() || this.factory();
    }
    
    release(obj: T) {
        this.pool.push(obj);
    }
}
```

#### 2. 数据优化
```typescript
// 脏标记 - 只更新变化的数据
export class DirtyFlagSystem {
    private dirtyEntities: Set<string> = new Set();
    
    markDirty(entityId: string) {
        this.dirtyEntities.add(entityId);
    }
    
    getDirtyEntities(): string[] {
        return Array.from(this.dirtyEntities);
    }
    
    clearDirty() {
        this.dirtyEntities.clear();
    }
}
```

#### 3. 缓存优化
```typescript
// 计算结果缓存
export class CacheSystem {
    private cache: Map<string, any> = new Map();
    
    get<T>(key: string, factory: () => T): T {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const value = factory();
        this.cache.set(key, value);
        return value;
    }
    
    invalidate(pattern?: string) {
        if (!pattern) {
            this.cache.clear();
        } else {
            // 清除匹配的模式
        }
    }
}
```

### 15.3 WebGL加速 (可选)

```typescript
// 使用WebGL进行批量渲染
export class BatchRenderSystem {
    private gl: WebGLRenderingContext;
    
    // 批量绘制调用
    drawBatch(entities: Entity[]) {
        // 合并顶点数据
        const vertices = this.mergeVertices(entities);
        
        // 单次绘制调用
        this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length);
    }
}
```

---

## 验证方法

### 性能测试清单
- [ ] 60 FPS稳定运行
- [ ] 内存使用稳定，无内存泄漏
- [ ] 长时间运行不卡顿
- [ ] 低配置设备可接受

### 性能基准
```
目标:
- 60 FPS @ 1080p
- 内存 < 200MB
- 加载时间 < 3秒
```

---

## 预计工时

3-4小时
