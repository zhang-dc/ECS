/**
 * 人口组件
 * 管理所有村民
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';
import { VillagerComponent } from './VillagerComponent';

/**
 * 人口组件属性
 */
export interface PopulationComponentProps extends BaseComponentProps {
    // 可选的初始村民数据
    initialVillagers?: VillagerComponent[];
}

/**
 * 人口组件
 */
export class PopulationComponent extends BaseComponent {
    villagers: VillagerComponent[] = [];

    // 人口统计
    totalPopulation: number = 0;
    workingPopulation: number = 0;
    idlePopulation: number = 0;
    laborPopulation: number = 0;

    constructor(props: PopulationComponentProps = {}) {
        super(props);

        if (props.initialVillagers) {
            this.villagers = props.initialVillagers;
            this.updateStatistics();
        }
    }

    /**
     * 添加村民
     */
    addVillager(villager: VillagerComponent): void {
        this.villagers.push(villager);
        this.updateStatistics();
    }

    /**
     * 移除村民
     */
    removeVillager(villagerId: string): boolean {
        const index = this.villagers.findIndex(v => v.id === villagerId);
        if (index > -1) {
            this.villagers.splice(index, 1);
            this.updateStatistics();
            return true;
        }
        return false;
    }

    /**
     * 获取村民
     */
    getVillager(id: string): VillagerComponent | undefined {
        return this.villagers.find(v => v.id === id);
    }

    /**
     * 获取所有村民
     */
    getAllVillagers(): VillagerComponent[] {
        return this.villagers;
    }

    /**
     * 获取特定类型的村民
     */
    getVillagersByType(type: string): VillagerComponent[] {
        return this.villagers.filter(v => v.type === type);
    }

    /**
     * 获取从事特定工作的村民
     */
    getVillagersByWork(workType: string): VillagerComponent[] {
        return this.villagers.filter(v => v.currentWork === workType);
    }

    /**
     * 获取可用劳动力
     */
    getAvailableLabor(): number {
        return this.villagers.filter(
            v => v.currentWork === 'idle' && v.isLabor()
        ).length;
    }

    /**
     * 获取总劳动力
     */
    getTotalLabor(): number {
        return this.villagers.filter(v => v.isLabor()).length;
    }

    /**
     * 更新统计信息
     */
    updateStatistics(): void {
        this.totalPopulation = this.villagers.length;
        this.workingPopulation = this.villagers.filter(
            v => v.currentWork !== 'idle'
        ).length;
        this.idlePopulation = this.totalPopulation - this.workingPopulation;
        this.laborPopulation = this.getTotalLabor();
    }

    /**
     * 获取平均满意度
     */
    getAverageSatisfaction(): number {
        if (this.villagers.length === 0) return 0;
        const total = this.villagers.reduce((sum, v) => sum + v.attributes.satisfaction, 0);
        return Math.round(total / this.villagers.length);
    }

    /**
     * 获取平均健康度
     */
    getAverageHealth(): number {
        if (this.villagers.length === 0) return 0;
        const total = this.villagers.reduce((sum, v) => sum + v.attributes.health, 0);
        return Math.round(total / this.villagers.length);
    }

    /**
     * 每日更新所有村民状态
     */
    dailyUpdate(): void {
        this.villagers.forEach(v => v.dailyUpdate());
    }
}
