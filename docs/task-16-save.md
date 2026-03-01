# 任务16: 存档功能

## 任务目标

实现游戏存档功能，支持保存和加载游戏进度。

## 依赖关系

- **前置依赖**: Task 1-15 (所有核心系统)

## 实现内容

### 16.1 存档数据结构

```typescript
/**
 * 存档数据
 */
export interface SaveData {
    // 版本信息
    version: string;
    timestamp: number;
    
    // 游戏状态
    gameState: {
        year: number;
        month: number;
        day: number;
        phase: GamePhase;
    };
    
    // 指标数据
    indicators: {
        satisfaction: number;
        hope: number;
        stability: number;
        hunger: number;
        warmth: number;
        
        money: number;
        food: number;
        population: number;
    };
    
    // 资源数据
    resources: Record<string, number>;
    
    // 人口数据
    villagers: VillagerData[];
    
    // 建筑数据
    buildings: BuildingData[];
    
    // 任务进度
    missions: {
        id: string;
        status: MissionStatus;
        progress: number;
    }[];
    
    // 已激活政策
    policies: string[];
    
    // 事件历史
    eventHistory: string[];
    
    // 当前结局
    currentEnding?: EndingType;
}

/**
 * 存档元数据
 */
export interface SaveMetadata {
    id: string;
    name: string;
    timestamp: number;
    playTime: number;  // 游玩时长(秒)
    year: number;
    phase: GamePhase;
    screenshot?: string;  // Base64截图
}
```

### 16.2 存档管理器

```typescript
/**
 * 存档管理器
 */
export class SaveManager {
    private saveDir: string = 'saves/';
    private maxSaves: number = 10;
    
    /**
     * 保存游戏
     */
    async saveGame(
        gameState: GameState,
        saveName: string
    ): Promise<SaveMetadata> {
        const saveData = this.collectSaveData(gameState);
        
        const metadata: SaveMetadata = {
            id: `save_${Date.now()}`,
            name: saveName,
            timestamp: Date.now(),
            playTime: gameState.playTime,
            year: gameState.year,
            phase: gameState.phase,
        };
        
        // 保存到本地存储
        const key = `game_save_${metadata.id}`;
        localStorage.setItem(key, JSON.stringify({
            metadata,
            data: saveData,
        }));
        
        // 更新存档列表
        this.updateSaveList(metadata);
        
        return metadata;
    }
    
    /**
     * 加载游戏
     */
    async loadGame(saveId: string): Promise<SaveData | null> {
        const key = `game_save_${saveId}`;
        const saved = localStorage.getItem(key);
        
        if (!saved) {
            console.error(`[SaveManager] 存档不存在: ${saveId}`);
            return null;
        }
        
        try {
            const parsed = JSON.parse(saved);
            return parsed.data as SaveData;
        } catch (e) {
            console.error(`[SaveManager] 存档解析失败: ${e}`);
            return null;
        }
    }
    
    /**
     * 获取存档列表
     */
    getSaveList(): SaveMetadata[] {
        const listKey = 'game_save_list';
        const list = localStorage.getItem(listKey);
        return list ? JSON.parse(list) : [];
    }
    
    /**
     * 删除存档
     */
    deleteSave(saveId: string): boolean {
        const key = `game_save_${saveId}`;
        localStorage.removeItem(key);
        
        // 更新列表
        const list = this.getSaveList();
        const newList = list.filter(s => s.id !== saveId);
        localStorage.setItem('game_save_list', JSON.stringify(newList));
        
        return true;
    }
    
    /**
     * 收集存档数据
     */
    private collectSaveData(gameState: GameState): SaveData {
        // 从各系统收集数据
        const indicatorSystem = this.world.findSystem(IndicatorSystem);
        const populationSystem = this.world.findSystem(PopulationSystem);
        const buildingSystem = this.world.findSystem(BuildingSystem);
        const missionSystem = this.world.findSystem(MissionSystem);
        
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            
            gameState: {
                year: gameState.year,
                month: gameState.month,
                day: gameState.day,
                phase: gameState.phase,
            },
            
            indicators: indicatorSystem.getIndicators(),
            resources: resourceSystem.getResources(),
            villagers: populationSystem.getVillagers(),
            buildings: buildingSystem.getBuildings(),
            missions: missionSystem.getMissionProgress(),
            policies: policySystem.getActivePolicies(),
            eventHistory: eventSystem.getEventHistory(),
        };
    }
    
    /**
     * 更新存档列表
     */
    private updateSaveList(metadata: SaveMetadata) {
        const list = this.getSaveList();
        list.unshift(metadata);
        
        // 限制存档数量
        if (list.length > this.maxSaves) {
            const toDelete = list.slice(this.maxSaves);
            toDelete.forEach(s => this.deleteSave(s.id));
            return list.slice(0, this.maxSaves);
        }
        
        localStorage.setItem('game_save_list', JSON.stringify(list));
    }
}
```

### 16.3 自动存档

```typescript
/**
 * 自动存档系统
 */
export class AutoSaveSystem extends System {
    private saveManager: SaveManager;
    private autoSaveInterval: number = 60;  // 秒
    private lastSaveTime: number = 0;
    
    constructor(props: SystemProps) {
        super(props);
        this.saveManager = new SaveManager();
    }
    
    update() {
        const now = Date.now();
        
        // 检查是否需要自动存档
        if (now - this.lastSaveTime > this.autoSaveInterval * 1000) {
            this.autoSave();
            this.lastSaveTime = now;
        }
    }
    
    private autoSave() {
        try {
            this.saveManager.saveGame(
                this.getGameState(),
                `自动存档 ${new Date().toLocaleString()}`
            );
            console.log('[AutoSave] 自动存档完成');
        } catch (e) {
            console.error('[AutoSave] 自动存档失败:', e);
        }
    }
}
```

---

## 验证方法

### 功能测试
- [ ] 手动保存/加载正常
- [ ] 自动存档正常
- [ ] 存档列表显示正确
- [ ] 删除存档正常
- [ ] 跨会话存档保留

### 数据完整性
- [ ] 所有系统状态正确保存
- [ ] 加载后游戏状态正确恢复
- [ ] 存档版本兼容

---

## 预计工时

3-4小时
