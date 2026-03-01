/**
 * 核心游戏指标组件
 * 参考冰汽时代的温度/希望值系统
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';

/**
 * 指标组件属性
 */
export interface IndicatorComponentProps extends BaseComponentProps {
    // 生存指标 (0-100)
    satisfaction?: number;     // 满意度 - 村民对生活的满意程度
    hunger?: number;          // 饥饿度 - 食物储备水平 (越低越危险)
    warmth?: number;          // 温暖度 - 冬季取暖保障
    hope?: number;            // 希望值 - 对未来的信心
    stability?: number;       // 安定度 - 社会秩序稳定性

    // 经济指标
    money?: number;           // 资金
    food?: number;            // 粮食储备
    population?: number;      // 人口数量

    // 发展指标
    techLevel?: number;       // 技术等级
    outsideConnection?: number; // 外界联系 (与福建/政府的联系)
    educationLevel?: number;  // 教育水平
}

/**
 * 指标组件
 * 存储游戏中的所有核心指标数据
 */
export class IndicatorComponent extends BaseComponent {
    // 生存指标 (0-100)
    satisfaction: number = 50;    // 初始50
    hunger: number = 70;          // 初始70
    warmth: number = 60;          // 初始60
    hope: number = 40;            // 初始40 (贫困时期希望较低)
    stability: number = 50;       // 初始50

    // 经济指标
    money: number = 1000;         // 初始1000
    food: number = 500;           // 初始500
    population: number = 10;       // 初始10

    // 发展指标
    techLevel: number = 1;        // 初始Lv1
    outsideConnection: number = 0; // 初始0
    educationLevel: number = 1;   // 初始Lv1

    constructor(props: IndicatorComponentProps = {}) {
        super(props);

        // 初始化所有属性
        if (props.satisfaction !== undefined) this.satisfaction = props.satisfaction;
        if (props.hunger !== undefined) this.hunger = props.hunger;
        if (props.warmth !== undefined) this.warmth = props.warmth;
        if (props.hope !== undefined) this.hope = props.hope;
        if (props.stability !== undefined) this.stability = props.stability;
        if (props.money !== undefined) this.money = props.money;
        if (props.food !== undefined) this.food = props.food;
        if (props.population !== undefined) this.population = props.population;
        if (props.techLevel !== undefined) this.techLevel = props.techLevel;
        if (props.outsideConnection !== undefined) this.outsideConnection = props.outsideConnection;
        if (props.educationLevel !== undefined) this.educationLevel = props.educationLevel;
    }

    /**
     * 获取总体生活质量评分 (0-100)
     */
    getLifeQuality(): number {
        return Math.floor(
            this.satisfaction * 0.3 +
            this.hunger * 0.25 +
            this.warmth * 0.2 +
            this.hope * 0.15 +
            this.stability * 0.1
        );
    }

    /**
     * 检查是否处于危险状态
     * 任意核心指标低于20%即视为危险
     */
    isInDanger(): boolean {
        return this.satisfaction < 20 ||
               this.hunger < 20 ||
               this.hope < 20 ||
               this.stability < 20;
    }

    /**
     * 检查是否处于警告状态
     * 任意核心指标低于40%即视为警告
     */
    isInWarning(): boolean {
        return this.satisfaction < 40 ||
               this.hunger < 40 ||
               this.hope < 40 ||
               this.stability < 40;
    }

    /**
     * 获取警告状态的指标列表
     */
    getWarningIndicators(): string[] {
        const warnings: string[] = [];
        if (this.satisfaction < 40) warnings.push('满意度');
        if (this.hunger < 40) warnings.push('饥饿度');
        if (this.warmth < 40) warnings.push('温暖度');
        if (this.hope < 40) warnings.push('希望值');
        if (this.stability < 40) warnings.push('安定度');
        return warnings;
    }

    /**
     * 限制指标在有效范围内
     */
    clamp(): void {
        const clampValue = (v: number, min: number, max: number): number =>
            Math.max(min, Math.min(max, v));

        // 生存指标限制在 0-100
        this.satisfaction = clampValue(this.satisfaction, 0, 100);
        this.hunger = clampValue(this.hunger, 0, 100);
        this.warmth = clampValue(this.warmth, 0, 100);
        this.hope = clampValue(this.hope, 0, 100);
        this.stability = clampValue(this.stability, 0, 100);

        // 经济指标限制在 0-无限
        this.money = Math.max(0, this.money);
        this.food = Math.max(0, this.food);
        this.population = Math.max(0, this.population);

        // 发展指标限制在 0-100
        this.techLevel = clampValue(this.techLevel, 0, 100);
        this.outsideConnection = clampValue(this.outsideConnection, 0, 100);
        this.educationLevel = clampValue(this.educationLevel, 0, 100);
    }

    /**
     * 获取所有指标数据的副本
     */
    toJSON(): IndicatorComponentProps {
        return {
            satisfaction: this.satisfaction,
            hunger: this.hunger,
            warmth: this.warmth,
            hope: this.hope,
            stability: this.stability,
            money: this.money,
            food: this.food,
            population: this.population,
            techLevel: this.techLevel,
            outsideConnection: this.outsideConnection,
            educationLevel: this.educationLevel,
        };
    }
}
