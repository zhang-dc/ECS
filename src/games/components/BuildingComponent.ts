/**
 * 建筑组件
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';
import { BuildingType, BuildingStatus, BuildingConfig, BuildingConfigs } from '../data/BuildingTypes';

/**
 * 建筑数据
 */
export interface BuildingData extends BaseComponentProps {
    id: string;
    type: BuildingType;
    level: number;
    status: BuildingStatus;
    position: { x: number; y: number };
    buildProgress: number;
    workers: string[];
}

/**
 * 建筑组件
 */
export class BuildingComponent extends BaseComponent {
    id: string;
    type: BuildingType;
    level: number = 1;
    status: BuildingStatus = BuildingStatus.UnderConstruction;
    position: { x: number; y: number };
    buildProgress: number = 0;
    workers: string[] = [];

    constructor(props: BuildingData) {
        super(props);
        this.id = props.id;
        this.type = props.type;
        this.level = props.level || 1;
        this.status = props.status || BuildingStatus.UnderConstruction;
        this.position = props.position || { x: 0, y: 0 };
        this.buildProgress = props.buildProgress || 0;
        this.workers = props.workers || [];
    }

    getConfig(): BuildingConfig {
        return BuildingConfigs[this.type];
    }

    activate(): void {
        this.status = BuildingStatus.Active;
    }

    upgrade(): boolean {
        const config = this.getConfig();
        if (this.level >= config.maxLevel) return false;
        this.level++;
        return true;
    }

    damage(): void {
        if (this.status === BuildingStatus.Active) {
            this.status = BuildingStatus.Damaged;
        }
    }

    repair(): void {
        this.status = BuildingStatus.Active;
    }
}
