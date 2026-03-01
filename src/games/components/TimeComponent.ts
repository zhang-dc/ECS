/**
 * 时间组件
 * 存储游戏内时间数据
 */
import { BaseComponent, BaseComponentProps } from '../../engine/Component';
import { TimeConfig, Season } from '../data/GameConfig';

/**
 * 时间组件属性
 */
export interface TimeComponentProps extends BaseComponentProps {
    year?: number;
    month?: number;
    day?: number;
    tick?: number;
    speed?: number;
}

/**
 * 时间组件
 * 管理游戏内的时间数据
 */
export class TimeComponent extends BaseComponent {
    // 当前时间
    year: number = TimeConfig.startYear;
    month: number = TimeConfig.startMonth;
    day: number = TimeConfig.startDay;
    tick: number = 0;

    // 时间速度 (1=正常, 2=2倍, etc.)
    speed: number = 1;

    // 暂停状态
    isPaused: boolean = false;

    // 总天数 (从游戏开始计算)
    totalDays: number = 0;

    constructor(props: TimeComponentProps = {}) {
        super(props);

        if (props.year !== undefined) this.year = props.year;
        if (props.month !== undefined) this.month = props.month;
        if (props.day !== undefined) this.day = props.day;
        if (props.tick !== undefined) this.tick = props.tick;
        if (props.speed !== undefined) this.speed = props.speed;

        this.calculateTotalDays();
    }

    /**
     * 计算总天数
     */
    private calculateTotalDays(): void {
        const yearsPassed = this.year - TimeConfig.startYear;
        const monthsPassed = this.month - TimeConfig.startMonth;
        this.totalDays = yearsPassed * TimeConfig.baseDaysPerMonth * TimeConfig.baseMonthsPerYear +
                        monthsPassed * TimeConfig.baseDaysPerMonth +
                        this.day;
    }

    /**
     * 获取当前季节
     */
    getSeason(): Season {
        const seasonIndex = Math.floor((this.month - 3) / 3) % 4;
        const seasons: Season[] = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter];
        return seasons[seasonIndex];
    }

    /**
     * 获取季节名称（中文）
     */
    getSeasonName(): string {
        const seasonNames: Record<Season, string> = {
            [Season.Spring]: '春季',
            [Season.Summer]: '夏季',
            [Season.Autumn]: '秋季',
            [Season.Winter]: '冬季',
        };
        return seasonNames[this.getSeason()];
    }

    /**
     * 获取时间描述
     */
    getDateString(): string {
        return `${this.year}年${this.month}月${this.day}日 ${this.getSeasonName()}`;
    }

    /**
     * 获取日期详情
     */
    getDateDetail(): string {
        return `${this.year}年 第${Math.ceil(this.month / 3)}季度 ${this.month}月${this.day}日`;
    }

    /**
     * 推进一天
     */
    advanceDay(): void {
        this.day++;
        this.totalDays++;

        if (this.day > TimeConfig.baseDaysPerMonth) {
            this.day = 1;
            this.month++;
        }

        if (this.month > TimeConfig.baseMonthsPerYear) {
            this.month = 1;
            this.year++;
        }
    }

    /**
     * 获取温度修正值（基于季节）
     */
    getTemperatureModifier(): number {
        const season = this.getSeason();
        const config = TimeConfig.seasons.find(s => {
            const startMonth = s.monthStart;
            const endMonth = (startMonth + 2) % 12 || 12;
            if (startMonth <= endMonth) {
                return this.month >= startMonth && this.month <= endMonth;
            } else {
                return this.month >= startMonth || this.month <= endMonth;
            }
        });
        return config?.tempModifier ?? 0;
    }

    /**
     * 是否是冬季
     */
    isWinter(): boolean {
        return this.getSeason() === Season.Winter;
    }

    /**
     * 复制时间数据
     */
    clone(): { year: number; month: number; day: number } {
        return {
            year: this.year,
            month: this.month,
            day: this.day,
        };
    }
}
