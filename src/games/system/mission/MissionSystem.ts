/**
 * 任务系统
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { MissionConfig, MissionStatus, MissionType, MainMissions } from '../../data/MissionTypes';

interface MissionInstance {
    config: MissionConfig;
    status: MissionStatus;
    progress: number;
    daysRemaining?: number;
}

export interface MissionSystemProps {
    world: Stage;
}

export class MissionSystem extends System {
    private missions: Map<string, MissionInstance> = new Map();
    private currentMission?: MissionInstance;

    constructor(props: MissionSystemProps) {
        super(props);
    }

    start(): void {
        console.log('[MissionSystem] 任务系统启动');
        this.initializeMissions();
    }

    private initializeMissions(): void {
        MainMissions.forEach(config => {
            this.missions.set(config.id, {
                config,
                status: MissionStatus.Locked,
                progress: 0,
                daysRemaining: config.timeLimit,
            });
        });
        this.checkMissionUnlocks(1991);
    }

    checkMissionUnlocks(year: number): void {
        this.missions.forEach((instance, id) => {
            if (instance.status === MissionStatus.Locked) {
                if (this.canUnlock(instance.config, year)) {
                    instance.status = MissionStatus.Available;
                    console.log(`[MissionSystem] 任务解锁: ${instance.config.title}`);
                }
            }
        });
    }

    private canUnlock(config: MissionConfig, year: number): boolean {
        if (year < config.unlockYear) return false;
        for (const prereqId of config.prerequisiteMissions) {
            const prereq = this.missions.get(prereqId);
            if (!prereq || prereq.status !== MissionStatus.Completed) {
                return false;
            }
        }
        return true;
    }

    acceptMission(missionId: string): boolean {
        const mission = this.missions.get(missionId);
        if (!mission || mission.status !== MissionStatus.Available) {
            return false;
        }
        mission.status = MissionStatus.InProgress;
        this.currentMission = mission;
        return true;
    }

    updateMissionProgress(targetType: string, targetId: string, amount: number): void {
        if (!this.currentMission) return;

        this.currentMission.config.targets.forEach(target => {
            if (target.type === targetType && target.targetId === targetId) {
                target.current += amount;
                if (target.current >= target.required) {
                    this.completeMission();
                }
            }
        });
    }

    private completeMission(): void {
        if (!this.currentMission) return;
        this.currentMission.status = MissionStatus.Completed;
        this.currentMission.progress = 100;
        console.log(`[MissionSystem] 任务完成: ${this.currentMission.config.title}`);
        this.currentMission = undefined;
    }

    getCurrentMission(): MissionConfig | undefined {
        return this.currentMission?.config;
    }

    getAllMissions(): MissionInstance[] {
        return Array.from(this.missions.values());
    }

    getAvailableMissions(): MissionConfig[] {
        return Array.from(this.missions.values())
            .filter(m => m.status === MissionStatus.Available)
            .map(m => m.config);
    }

    dailyUpdate(): void {
        if (this.currentMission?.daysRemaining !== undefined) {
            this.currentMission.daysRemaining--;
            if (this.currentMission.daysRemaining <= 0) {
                this.currentMission.status = MissionStatus.Failed;
                console.log(`[MissionSystem] 任务失败: ${this.currentMission.config.title}`);
                this.currentMission = undefined;
            }
        }
    }
}
