import { StageEvents } from '../../Stage';
import { System, SystemProps } from '../../System';
import { EventManager } from '../event/Event';
import { KeyboardComponent } from '../keyboard/KeyboardComponent';
import { KeyboardKey } from '../keyboard/Keyboard';
import { HistoryComponent } from './HistoryComponent';
import { HistoryEvent, HistoryOperation } from './HistoryEvent';
import { instanceHistoryEntity } from './instanceHistoryEntity';

export class HistorySystem extends System {
    eventManager?: EventManager;
    historyComponent: HistoryComponent;
    keyboardComponent?: KeyboardComponent;

    constructor(props: SystemProps) {
        super(props);
        const historyEntity = instanceHistoryEntity({ world: this.world });
        this.historyComponent = historyEntity.getComponent(HistoryComponent)!;
    }

    start(): void {
        this.eventManager = this.world.findComponent(EventManager);
        this.keyboardComponent = this.world.findComponent(KeyboardComponent);
    }

    update(): void {
        // 处理来自事件系统的历史操作
        const historyEvents = this.eventManager?.getEvents(HistoryEvent);
        historyEvents?.forEach((event) => {
            this.processHistoryEvent(event);
        });

        // 处理键盘快捷键 Ctrl+Z / Ctrl+Shift+Z
        this.handleKeyboardShortcuts();
    }

    processHistoryEvent(event: HistoryEvent) {
        const { data } = event;
        switch (data.operation) {
            case HistoryOperation.Execute:
                if (data.command) {
                    this.historyComponent.executeCommand(data.command);
                }
                break;
            case HistoryOperation.Undo:
                this.historyComponent.undo();
                break;
            case HistoryOperation.Redo:
                this.historyComponent.redo();
                break;
            case HistoryOperation.Clear:
                this.historyComponent.clear();
                break;
        }
        this.emitHistoryChange();
    }

    handleKeyboardShortcuts() {
        if (!this.keyboardComponent) {
            return;
        }
        const keyMap = this.keyboardComponent.keyMap;
        const ctrlDown = keyMap.get(KeyboardKey.Control);
        const shiftDown = keyMap.get(KeyboardKey.Shift);
        const zDown = keyMap.get(KeyboardKey.Keyz) || keyMap.get(KeyboardKey.KeyZ);

        if (ctrlDown && zDown) {
            if (shiftDown) {
                // Ctrl+Shift+Z = Redo
                this.historyComponent.redo();
            } else {
                // Ctrl+Z = Undo
                this.historyComponent.undo();
            }
            // 消费按键，防止连续触发
            keyMap.set(KeyboardKey.Keyz, false);
            keyMap.set(KeyboardKey.KeyZ, false);
            this.emitHistoryChange();
        }
    }

    private emitHistoryChange() {
        this.world.emit(StageEvents.HISTORY_CHANGE, {
            canUndo: this.historyComponent.canUndo(),
            canRedo: this.historyComponent.canRedo(),
        });
    }
}
