/**
 * 存档系统
 */
import { Stage } from '../../../engine/Stage';
import { GamePhase } from '../../data/GameConfig';

export interface SaveMetadata {
    id: string;
    name: string;
    timestamp: number;
    playTime: number;
    year: number;
    phase: GamePhase;
}

export interface SaveData {
    version: string;
    timestamp: number;
    gameState: {
        year: number;
        month: number;
        day: number;
        phase: GamePhase;
        playTime: number;
    };
    indicators: Record<string, number>;
    resources: Record<string, number>;
    population: number;
    buildings: string[];
    missions: string[];
    policies: string[];
}

export class SaveManager {
    private saveDir: string = 'game_saves/';
    private maxSaves: number = 10;

    async saveGame(
        saveName: string,
        saveData: SaveData
    ): Promise<SaveMetadata> {
        const metadata: SaveMetadata = {
            id: `save_${Date.now()}`,
            name: saveName,
            timestamp: Date.now(),
            playTime: saveData.gameState.playTime,
            year: saveData.gameState.year,
            phase: saveData.gameState.phase,
        };

        const key = `game_save_${metadata.id}`;
        localStorage.setItem(key, JSON.stringify({ metadata, data: saveData }));
        this.updateSaveList(metadata);

        console.log(`[SaveManager] 存档保存: ${saveName}`);
        return metadata;
    }

    async loadGame(saveId: string): Promise<SaveData | null> {
        const key = `game_save_${saveId}`;
        const saved = localStorage.getItem(key);
        if (!saved) return null;

        try {
            const parsed = JSON.parse(saved);
            return parsed.data as SaveData;
        } catch (e) {
            console.error('[SaveManager] 存档解析失败:', e);
            return null;
        }
    }

    getSaveList(): SaveMetadata[] {
        const listKey = 'game_save_list';
        const list = localStorage.getItem(listKey);
        return list ? JSON.parse(list) : [];
    }

    deleteSave(saveId: string): boolean {
        const key = `game_save_${saveId}`;
        localStorage.removeItem(key);

        const list = this.getSaveList();
        const newList = list.filter(s => s.id !== saveId);
        localStorage.setItem('game_save_list', JSON.stringify(newList));
        return true;
    }

    private updateSaveList(metadata: SaveMetadata): void {
        const list = this.getSaveList();
        list.unshift(metadata);

        if (list.length > this.maxSaves) {
            const toDelete = list.slice(this.maxSaves);
            toDelete.forEach(s => this.deleteSave(s.id));
            list.splice(this.maxSaves);
        }

        localStorage.setItem('game_save_list', JSON.stringify(list));
    }
}
