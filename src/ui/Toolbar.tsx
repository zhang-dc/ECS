import React from 'react';
import { ECSState } from '../engine/bridge/ECSBridge';
import './Toolbar.css';

export interface ToolbarActions {
    undo: () => void;
    redo: () => void;
    zoomTo: (scale: number) => void;
    zoomToFit: () => void;
    selectAll: () => void;
    deselectAll: () => void;
    toggleGrid: () => void;
    toggleSmartGuides: () => void;
    deleteSelected: () => void;
    copySelected?: () => void;
    pasteClipboard?: () => void;
    duplicateSelected?: () => void;
}

export interface ToolbarProps {
    ecsState: ECSState | null;
    actions: ToolbarActions;
}

const Toolbar: React.FC<ToolbarProps> = ({ ecsState, actions }) => {
    const scale = ecsState?.viewportScale ?? 1;
    const scalePercent = Math.round(scale * 100);
    const hasSelection = (ecsState?.selectedEntities.length ?? 0) > 0;

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={actions.undo}
                    disabled={!ecsState?.canUndo}
                    title="撤销 (Ctrl+Z)"
                >
                    ↩ 撤销
                </button>
                <button
                    className="toolbar-btn"
                    onClick={actions.redo}
                    disabled={!ecsState?.canRedo}
                    title="重做 (Ctrl+Shift+Z)"
                >
                    ↪ 重做
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={() => actions.zoomTo(scale * 0.8)}
                    title="缩小"
                >
                    −
                </button>
                <span className="toolbar-label">{scalePercent}%</span>
                <button
                    className="toolbar-btn"
                    onClick={() => actions.zoomTo(scale * 1.25)}
                    title="放大"
                >
                    +
                </button>
                <button
                    className="toolbar-btn"
                    onClick={actions.zoomToFit}
                    title="适应画布"
                >
                    适应
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className={`toolbar-btn ${ecsState?.showGrid ? 'active' : ''}`}
                    onClick={actions.toggleGrid}
                    title="切换网格"
                >
                    网格
                </button>
                <button
                    className={`toolbar-btn ${ecsState?.showSmartGuides ? 'active' : ''}`}
                    onClick={actions.toggleSmartGuides}
                    title="切换对齐线"
                >
                    对齐
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <span className="toolbar-label">
                    {hasSelection
                        ? `已选 ${ecsState!.selectedEntities.length} 个`
                        : '无选中'}
                </span>
                {hasSelection && (
                    <>
                        <button
                            className="toolbar-btn"
                            onClick={actions.copySelected}
                            title="复制 (Ctrl+C)"
                        >
                            📋
                        </button>
                        <button
                            className="toolbar-btn"
                            onClick={actions.duplicateSelected}
                            title="原地复制 (Ctrl+D)"
                        >
                            📄
                        </button>
                        <button
                            className="toolbar-btn toolbar-btn-delete"
                            onClick={actions.deleteSelected}
                            title="删除选中 (Delete)"
                        >
                            🗑
                        </button>
                    </>
                )}
                <button
                    className="toolbar-btn"
                    onClick={actions.pasteClipboard}
                    title="粘贴 (Ctrl+V)"
                >
                    📌
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <span className="toolbar-label toolbar-entity-count">
                    画布: {ecsState?.entities.length ?? 0} 个元素
                </span>
            </div>
        </div>
    );
};

export default Toolbar;
