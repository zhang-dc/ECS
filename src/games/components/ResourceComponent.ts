/**
 * 资源组件
 * 管理游戏中的所有资源
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';
import { ResourceType, ResourceEntry, ResourceChange } from '../data/ResourceTypes';

/**
 * 资源组件属性
 */
export interface ResourceComponentProps extends BaseComponentProps {
    // 可选的初始资源数据
    initialResources?: Partial<Record<ResourceType, number>>;
}

/**
 * 资源组件
 * 存储和管理游戏中的所有资源
 */
export class ResourceComponent extends BaseComponent {
    // 资源存储
    resources: Partial<Record<ResourceType, ResourceEntry>> = {};

    // 资源变动历史
    private changeHistory: ResourceChange[] = [];

    constructor(props: ResourceComponentProps = {}) {
        super(props);
        this.initializeResources(props.initialResources);
    }

    /**
     * 初始化资源
     */
    private initializeResources(initialData?: Partial<Record<ResourceType, number>>): void {
        // 默认资源配置
        const defaults: Record<ResourceType, ResourceEntry> = {
            [ResourceType.Money]: {
                type: ResourceType.Money,
                amount: 1000,
                maxStorage: 100000,
                productionRate: 0,
            },
            [ResourceType.Food]: {
                type: ResourceType.Food,
                amount: 500,
                maxStorage: 10000,
                productionRate: 0,
            },
            [ResourceType.Wood]: {
                type: ResourceType.Wood,
                amount: 0,
                maxStorage: 5000,
                productionRate: 0,
            },
            [ResourceType.Stone]: {
                type: ResourceType.Stone,
                amount: 0,
                maxStorage: 5000,
                productionRate: 0,
            },
            [ResourceType.Water]: {
                type: ResourceType.Water,
                amount: 50,
                maxStorage: 500,
                productionRate: 0,
            },
            [ResourceType.Mushroom]: {
                type: ResourceType.Mushroom,
                amount: 0,
                maxStorage: 1000,
                productionRate: 0,
            },
            [ResourceType.Grass]: {
                type: ResourceType.Grass,
                amount: 0,
                maxStorage: 2000,
                productionRate: 0,
            },
            [ResourceType.Labor]: {
                type: ResourceType.Labor,
                amount: 10,  // 可用劳动力
                maxStorage: 100,
                productionRate: 0,
            },
            [ResourceType.Tech]: {
                type: ResourceType.Tech,
                amount: 0,
                maxStorage: 1000,
                productionRate: 0,
            },
            [ResourceType.Trust]: {
                type: ResourceType.Trust,
                amount: 0,
                maxStorage: 100,
                productionRate: 0,
            },
            [ResourceType.Power]: {
                type: ResourceType.Power,
                amount: 0,
                maxStorage: 1000,
                productionRate: 0,
            },
        };

        // 合并自定义数据和默认值
        if (initialData) {
            for (const [key, value] of Object.entries(initialData)) {
                if (value !== undefined && defaults[key as ResourceType]) {
                    defaults[key as ResourceType].amount = value;
                }
            }
        }

        this.resources = defaults;
    }

    /**
     * 获取资源数量
     */
    getAmount(type: ResourceType): number {
        return this.resources[type]?.amount ?? 0;
    }

    /**
     * 获取资源信息
     */
    getResource(type: ResourceType): ResourceEntry | undefined {
        return this.resources[type];
    }

    /**
     * 检查是否有足够的资源
     */
    hasEnough(type: ResourceType, amount: number): boolean {
        return this.getAmount(type) >= amount;
    }

    /**
     * 添加资源
     */
    add(type: ResourceType, amount: number): boolean {
        const resource = this.resources[type];
        if (!resource) return false;

        const newAmount = resource.amount + amount;
        resource.amount = Math.min(
            newAmount,
            resource.maxStorage ?? Infinity
        );

        return true;
    }

    /**
     * 消耗资源
     */
    consume(type: ResourceType, amount: number): boolean {
        if (!this.hasEnough(type, amount)) return false;

        const resource = this.resources[type];
        if (resource) {
            resource.amount -= amount;
            return true;
        }
        return false;
    }

    /**
     * 转移资源 (从一地到另一地)
     */
    transfer(
        fromType: ResourceType,
        toType: ResourceType,
        amount: number
    ): boolean {
        if (!this.consume(fromType, amount)) return false;
        return this.add(toType, amount);
    }

    /**
     * 设置资源数量（覆盖）
     */
    setAmount(type: ResourceType, amount: number): void {
        const resource = this.resources[type];
        if (resource) {
            resource.amount = Math.max(0, Math.min(amount, resource.maxStorage ?? Infinity));
        }
    }

    /**
     * 记录资源变动
     */
    recordChange(type: ResourceType, amount: number, reason: string): void {
        this.changeHistory.push({
            type,
            amount,
            reason,
            timestamp: Date.now(),
        });

        // 限制历史记录长度
        if (this.changeHistory.length > 1000) {
            this.changeHistory = this.changeHistory.slice(-500);
        }
    }

    /**
     * 获取资源变动历史
     */
    getHistory(limit?: number): ResourceChange[] {
        if (limit) {
            return this.changeHistory.slice(-limit);
        }
        return this.changeHistory;
    }

    /**
     * 获取所有资源状态（简化版）
     */
    getAllResources(): Partial<Record<ResourceType, number>> {
        const result: Partial<Record<ResourceType, number>> = {};
        for (const [type, entry] of Object.entries(this.resources)) {
            result[type as ResourceType] = entry.amount;
        }
        return result;
    }

    /**
     * 获取资源变化量
     */
    getDailyChange(type: ResourceType): number {
        const recent = this.changeHistory.filter(
            r => r.type === type && Date.now() - r.timestamp < 86400000 // 24小时内
        );
        return recent.reduce((sum, r) => sum + r.amount, 0);
    }
}
