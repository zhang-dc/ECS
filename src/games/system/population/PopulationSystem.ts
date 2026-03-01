/**
 * 人口系统
 * 负责村民管理、劳动分配等
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { PopulationComponent } from '../../components/PopulationComponent';
import { VillagerComponent } from '../../components/VillagerComponent';
import { VillagerType, WorkType, VillagerTypeLabels, WorkTypeLabels, VillagerAttributes } from '../../data/VillagerTypes';

/**
 * 人口系统属性
 */
export interface PopulationSystemProps {
    world: Stage;
}

/**
 * 人口系统
 * 负责游戏中的村民管理
 */
export class PopulationSystem extends System {
    private populationComponent?: PopulationComponent;

    // 人口变动事件回调
    private onPopulationChangeCallbacks: ((type: 'birth' | 'death' | 'immigration' | 'emigration', count: number) => void)[] = [];

    constructor(props: PopulationSystemProps) {
        super(props);
    }

    /**
     * 获取人口组件
     */
    private getOrCreatePopulation(): PopulationComponent {
        if (!this.populationComponent) {
            const components = this.world.findComponents(PopulationComponent);
            if (components.length > 0) {
                this.populationComponent = components[0];
            } else {
                this.populationComponent = new PopulationComponent({});
            }
        }
        return this.populationComponent;
    }

    /**
     * 系统启动
     */
    start(): void {
        console.log('[PopulationSystem] 人口系统启动');
        this.initializeStartingPopulation();
    }

    /**
     * 系统更新
     */
    update(): void {
        // 人口系统的更新由时间系统驱动
    }

    /**
     * 初始化起始人口 (1991年, 10户移民)
     */
    private initializeStartingPopulation(): void {
        const population = this.getOrCreatePopulation();

        // 初始村民数据（基于山海情角色）
        const initialVillagers: VillagerComponent[] = [
            new VillagerComponent({
                id: 'v_001',
                name: '马得福',
                type: VillagerType.Cadre,
                attributes: { age: 25, health: 90, satisfaction: 60, skill: 2, workEfficiency: 110 },
                currentWork: WorkType.Government,
            }),
            new VillagerComponent({
                id: 'v_002',
                name: '马喊水',
                type: VillagerType.Cadre,
                attributes: { age: 45, health: 75, satisfaction: 50, skill: 3, workEfficiency: 100 },
                currentWork: WorkType.Government,
            }),
            new VillagerComponent({
                id: 'v_003',
                name: '李水花',
                type: VillagerType.Skilled,
                attributes: { age: 22, health: 85, satisfaction: 45, skill: 2, workEfficiency: 105 },
                currentWork: WorkType.Farming,
            }),
            new VillagerComponent({
                id: 'v_004',
                name: '白校长',
                type: VillagerType.Skilled,
                attributes: { age: 50, health: 70, satisfaction: 55, skill: 4, workEfficiency: 95 },
                currentWork: WorkType.Education,
            }),
            new VillagerComponent({
                id: 'v_005',
                name: '李大有',
                type: VillagerType.Troublemaker,
                attributes: { age: 40, health: 80, satisfaction: 30, skill: 1, workEfficiency: 90 },
                currentWork: WorkType.Idle,
            }),
            new VillagerComponent({
                id: 'v_006',
                name: '马得宝',
                type: VillagerType.Normal,
                attributes: { age: 20, health: 90, satisfaction: 50, skill: 1, workEfficiency: 100 },
                currentWork: WorkType.Farming,
            }),
            new VillagerComponent({
                id: 'v_007',
                name: '白麦苗',
                type: VillagerType.Normal,
                attributes: { age: 18, health: 88, satisfaction: 45, skill: 1, workEfficiency: 95 },
                currentWork: WorkType.Farming,
            }),
            new VillagerComponent({
                id: 'v_008',
                name: '水旺',
                type: VillagerType.Normal,
                attributes: { age: 35, health: 82, satisfaction: 48, skill: 2, workEfficiency: 105 },
                currentWork: WorkType.Farming,
            }),
            new VillagerComponent({
                id: 'v_009',
                name: '陈金山',
                type: VillagerType.Cadre,
                attributes: { age: 38, health: 78, satisfaction: 65, skill: 3, workEfficiency: 100 },
                currentWork: WorkType.Government,
            }),
            new VillagerComponent({
                id: 'v_010',
                name: '凌一农',
                type: VillagerType.Skilled,
                attributes: { age: 48, health: 75, satisfaction: 70, skill: 5, workEfficiency: 110 },
                currentWork: WorkType.Mushroom,
            }),
        ];

        initialVillagers.forEach(v => population.addVillager(v));

        console.log(`[PopulationSystem] 初始人口: ${population.totalPopulation}`);
    }

    // ==================== 人口操作接口 ====================

    /**
     * 添加村民
     */
    addVillager(name: string, type: VillagerType, attributes?: Partial<VillagerAttributes>): VillagerComponent {
        const population = this.getOrCreatePopulation();

        const defaultAttributes: VillagerAttributes = { age: 30, health: 80, satisfaction: 50, skill: 1, workEfficiency: 100 };

        const villager = new VillagerComponent({
            id: `v_${Date.now()}`,
            name,
            type,
            attributes: attributes ? { ...defaultAttributes, ...attributes } : defaultAttributes,
            currentWork: WorkType.Idle,
        });

        population.addVillager(villager);
        this.triggerPopulationChange('immigration', 1);

        return villager;
    }

    /**
     * 移除村民
     */
    removeVillager(villagerId: string): boolean {
        const population = this.getOrCreatePopulation();
        const result = population.removeVillager(villagerId);

        if (result) {
            this.triggerPopulationChange('emigration', 1);
        }

        return result;
    }

    /**
     * 分配工作
     */
    assignWork(villagerId: string, work: WorkType): boolean {
        const population = this.getOrCreatePopulation();
        const villager = population.getVillager(villagerId);

        if (villager) {
            villager.assignWork(work);
            population.updateStatistics();
            return true;
        }
        return false;
    }

    /**
     * 批量分配工作
     */
    batchAssignWork(villagerIds: string[], work: WorkType): number {
        let assigned = 0;
        for (const id of villagerIds) {
            if (this.assignWork(id, work)) assigned++;
        }
        return assigned;
    }

    // ==================== 查询接口 ====================

    /**
     * 获取人口统计
     */
    getStatistics() {
        const population = this.getOrCreatePopulation();
        return {
            total: population.totalPopulation,
            working: population.workingPopulation,
            idle: population.idlePopulation,
            labor: population.laborPopulation,
            averageSatisfaction: population.getAverageSatisfaction(),
            averageHealth: population.getAverageHealth(),
        };
    }

    /**
     * 获取村民
     */
    getVillager(id: string): VillagerComponent | undefined {
        return this.getOrCreatePopulation().getVillager(id);
    }

    /**
     * 获取所有村民
     */
    getAllVillagers(): VillagerComponent[] {
        return this.getOrCreatePopulation().getAllVillagers();
    }

    /**
     * 获取可用劳动力
     */
    getAvailableLabor(): number {
        return this.getOrCreatePopulation().getAvailableLabor();
    }

    /**
     * 每日更新
     */
    dailyUpdate(): void {
        this.getOrCreatePopulation().dailyUpdate();
    }

    // ==================== 事件系统 ====================

    /**
     * 触发人口变动事件
     */
    private triggerPopulationChange(type: 'birth' | 'death' | 'immigration' | 'emigration', count: number): void {
        this.onPopulationChangeCallbacks.forEach(cb => cb(type, count));
    }

    /**
     * 注册人口变动回调
     */
    onPopulationChange(callback: (type: 'birth' | 'death' | 'immigration' | 'emigration', count: number) => void): () => void {
        this.onPopulationChangeCallbacks.push(callback);
        return () => {
            const index = this.onPopulationChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.onPopulationChangeCallbacks.splice(index, 1);
            }
        };
    }
}
