/**
 * 村民组件
 * 代表游戏中的单个村民
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';
import { VillagerType, WorkType, VillagerAttributes } from '../data/VillagerTypes';

/**
 * 村民数据
 */
export interface VillagerData extends BaseComponentProps {
    id: string;
    name: string;
    type: VillagerType;
    attributes: VillagerAttributes;
    currentWork: WorkType;
    homeId?: string;
}

/**
 * 村民组件
 */
export class VillagerComponent extends BaseComponent {
    id: string;
    name: string;
    type: VillagerType;
    attributes: VillagerAttributes;
    currentWork: WorkType = WorkType.Idle;
    homeId?: string;

    constructor(props: VillagerData) {
        super(props);

        this.id = props.id;
        this.name = props.name;
        this.type = props.type;
        this.attributes = props.attributes || this.createDefaultAttributes();
        this.currentWork = props.currentWork || WorkType.Idle;
        this.homeId = props.homeId;
    }

    /**
     * 创建默认属性
     */
    private createDefaultAttributes(): VillagerAttributes {
        return {
            age: 30,
            health: 80,
            satisfaction: 50,
            skill: 1,
            workEfficiency: 100,
        };
    }

    /**
     * 分配工作
     */
    assignWork(work: WorkType): void {
        this.currentWork = work;
    }

    /**
     * 获取工作产出
     */
    getWorkOutput(): number {
        return this.attributes.workEfficiency / 100;
    }

    /**
     * 获取工作效率
     */
    getEfficiency(): number {
        // 健康度和满意度影响效率
        const healthFactor = this.attributes.health / 100;
        const satisfactionFactor = this.attributes.satisfaction / 100;
        return (this.attributes.workEfficiency / 100) * healthFactor * satisfactionFactor;
    }

    /**
     * 每日状态更新
     */
    dailyUpdate(): void {
        // 健康度自然变化
        if (this.attributes.health < 100) {
            this.attributes.health += 1;
        }

        // 满意度自然变化
        if (this.attributes.satisfaction < 100) {
            this.attributes.satisfaction += 0.5;
        }
    }

    /**
     * 是否是劳动力
     */
    isLabor(): boolean {
        return this.attributes.age >= 16 && this.attributes.age < 65;
    }
}
