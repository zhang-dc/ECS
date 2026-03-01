# 任务14: 像素美术资源

## 任务目标

添加像素风格美术资源，包括场景、建筑、人物、UI元素等。

## 依赖关系

- **前置依赖**: Task 11 (UI系统)
- **后续依赖**: Task 15, 16

## 实现内容

### 14.1 美术资源规划

```
src/games/assets/
├── sprites/
│   ├── buildings/           # 建筑精灵
│   │   ├── house.png       # 民居
│   │   ├── mushroom_shed.png  # 菇棚
│   │   ├── well.png       # 井窖
│   │   ├── school.png     # 学校
│   │   ├── clinic.png     # 卫生站
│   │   └── power.png      # 发电站
│   │
│   ├── characters/         # 人物精灵
│   │   ├── villager_*.png # 村民 (多个变体)
│   │   ├── cadre.png      # 干部
│   │   ├── expert.png     # 专家
│   │   └── merchant.png   # 商人
│   │
│   ├── environment/        # 环境元素
│   │   ├── ground.png      # 地面
│   │   ├── tree.png       # 树木
│   │   ├── sandstorm.png  # 沙尘暴
│   │   └── water.png      # 水源
│   │
│   ├── effects/            # 特效
│   │   ├── fire.png       # 火/暖
│   │   ├── dust.png       # 尘土
│   │   └── sparkle.png    # 闪光/希望
│   │
│   └── ui/                 # UI元素
│       ├── icons.png       # 图标集
│       ├── bars.png        # 进度条
│       └── buttons.png     # 按钮
│
└── backgrounds/
    ├── title.png           # 标题背景
    ├── gameplay.png        # 游戏背景
    └── ending.png         # 结局背景
```

### 14.2 像素风格规格

```typescript
/**
 * 像素美术规格
 */
export const PixelArtSpec = {
    // 基础分辨率
    baseResolution: {
        width: 320,
        height: 240,
    },
    
    // 缩放因子
    scaleFactor: 2,  // 显示时2倍放大
    
    // 调色板 (可用的颜色数量)
    colorPalette: 16,  // 16色
    
    // 建筑尺寸 (像素)
    buildingSizes: {
        small: { width: 16, height: 16 },   // 民居
        medium: { width: 24, height: 24 },  # 菇棚
        large: { width: 32, height: 32 },   # 学校
    },
    
    // 人物尺寸
    characterSize: {
        width: 16,
        height: 16,
        frames: 4,  // 行走动画帧数
    },
    
    // 动画
    animations: {
        fps: 8,           // 动画帧率
        walkFrames: 4,    # 行走动画帧数
        workFrames: 2,    // 工作动画帧数
    },
};
```

### 14.3 精灵表定义

```typescript
/**
 * 精灵表配置
 */
export const SpriteConfig = {
    buildings: {
        mushroomShed: {
            spritesheet: 'buildings/mushroom_shed.png',
            animations: {
                idle: { row: 0, frames: 1 },
                working: { row: 0, frames: 4 },
                damaged: { row: 1, frames: 1 },
            },
        },
    },
    
    characters: {
        villager: {
            spritesheet: 'characters/villager.png',
            animations: {
                idle: { row: 0, frames: 1 },
                walk: { row: 1, frames: 4 },
                work: { row: 2, frames: 2 },
            },
        },
    },
};
```

### 14.4 渲染系统扩展

```typescript
/**
 * 像素风格渲染
 */
export class PixelRenderSystem extends System {
    /**
     * 绘制像素建筑
     */
    drawBuilding(building: BuildingComponent, ctx: CanvasRenderingContext2D) {
        const sprite = this.getSprite(building.type);
        const frame = this.getAnimationFrame(building.type, 'idle');
        
        // 像素级绘制 (不进行抗锯齿)
        ctx.imageSmoothingEnabled = false;
        
        ctx.drawImage(
            sprite,
            frame.x, frame.y,
            this.buildingSize.width, this.buildingSize.height,
            building.position.x,
            building.position.y,
            this.buildingSize.width * PixelArtSpec.scaleFactor,
            this.buildingSize.height * PixelArtSpec.scaleFactor
        );
    }
}
```

---

## 验证方法

### 手动测试清单
- [ ] 所有精灵正确加载
- [ ] 动画流畅播放
- [ ] 像素风格统一
- [ ] UI图标清晰可辨

---

## 预计工时

5-8小时 (美术资源制作)

---

## 备注

如需专业像素美术，可考虑：
1. 使用 Aseprite 工具制作
2. 购买/授权像素素材包
3. 使用 AI 生成辅助 (如 Midjourney)
