/**
 * 结局系统
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { EndingConfig, EndingType, EndingConfigs } from '../../data/EndingTypes';

export interface EndingSystemProps {
    world: Stage;
}

export class EndingSystem extends System {
    private currentEnding?: EndingConfig;
    private isEndingTriggered: boolean = false;
    private finalScore: number = 0;

    constructor(props: EndingSystemProps) {
        super(props);
    }

    start(): void {
        console.log('[EndingSystem] 结局系统启动');
    }

    checkEnding(
        year: number,
        satisfaction: number,
        hope: number,
        population: number,
        money: number,
        buildings: string[],
        industries: string[]
    ): EndingConfig | null {
        if (this.isEndingTriggered) return null;

        // 检查失败结局
        const failedEnding = EndingConfigs.find(e => e.type === EndingType.Failed);
        if (failedEnding && this.checkConditions(failedEnding.conditions, { year, satisfaction, hope, population, money, buildings, industries })) {
            return this.triggerEnding(failedEnding);
        }

        // 检查成功结局
        for (const ending of EndingConfigs) {
            if (ending.type === EndingType.Failed) continue;
            if (this.checkConditions(ending.conditions, { year, satisfaction, hope, population, money, buildings, industries })) {
                return this.triggerEnding(ending);
            }
        }
        return null;
    }

    private checkConditions(
        conditions: EndingConfig['conditions'],
        state: { year: number; satisfaction: number; hope: number; population: number; money: number; buildings: string[]; industries: string[] }
    ): boolean {
        if (conditions.minYear && state.year < conditions.minYear) return false;
        if (conditions.maxYear && state.year > conditions.maxYear) return false;
        if (conditions.minSatisfaction && state.satisfaction < conditions.minSatisfaction) return false;
        if (conditions.maxSatisfaction && state.satisfaction > conditions.maxSatisfaction) return false;
        if (conditions.minHope && state.hope < conditions.minHope) return false;
        if (conditions.minPopulation && state.population < conditions.minPopulation) return false;
        if (conditions.minMoney && state.money < conditions.minMoney) return false;
        return true;
    }

    private triggerEnding(ending: EndingConfig): EndingConfig {
        this.isEndingTriggered = true;
        this.currentEnding = ending;
        console.log(`[EndingSystem] 结局触发: ${ending.title}`);
        this.world.emit('game:ending', ending);
        return ending;
    }

    calculateScore(satisfaction: number, hope: number, population: number, money: number): number {
        this.finalScore = satisfaction * 1.5 + hope * 1.5 + Math.log(population + 1) * 10 + Math.log(money + 1) * 0.5;
        return this.finalScore;
    }

    getCurrentEnding(): EndingConfig | undefined {
        return this.currentEnding;
    }

    hasEnded(): boolean {
        return this.isEndingTriggered;
    }

    reset(): void {
        this.isEndingTriggered = false;
        this.currentEnding = undefined;
        this.finalScore = 0;
    }
}
