# 任务清单汇总

## 阶段一: 基础设施搭建 (预计工时: 12-16小时)

| 任务ID | 任务名称 | 预计工时 | 依赖 | 验证方式 |
|-------|---------|---------|------|---------|
| Task 1 | 游戏主场景框架 | 2-3h | 无 | 自动化测试 + 控制台输出 |
| Task 2 | 核心指标系统 | 3-4h | Task 1 | 单元测试 + 控制台验证 |
| Task 3 | 基础资源系统 | 3h | Task 2 | 资源增减测试 |
| Task 4 | 时间推进系统 | 2-3h | Task 1 | 时间推进测试 |

## 阶段二: 核心玩法实现 (预计工时: 20-25小时)

| 任务ID | 任务名称 | 预计工时 | 依赖 | 验证方式 |
|-------|---------|---------|------|---------|
| Task 5 | 人口管理系统 | 4-5h | Task 2,3 | 人口统计测试 |
| Task 6 | 建筑系统 | 4-5h | Task 3,5 | 建筑建造测试 |
| Task 7 | 产业发展系统 | 4-5h | Task 5,6 | 产业产出测试 |
| Task 8 | 任务系统 | 3-4h | Task 1-7 | 任务链测试 |

## 阶段三: 高级系统 (预计工时: 15-20小时)

| 任务ID | 任务名称 | 预计工时 | 依赖 | 验证方式 |
|-------|---------|---------|------|---------|
| Task 9 | 政策决策系统 | 3-4h | Task 8 | 政策效果测试 |
| Task 10 | 随机事件系统 | 3-4h | Task 4,8 | 事件触发测试 |
| Task 11 | 交互UI系统 | 4-5h | Task 1-10 | UI交互测试 |
| Task 12 | 结局判定系统 | 2-3h | Task 9,10,11 | 结局触发测试 |

## 阶段四: 内容与优化 (预计工时: 14-20小时)

| 任务ID | 任务名称 | 预计工时 | 依赖 | 验证方式 |
|-------|---------|---------|------|---------|
| Task 13 | 数值平衡调整 | 3-4h | Task 1-12 | 多周目测试 |
| Task 14 | 像素美术资源 | 5-8h | Task 11 | 资源加载测试 |
| Task 15 | 性能优化 | 3-4h | Task 1-14 | 性能基准测试 |
| Task 16 | 存档功能 | 3-4h | Task 1-15 | 存档功能测试 |

---

## 快速验证指南

### 阶段一验证点

**Task 1 验证:**
```bash
npm test -- --testPathPattern="GameManager"
# 预期: 测试通过，控制台输出 "[GameManager] 游戏初始化完成"
```

**Task 2 验证:**
```javascript
// 浏览器控制台
const indicator = world.findComponents(IndicatorComponent)[0];
console.log(indicator.getLifeQuality()); // 应该有值
console.log(indicator.isInDanger()); // 初始应该为false
```

**Task 3 验证:**
```javascript
// 资源增减
resource.add('money', 100);
resource.consume('money', 50);
console.log(resource.getAmount('money')); // 应该是1050
```

**Task 4 验证:**
```javascript
// 时间推进
const time = world.findComponents(TimeComponent)[0];
console.log(time.getDateString()); // 应该是 "1991年1月1日 春季"
```

### 阶段二验证点

**Task 5 验证:**
```javascript
// 人口统计
const pop = world.findComponents(PopulationComponent)[0];
console.log(pop.totalPopulation); // 应该是10
console.log(pop.getAvailableLabor()); // 应该有劳动力
```

**Task 6 验证:**
```javascript
// 建筑统计
const building = system.construct('well', {x:0,y:0}, 100);
console.log(building.status); // 应该是 "under_construction"
```

**Task 7 验证:**
```javascript
// 产业解锁
console.log(system.canUnlock('mushroom_farming', 1996, 1)); // true
console.log(system.canUnlock('mushroom_farming', 1995, 1)); // false
```

**Task 8 验证:**
```javascript
// 任务状态
const missions = system.getAllMissions();
console.log(missions[0].status); // 应该是 "available"
```

### 阶段三验证点

**Task 9-12 验证:**
- 通过UI交互进行端到端测试
- 验证事件触发、任务完成、结局触发

### 阶段四验证点

**Task 13-16 验证:**
- 数值平衡需要多周目测试
- 存档功能需要跨会话测试

---

## 总体时间估算

| 阶段 | 预计工时 | 累计 |
|------|---------|------|
| 阶段一 | 12-16h | 12-16h |
| 阶段二 | 20-25h | 32-41h |
| 阶段三 | 15-20h | 47-61h |
| 阶段四 | 14-20h | 61-81h |

**总计: 约 60-80 小时**
