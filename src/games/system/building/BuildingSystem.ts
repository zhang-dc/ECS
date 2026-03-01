/**
 * 建筑系统
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { BuildingComponent } from '../../components/BuildingComponent';
import { BuildingType, BuildingStatus, BuildingConfigs } from '../../data/BuildingTypes';

export interface BuildingSystemProps {
    world: Stage;
}

export class BuildingSystem extends System {
    private buildings: Map<string, BuildingComponent> = new Map();

    constructor(props: BuildingSystemProps) {
        super(props);
    }

    start(): void {
        console.log('[BuildingSystem] 建筑系统启动');
    }

    update(): void {
        // 更新建造进度
    }

    construct(type: BuildingType, position: { x: number; y: number }): BuildingComponent | null {
        const config = BuildingConfigs[type];
        if (!config) {
            console.error(`[BuildingSystem] 未知的建筑类型: ${type}`);
            return null;
        }

        const building = new BuildingComponent({
            id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            level: 1,
            status: BuildingStatus.UnderConstruction,
            position,
            buildProgress: 0,
            workers: [],
        });

        this.buildings.set(building.id, building);
        return building;
    }

    completeConstruction(buildingId: string): boolean {
        const building = this.buildings.get(buildingId);
        if (!building) return false;
        building.buildProgress = 100;
        building.activate();
        return true;
    }

    getAllBuildings(): BuildingComponent[] {
        return Array.from(this.buildings.values());
    }

    getBuildingsByType(type: BuildingType): BuildingComponent[] {
        return Array.from(this.buildings.values()).filter(b => b.type === type);
    }

    getStatistics() {
        const buildings = this.getAllBuildings();
        return {
            total: buildings.length,
            active: buildings.filter(b => b.status === BuildingStatus.Active).length,
            underConstruction: buildings.filter(b => b.status === BuildingStatus.UnderConstruction).length,
            damaged: buildings.filter(b => b.status === BuildingStatus.Damaged).length,
        };
    }

    canBuild(type: BuildingType, year: number, techLevel: number): boolean {
        const config = BuildingConfigs[type];
        if (!config) return false;
        if (config.unlockYear && year < config.unlockYear) return false;
        if (config.unlockTech && techLevel < config.unlockTech) return false;
        return true;
    }
}
