/**
 * 时间系统
 * 负责游戏内时间推进和季节变化
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { TimeComponent } from '../../components/TimeComponent';
import { TimeConfig } from '../../data/GameConfig';

/**
 * 时间系统属性
 */
export interface TimeSystemProps {
    world: Stage;
}

/**
 * 时间系统
 * 负责游戏内时间推进、季节变化和时间事件触发
 */
export class TimeSystem extends System {
    private timeComponent?: TimeComponent;
    private tickCount: number = 0;

    // 时间事件回调
    private onDayChangeCallbacks: (() => void)[] = [];
    private onMonthChangeCallbacks: (() => void)[] = [];
    private onYearChangeCallbacks: (() => void)[] = [];
    private onSeasonChangeCallbacks: ((season: string) => void)[] = [];

    // 上一季度（用于检测季节变化）
    private lastQuarter: number = 0;

    constructor(props: TimeSystemProps) {
        super(props);
    }

    /**
     * 获取时间组件
     */
    private getOrCreateTime(): TimeComponent {
        if (!this.timeComponent) {
            const components = this.world.findComponents(TimeComponent);
            if (components.length > 0) {
                this.timeComponent = components[0];
            } else {
                this.timeComponent = new TimeComponent({});
            }
        }
        return this.timeComponent;
    }

    /**
     * 系统启动
     */
    start(): void {
        console.log('[TimeSystem] 时间系统启动');
        const time = this.getOrCreateTime();
        console.log(`[TimeSystem] 当前时间: ${time.getDateString()}`);

        // 记录初始季度
        this.lastQuarter = Math.ceil(time.month / 3);
    }

    /**
     * 系统更新 - 每帧调用
     */
    update(): void {
        const time = this.getOrCreateTime();

        if (time.isPaused) return;

        // 增加tick
        this.tickCount += time.speed;

        // 达到一天所需的tick数
        if (this.tickCount >= TimeConfig.ticksPerDay) {
            this.tickCount = 0;
            this.advanceDay();
        }
    }

    /**
     * 推进一天
     */
    private advanceDay(): void {
        const time = this.getOrCreateTime();
        const oldMonth = time.month;
        const oldYear = time.year;
        const oldQuarter = Math.ceil(oldMonth / 3);

        time.advanceDay();

        // 触发日期变化事件
        this.onDayChangeCallbacks.forEach(cb => cb());

        // 月份变化
        if (time.month !== oldMonth) {
            this.onMonthChangeCallbacks.forEach(cb => cb());
        }

        // 年份变化
        if (time.year !== oldYear) {
            console.log(`[TimeSystem] 新年快乐! 现在是 ${time.year}年`);
            this.onYearChangeCallbacks.forEach(cb => cb());
        }

        // 季度变化（季节变化）
        const newQuarter = Math.ceil(time.month / 3);
        if (newQuarter !== oldQuarter) {
            console.log(`[TimeSystem] 季节变化: ${time.getSeasonName()}`);
            this.onSeasonChangeCallbacks.forEach(cb => cb(time.getSeasonName()));
        }
    }

    // ==================== 时间控制接口 ====================

    /**
     * 设置时间速度
     */
    setSpeed(speed: number): void {
        const time = this.getOrCreateTime();
        time.speed = speed;
        console.log(`[TimeSystem] 时间速度设置为 ${speed}x`);
    }

    /**
     * 暂停时间
     */
    pause(): void {
        const time = this.getOrCreateTime();
        time.isPaused = true;
        console.log('[TimeSystem] 时间已暂停');
    }

    /**
     * 恢复时间
     */
    resume(): void {
        const time = this.getOrCreateTime();
        time.isPaused = false;
        console.log('[TimeSystem] 时间已恢复');
    }

    /**
     * 切换暂停状态
     */
    togglePause(): void {
        const time = this.getOrCreateTime();
        time.isPaused = !time.isPaused;
        console.log(`[TimeSystem] 时间${time.isPaused ? '已暂停' : '已恢复'}`);
    }

    // ==================== 查询接口 ====================

    /**
     * 获取当前时间
     */
    getTime(): TimeComponent {
        return this.getOrCreateTime();
    }

    /**
     * 获取当前年份
     */
    getYear(): number {
        return this.getOrCreateTime().year;
    }

    /**
     * 获取当前月份
     */
    getMonth(): number {
        return this.getOrCreateTime().month;
    }

    /**
     * 获取当前日期
     */
    getDay(): number {
        return this.getOrCreateTime().day;
    }

    /**
     * 获取当前时间字符串
     */
    getDateString(): string {
        return this.getOrCreateTime().getDateString();
    }

    /**
     * 获取总天数
     */
    getTotalDays(): number {
        return this.getOrCreateTime().totalDays;
    }

    /**
     * 是否暂停
     */
    isPaused(): boolean {
        return this.getOrCreateTime().isPaused;
    }

    // ==================== 事件注册接口 ====================

    /**
     * 注册日期变化回调（每天触发）
     */
    onDayChange(callback: () => void): () => void {
        this.onDayChangeCallbacks.push(callback);
        return () => {
            const index = this.onDayChangeCallbacks.indexOf(callback);
            if (index > -1) this.onDayChangeCallbacks.splice(index, 1);
        };
    }

    /**
     * 注册月份变化回调（每月触发）
     */
    onMonthChange(callback: () => void): () => void {
        this.onMonthChangeCallbacks.push(callback);
        return () => {
            const index = this.onMonthChangeCallbacks.indexOf(callback);
            if (index > -1) this.onMonthChangeCallbacks.splice(index, 1);
        };
    }

    /**
     * 注册年份变化回调（每年触发）
     */
    onYearChange(callback: () => void): () => void {
        this.onYearChangeCallbacks.push(callback);
        return () => {
            const index = this.onYearChangeCallbacks.indexOf(callback);
            if (index > -1) this.onYearChangeCallbacks.splice(index, 1);
        };
    }

    /**
     * 注册季节变化回调（每季度触发）
     */
    onSeasonChange(callback: (season: string) => void): () => void {
        this.onSeasonChangeCallbacks.push(callback);
        return () => {
            const index = this.onSeasonChangeCallbacks.indexOf(callback);
            if (index > -1) this.onSeasonChangeCallbacks.splice(index, 1);
        };
    }
}
