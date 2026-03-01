/**
 * 指标系统
 * 负责计算、更新和管理所有核心指标
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { IndicatorComponent } from '../../components/IndicatorComponent';

/**
 * 指标系统属性
 */
export interface IndicatorSystemProps {
    // 必须的 world 属性
    world: Stage;
    // 可选的初始指标数据
    initialData?: Partial<IndicatorComponent>;
}

/**
 * 指标系统
 * 负责游戏核心指标的更新、计算和联动
 */
export class IndicatorSystem extends System {
    private indicatorComponent?: IndicatorComponent;

    // 指标变动事件回调
    private onIndicatorChangeCallbacks: ((indicator: string, oldValue: number, newValue: number) => void)[] = [];

    // 危险状态事件回调
    private onDangerCallbacks: (() => void)[] = [];

    constructor(props: IndicatorSystemProps) {
        super(props);
    }

    /**
     * 获取指标组件（不存在则创建）
     */
    private getOrCreateIndicator(): IndicatorComponent {
        if (!this.indicatorComponent) {
            // 尝试获取已存在的指标组件
            const components = this.world.findComponents(IndicatorComponent);
            if (components.length > 0) {
                this.indicatorComponent = components[0];
            } else {
                // 创建新的指标组件
                this.indicatorComponent = new IndicatorComponent({});
                // 添加到 world
                // TODO: 需要通过 Entity 添加
            }
        }
        return this.indicatorComponent;
    }

    /**
     * 系统启动
     */
    start(): void {
        console.log('[IndicatorSystem] 指标系统启动');
        const indicator = this.getOrCreateIndicator();
        console.log(`[IndicatorSystem] 初始满意度: ${indicator.satisfaction}`);
        console.log(`[IndicatorSystem] 初始希望值: ${indicator.hope}`);
    }

    /**
     * 系统更新 - 每帧调用
     */
    update(): void {
        // 每日更新指标（需要与时间系统配合）
        // 这里只做基础衰减，实际由时间系统触发每日更新

        const indicator = this.getOrCreateIndicator();

        // 基础衰减（这些值会由时间系统控制更新频率）
        // 饥饿度自然衰减
        // 温暖度随季节变化
        // 满意度受多因素影响

        // 指标边界检查
        indicator.clamp();

        // 检查危险状态
        if (indicator.isInDanger()) {
            this.triggerDanger();
        }
    }

    // ==================== 指标修改接口 ====================

    /**
     * 修改满意度
     */
    modifySatisfaction(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.satisfaction;
        indicator.satisfaction = Math.max(0, Math.min(100, indicator.satisfaction + delta));
        this.triggerIndicatorChange('satisfaction', oldValue, indicator.satisfaction);
    }

    /**
     * 修改饥饿度
     */
    modifyHunger(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.hunger;
        indicator.hunger = Math.max(0, Math.min(100, indicator.hunger + delta));
        this.triggerIndicatorChange('hunger', oldValue, indicator.hunger);
    }

    /**
     * 修改温暖度
     */
    modifyWarmth(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.warmth;
        indicator.warmth = Math.max(0, Math.min(100, indicator.warmth + delta));
        this.triggerIndicatorChange('warmth', oldValue, indicator.warmth);
    }

    /**
     * 修改希望值
     */
    modifyHope(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.hope;
        indicator.hope = Math.max(0, Math.min(100, indicator.hope + delta));
        this.triggerIndicatorChange('hope', oldValue, indicator.hope);
    }

    /**
     * 修改安定度
     */
    modifyStability(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.stability;
        indicator.stability = Math.max(0, Math.min(100, indicator.stability + delta));
        this.triggerIndicatorChange('stability', oldValue, indicator.stability);
    }

    // ==================== 经济指标修改 ====================

    /**
     * 修改资金
     */
    modifyMoney(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.money;
        indicator.money = Math.max(0, indicator.money + delta);
        this.triggerIndicatorChange('money', oldValue, indicator.money);
    }

    /**
     * 修改粮食
     */
    modifyFood(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.food;
        indicator.food = Math.max(0, indicator.food + delta);
        this.triggerIndicatorChange('food', oldValue, indicator.food);
    }

    /**
     * 修改人口
     */
    modifyPopulation(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.population;
        indicator.population = Math.max(0, indicator.population + delta);
        this.triggerIndicatorChange('population', oldValue, indicator.population);
    }

    /**
     * 修改技术等级
     */
    modifyTechLevel(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.techLevel;
        indicator.techLevel = Math.max(0, Math.min(100, indicator.techLevel + delta));
        this.triggerIndicatorChange('techLevel', oldValue, indicator.techLevel);
    }

    /**
     * 修改外界联系
     */
    modifyOutsideConnection(delta: number): void {
        const indicator = this.getOrCreateIndicator();
        const oldValue = indicator.outsideConnection;
        indicator.outsideConnection = Math.max(0, Math.min(100, indicator.outsideConnection + delta));
        this.triggerIndicatorChange('outsideConnection', oldValue, indicator.outsideConnection);
    }

    // ==================== 指标联动计算 ====================

    /**
     * 每日指标更新
     * 由时间系统每天调用一次
     */
    dailyUpdate(): void {
        const indicator = this.getOrCreateIndicator();

        // 执行指标联动计算
        this.calculateIndicatorChain();

        // 基础自然衰减
        indicator.hunger = Math.max(0, indicator.hunger - 0.5);  // 每天饥饿度下降
        indicator.warmth = Math.max(0, indicator.warmth - 0.2);  // 每天温暖度下降

        // 边界检查
        indicator.clamp();

        // 检查危险状态
        if (indicator.isInDanger()) {
            this.triggerDanger();
        }
    }

    /**
     * 指标联动计算
     * 实现类似冰汽时代的连锁反应机制
     */
    private calculateIndicatorChain(): void {
        const indicator = this.getOrCreateIndicator();

        // 1. 饥饿度影响满意度
        if (indicator.hunger < 30) {
            indicator.satisfaction -= 0.5;
        } else if (indicator.hunger > 70) {
            indicator.satisfaction += 0.2;
        }

        // 2. 饥饿度影响希望值
        if (indicator.hunger < 20) {
            indicator.hope -= 0.5;
        }

        // 3. 满意度影响希望值
        if (indicator.satisfaction < 30) {
            indicator.hope -= 0.3;
        } else if (indicator.satisfaction > 70) {
            indicator.hope += 0.2;
        }

        // 4. 希望值影响安定度
        if (indicator.hope < 20) {
            indicator.stability -= 0.2;  // 可能发生动乱
        } else if (indicator.hope > 60) {
            indicator.stability += 0.1;
        }

        // 5. 温暖度影响满意度（冬季）
        if (indicator.warmth < 30) {
            indicator.satisfaction -= 0.3;
        }

        // 6. 安定度低可能导致满意度下降
        if (indicator.stability < 30) {
            indicator.satisfaction -= 0.2;
        }
    }

    /**
     * 获取产出效率
     * 基于满意度的生产效率修正
     */
    getProductionEfficiency(): number {
        const indicator = this.getOrCreateIndicator();
        // 满意度50为基准100%，每下降10点效率下降5%
        return 1 + (indicator.satisfaction - 50) / 200;
    }

    // ==================== 查询接口 ====================

    /**
     * 获取当前指标状态
     */
    getIndicators(): IndicatorComponent {
        return this.getOrCreateIndicator();
    }

    /**
     * 获取生活质量评分
     */
    getLifeQuality(): number {
        return this.getOrCreateIndicator().getLifeQuality();
    }

    /**
     * 是否处于危险状态
     */
    isInDanger(): boolean {
        return this.getOrCreateIndicator().isInDanger();
    }

    /**
     * 获取警告指标列表
     */
    getWarningIndicators(): string[] {
        return this.getOrCreateIndicator().getWarningIndicators();
    }

    // ==================== 事件系统 ====================

    /**
     * 触发指标变化事件
     */
    private triggerIndicatorChange(indicator: string, oldValue: number, newValue: number): void {
        this.onIndicatorChangeCallbacks.forEach(cb => cb(indicator, oldValue, newValue));
    }

    /**
     * 触发危险状态事件
     */
    private triggerDanger(): void {
        console.warn('[IndicatorSystem] 警告：指标处于危险状态！');
        this.onDangerCallbacks.forEach(cb => cb());
    }

    /**
     * 注册指标变化回调
     */
    onIndicatorChange(callback: (indicator: string, oldValue: number, newValue: number) => void): () => void {
        this.onIndicatorChangeCallbacks.push(callback);
        return () => {
            const index = this.onIndicatorChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.onIndicatorChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * 注册危险状态回调
     */
    onDanger(callback: () => void): () => void {
        this.onDangerCallbacks.push(callback);
        return () => {
            const index = this.onDangerCallbacks.indexOf(callback);
            if (index > -1) {
                this.onDangerCallbacks.splice(index, 1);
            }
        };
    }
}
