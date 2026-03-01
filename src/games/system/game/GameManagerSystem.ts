/**
 * 游戏管理器系统
 * 负责游戏主循环、状态管理、阶段切换等核心功能
 */
import { System, SystemProps } from '../../../engine/System';
import { GameState, GamePhase, GamePhaseConfig, GameConfig } from '../../data/GameConfig';

/**
 * 游戏管理器系统属性
 */
export interface GameManagerSystemProps extends SystemProps {
    // 可选的初始配置
    initialPhase?: GamePhase;
    difficulty?: 'easy' | 'normal' | 'hard';
}

/**
 * 游戏管理器系统
 * 整个游戏的核心控制器
 */
export class GameManagerSystem extends System {
    // 游戏状态
    private gameState: GameState;

    // 游戏配置
    private difficulty: 'easy' | 'normal' | 'hard';

    // 游戏阶段变更回调
    private onPhaseChangeCallbacks: ((oldPhase: GamePhase, newPhase: GamePhase) => void)[] = [];

    // 游戏结束回调
    private onGameOverCallbacks: ((reason: string) => void)[] = [];

    constructor(props: GameManagerSystemProps) {
        super(props);
        this.difficulty = props.difficulty || 'normal';
        this.gameState = this.createInitialState(props.initialPhase);
    }

    /**
     * 创建初始游戏状态
     */
    private createInitialState(initialPhase?: GamePhase): GameState {
        return {
            year: GameConfig.startYear,
            month: 1,
            day: 1,
            phase: initialPhase || GamePhase.Migration,
            isPaused: false,
            isGameOver: false,
            playTime: 0,
        };
    }

    /**
     * 系统启动
     */
    start(): void {
        console.log('[GameManager] 游戏初始化完成');
        console.log(`[GameManager] 当前阶段: ${GamePhaseConfig[this.gameState.phase].name}`);
        console.log(`[GameManager] 难度: ${this.difficulty}`);

        // 触发初始阶段事件
        this.triggerPhaseChange(GamePhase.Init, this.gameState.phase);
    }

    /**
     * 系统更新 - 每帧调用
     */
    update(): void {
        if (this.gameState.isPaused || this.gameState.isGameOver) {
            return;
        }

        // 更新游玩时间
        this.gameState.playTime += 1 / 60;  // 假设60fps
    }

    /**
     * 系统结束
     */
    end(): void {
        console.log('[GameManager] 游戏结束');
        console.log(`[GameManager] 最终阶段: ${GamePhaseConfig[this.gameState.phase].name}`);
        console.log(`[GameManager] 总游玩时间: ${Math.floor(this.gameState.playTime / 60)}分钟`);
    }

    // ==================== 状态管理 ====================

    /**
     * 获取当前游戏状态
     */
    getGameState(): Readonly<GameState> {
        return { ...this.gameState };
    }

    /**
     * 获取当前年份
     */
    getYear(): number {
        return this.gameState.year;
    }

    /**
     * 获取当前月份
     */
    getMonth(): number {
        return this.gameState.month;
    }

    /**
     * 获取当前日期
     */
    getDay(): number {
        return this.gameState.day;
    }

    /**
     * 获取当前阶段
     */
    getPhase(): GamePhase {
        return this.gameState.phase;
    }

    /**
     * 获取当前难度
     */
    getDifficulty(): string {
        return this.difficulty;
    }

    /**
     * 是否暂停
     */
    isPaused(): boolean {
        return this.gameState.isPaused;
    }

    /**
     * 是否结束
     */
    isGameOver(): boolean {
        return this.gameState.isGameOver;
    }

    // ==================== 游戏控制 ====================

    /**
     * 暂停游戏
     */
    pause(): void {
        this.gameState.isPaused = true;
        console.log('[GameManager] 游戏已暂停');
    }

    /**
     * 恢复游戏
     */
    resume(): void {
        this.gameState.isPaused = false;
        console.log('[GameManager] 游戏已恢复');
    }

    /**
     * 切换暂停状态
     */
    togglePause(): void {
        if (this.gameState.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * 结束游戏
     */
    gameOver(reason: string = '未知原因'): void {
        this.gameState.isGameOver = true;
        console.log(`[GameManager] 游戏结束: ${reason}`);

        // 触发游戏结束回调
        this.onGameOverCallbacks.forEach(cb => cb(reason));
    }

    /**
     * 切换游戏阶段
     */
    changePhase(newPhase: GamePhase): boolean {
        const oldPhase = this.gameState.phase;

        if (oldPhase === newPhase) {
            return false;
        }

        // 检查阶段是否可以转换
        if (!this.canTransitionTo(newPhase)) {
            console.warn(`[GameManager] 无法转换到阶段: ${newPhase}`);
            return false;
        }

        this.gameState.phase = newPhase;
        console.log(`[GameManager] 阶段切换: ${GamePhaseConfig[oldPhase].name} -> ${GamePhaseConfig[newPhase].name}`);

        // 触发阶段变更回调
        this.triggerPhaseChange(oldPhase, newPhase);

        return true;
    }

    /**
     * 检查是否可以转换到指定阶段
     */
    private canTransitionTo(newPhase: GamePhase): boolean {
        const phaseConfig = GamePhaseConfig[newPhase];
        if (!phaseConfig) return false;

        // 检查年份是否满足
        if (this.gameState.year < phaseConfig.startYear) {
            return false;
        }

        return true;
    }

    /**
     * 触发阶段变更事件
     */
    private triggerPhaseChange(oldPhase: GamePhase, newPhase: GamePhase): void {
        this.onPhaseChangeCallbacks.forEach(cb => cb(oldPhase, newPhase));
    }

    /**
     * 注册阶段变更回调
     */
    onPhaseChange(callback: (oldPhase: GamePhase, newPhase: GamePhase) => void): () => void {
        this.onPhaseChangeCallbacks.push(callback);
        return () => {
            const index = this.onPhaseChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.onPhaseChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * 注册游戏结束回调
     */
    onGameOver(callback: (reason: string) => void): () => void {
        this.onGameOverCallbacks.push(callback);
        return () => {
            const index = this.onGameOverCallbacks.indexOf(callback);
            if (index > -1) {
                this.onGameOverCallbacks.splice(index, 1);
            }
        };
    }

    // ==================== 时间更新 ====================

    /**
     * 更新时间（由时间系统调用）
     */
    updateTime(year: number, month: number, day: number): void {
        this.gameState.year = year;
        this.gameState.month = month;
        this.gameState.day = day;

        // 检查是否需要自动切换阶段
        this.checkAutoPhaseChange();
    }

    /**
     * 检查并自动切换阶段
     */
    private checkAutoPhaseChange(): void {
        const { year } = this.gameState;

        // 根据年份自动切换阶段
        if (year >= 2005 && this.gameState.phase !== GamePhase.Ending) {
            this.changePhase(GamePhase.Ending);
        } else if (year >= 2000 && this.gameState.phase === GamePhase.Development) {
            this.changePhase(GamePhase.Prosperity);
        } else if (year >= 1996 && this.gameState.phase === GamePhase.Foundation) {
            this.changePhase(GamePhase.Development);
        } else if (year >= 1993 && this.gameState.phase === GamePhase.Migration) {
            this.changePhase(GamePhase.Foundation);
        }
    }
}
