import { useCallback, useSyncExternalStore } from 'react';
import { ECSBridge, ECSState, ToolType } from './ECSBridge';
import { Entity } from '../Entity';
import { CreateRectOptions, CreateCircleOptions, CreateTextOptions, CreateImageOptions } from '../factory/ElementFactory';

/**
 * React Hook：订阅 ECS 状态变化
 * 使用 useSyncExternalStore 确保与 React 并发模式兼容
 * 通过 version 机制确保每次状态变化都产生新的对象引用
 */
export function useECSState(bridge: ECSBridge | null): ECSState | null {
    const subscribe = useCallback((callback: () => void) => {
        if (!bridge) return () => {};
        return bridge.subscribe(callback);
    }, [bridge]);

    const getSnapshot = useCallback(() => {
        if (!bridge) return null;
        return bridge.getState();
    }, [bridge]);

    return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * React Hook：获取 ECS Bridge 实例的操作方法
 */
export function useECSActions(bridge: ECSBridge | null) {
    return {
        undo: useCallback(() => bridge?.undo(), [bridge]),
        redo: useCallback(() => bridge?.redo(), [bridge]),
        zoomTo: useCallback((scale: number) => bridge?.zoomTo(scale), [bridge]),
        zoomToFit: useCallback(() => bridge?.zoomToFit(), [bridge]),
        selectAll: useCallback(() => bridge?.selectAll(), [bridge]),
        deselectAll: useCallback(() => bridge?.deselectAll(), [bridge]),
        toggleGrid: useCallback(() => bridge?.toggleGrid(), [bridge]),
        toggleSmartGuides: useCallback(() => bridge?.toggleSmartGuides(), [bridge]),
        setCurrentTool: useCallback((tool: ToolType) => bridge?.setCurrentTool(tool), [bridge]),
        deleteSelected: useCallback(() => bridge?.deleteSelected(), [bridge]),
        addRect: useCallback((opts: CreateRectOptions) => bridge?.addRect(opts), [bridge]),
        addCircle: useCallback((opts: CreateCircleOptions) => bridge?.addCircle(opts), [bridge]),
        addText: useCallback((opts: CreateTextOptions) => bridge?.addText(opts), [bridge]),
        addImage: useCallback((opts: CreateImageOptions) => bridge?.addImage(opts), [bridge]),
        bringToFront: useCallback(() => {
            const state = bridge?.getState();
            if (state?.selectedEntities.length) {
                bridge?.bringToFront(state.selectedEntities);
            }
        }, [bridge]),
        sendToBack: useCallback(() => {
            const state = bridge?.getState();
            if (state?.selectedEntities.length) {
                bridge?.sendToBack(state.selectedEntities);
            }
        }, [bridge]),
        updateEntityProperty: useCallback((entity: Entity, property: string, value: number) => {
            bridge?.updateEntityProperty(entity, property, value);
        }, [bridge]),
        updateEntityStyle: useCallback((entity: Entity, style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }) => {
            bridge?.updateEntityStyle(entity, style);
        }, [bridge]),
        // 复制/粘贴/复制
        copySelected: useCallback(() => bridge?.copySelected(), [bridge]),
        pasteClipboard: useCallback(() => bridge?.pasteClipboard(), [bridge]),
        duplicateSelected: useCallback(() => bridge?.duplicateSelected(), [bridge]),
        // 对齐操作
        alignLeft: useCallback(() => bridge?.alignLeft(), [bridge]),
        alignRight: useCallback(() => bridge?.alignRight(), [bridge]),
        alignTop: useCallback(() => bridge?.alignTop(), [bridge]),
        alignBottom: useCallback(() => bridge?.alignBottom(), [bridge]),
        alignCenterH: useCallback(() => bridge?.alignCenterH(), [bridge]),
        alignCenterV: useCallback(() => bridge?.alignCenterV(), [bridge]),
        distributeH: useCallback(() => bridge?.distributeH(), [bridge]),
        distributeV: useCallback(() => bridge?.distributeV(), [bridge]),
        // 批量属性编辑
        updateMultipleEntityProperty: useCallback((entities: Entity[], property: string, value: number) => {
            bridge?.updateMultipleEntityProperty(entities, property, value);
        }, [bridge]),
        updateMultipleEntityStyle: useCallback((entities: Entity[], style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }) => {
            bridge?.updateMultipleEntityStyle(entities, style);
        }, [bridge]),
        // 图片操作
        replaceImage: useCallback((entity: Entity, source: string) => {
            bridge?.replaceImage(entity, source);
        }, [bridge]),
        updateImageOpacity: useCallback((entity: Entity, opacity: number) => {
            bridge?.updateImageOpacity(entity, opacity);
        }, [bridge]),
        // 思维导图操作
        createMindMapRoot: useCallback((options?: { text?: string; x?: number; y?: number }) => {
            return bridge?.createMindMapRoot(options);
        }, [bridge]),
        addMindMapChild: useCallback((parentEntity: Entity, text?: string) => {
            bridge?.addMindMapChild(parentEntity, text);
        }, [bridge]),
        addMindMapSibling: useCallback((entity: Entity, text?: string) => {
            bridge?.addMindMapSibling(entity, text);
        }, [bridge]),
        deleteMindMapNode: useCallback((entity: Entity) => {
            bridge?.deleteMindMapNode(entity);
        }, [bridge]),
        toggleMindMapCollapse: useCallback((entity: Entity) => {
            bridge?.toggleMindMapCollapse(entity);
        }, [bridge]),
        relayoutMindMap: useCallback(() => {
            bridge?.relayoutMindMap();
        }, [bridge]),
    };
}
