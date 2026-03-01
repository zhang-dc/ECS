/**
 * 资源系统
 * 负责资源的生产、消耗、交易等逻辑
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { ResourceComponent } from '../../components/ResourceComponent';
import { ResourceType, ResourceChange } from '../../data/ResourceTypes';

/**
 * 资源系统属性
 */
export interface ResourceSystemProps {
    world: Stage;
}

/**
 * 资源系统
 * 负责游戏资源的统一管理和操作
 */
export class ResourceSystem extends System {
    private resourceComponent?: ResourceComponent;

    // 资源变动事件回调
    private onResourceChangeCallbacks: ((type: ResourceType, amount: number, reason: string) => void)[] = [];

    constructor(props: ResourceSystemProps) {
        super(props);
    }

    /**
     * 获取资源组件
     */
    private getOrCreateResource(): ResourceComponent {
        if (!this.resourceComponent) {
            const components = this.world.findComponents(ResourceComponent);
            if (components.length > 0) {
                this.resourceComponent = components[0];
            } else {
                this.resourceComponent = new ResourceComponent({});
            }
        }
        return this.resourceComponent;
    }

    /**
     * 系统启动
     */
    start(): void {
        console.log('[ResourceSystem] 资源系统启动');
        const resource = this.getOrCreateResource();
        console.log(`[ResourceSystem] 初始资金: ${resource.getAmount(ResourceType.Money)}`);
        console.log(`[ResourceSystem] 初始粮食: ${resource.getAmount(ResourceType.Food)}`);
    }

    /**
     * 系统更新
     */
    update(): void {
        // 资源系统的更新由时间系统驱动
        // 这里可以处理实时的资源变化
    }

    // ==================== 资源操作接口 ====================

    /**
     * 花费资源
     */
    spend(type: ResourceType, amount: number, reason: string): boolean {
        const resource = this.getOrCreateResource();

        if (!resource.consume(type, amount)) {
            console.warn(`[ResourceSystem] 资源不足: 需要 ${amount} ${type}, 当前 ${resource.getAmount(type)}`);
            return false;
        }

        resource.recordChange(type, -amount, reason);
        this.triggerResourceChange(type, -amount, reason);
        return true;
    }

    /**
     * 获得资源
     */
    gain(type: ResourceType, amount: number, reason: string): boolean {
        const resource = this.getOrCreateResource();

        if (!resource.add(type, amount)) {
            console.warn(`[ResourceSystem] 资源存储已满: ${type}`);
            return false;
        }

        resource.recordChange(type, amount, reason);
        this.triggerResourceChange(type, amount, reason);
        return true;
    }

    /**
     * 花费多种资源
     */
    spendMultiple(costs: { type: ResourceType; amount: number }[], reason: string): boolean {
        // 先检查是否所有资源都足够
        const resource = this.getOrCreateResource();
        for (const cost of costs) {
            if (!resource.hasEnough(cost.type, cost.amount)) {
                console.warn(`[ResourceSystem] 资源不足: ${cost.type}`);
                return false;
            }
        }

        // 扣除所有资源
        for (const cost of costs) {
            resource.consume(cost.type, cost.amount);
            resource.recordChange(cost.type, -cost.amount, reason);
            this.triggerResourceChange(cost.type, -cost.amount, reason);
        }

        return true;
    }

    /**
     * 获得多种资源
     */
    gainMultiple(gains: { type: ResourceType; amount: number }[], reason: string): boolean {
        const resource = this.getOrCreateResource();

        for (const gain of gains) {
            resource.add(gain.type, gain.amount);
            resource.recordChange(gain.type, gain.amount, reason);
            this.triggerResourceChange(gain.type, gain.amount, reason);
        }

        return true;
    }

    // ==================== 特殊资源操作 ====================

    /**
     * 消耗粮食（每日口粮）
     */
    consumeFood(personCount: number, amountPerPerson: number = 1): boolean {
        const totalFood = personCount * amountPerPerson;
        return this.spend(ResourceType.Food, totalFood, '每日消耗');
    }

    /**
     * 添加资金
     */
    addMoney(amount: number, reason: string): boolean {
        return this.gain(ResourceType.Money, amount, reason);
    }

    /**
     * 花费资金
     */
    spendMoney(amount: number, reason: string): boolean {
        return this.spend(ResourceType.Money, amount, reason);
    }

    /**
     * 检查资金是否足够
     */
    hasEnoughMoney(amount: number): boolean {
        return this.getOrCreateResource().hasEnough(ResourceType.Money, amount);
    }

    // ==================== 查询接口 ====================

    /**
     * 获取资源数量
     */
    getAmount(type: ResourceType): number {
        return this.getOrCreateResource().getAmount(type);
    }

    /**
     * 获取当前所有资源状态
     */
    getResources(): Partial<Record<ResourceType, number>> {
        return this.getOrCreateResource().getAllResources();
    }

    /**
     * 获取资源历史
     */
    getHistory(limit?: number): ResourceChange[] {
        return this.getOrCreateResource().getHistory(limit);
    }

    // ==================== 事件系统 ====================

    /**
     * 触发资源变动事件
     */
    private triggerResourceChange(type: ResourceType, amount: number, reason: string): void {
        this.onResourceChangeCallbacks.forEach(cb => cb(type, amount, reason));
    }

    /**
     * 注册资源变动回调
     */
    onResourceChange(callback: (type: ResourceType, amount: number, reason: string) => void): () => void {
        this.onResourceChangeCallbacks.push(callback);
        return () => {
            const index = this.onResourceChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.onResourceChangeCallbacks.splice(index, 1);
            }
        };
    }
}
