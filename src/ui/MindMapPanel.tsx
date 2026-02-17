import React from 'react';
import { Entity } from '../engine/Entity';
import { MindMapNodeComponent } from '../engine/modules/mindmap/MindMapNodeComponent';
import { ECSState } from '../engine/bridge/ECSBridge';
import './MindMapPanel.css';

export interface MindMapPanelProps {
    ecsState: ECSState | null;
    actions: {
        addMindMapChild: (parentEntity: Entity, text?: string) => void;
        addMindMapSibling: (entity: Entity, text?: string) => void;
        deleteMindMapNode: (entity: Entity) => void;
        toggleMindMapCollapse: (entity: Entity) => void;
        relayoutMindMap: () => void;
    };
}

const MindMapPanel: React.FC<MindMapPanelProps> = ({ ecsState, actions }) => {
    if (!ecsState) return null;

    const selectedEntities = ecsState.selectedEntities;
    if (selectedEntities.length !== 1) return null;

    const entity = selectedEntities[0];
    const mindMapNode = entity.getComponent(MindMapNodeComponent);
    if (!mindMapNode) return null;

    const isRoot = mindMapNode.level === 0;
    const childCount = entity.children.filter(c => c.getComponent(MindMapNodeComponent)).length;

    return (
        <div className="mindmap-panel">
            <div className="mindmap-panel-title">思维导图</div>
            <div className="mindmap-panel-info">
                <span className="mindmap-info-label">层级:</span>
                <span className="mindmap-info-value">{mindMapNode.level}</span>
            </div>
            <div className="mindmap-panel-info">
                <span className="mindmap-info-label">子节点:</span>
                <span className="mindmap-info-value">{childCount}</span>
            </div>
            <div className="mindmap-panel-info">
                <span className="mindmap-info-label">状态:</span>
                <span className="mindmap-info-value">
                    {mindMapNode.collapsed ? '已折叠' : '已展开'}
                </span>
            </div>
            <div className="mindmap-panel-actions">
                <button
                    className="mindmap-action-btn"
                    onClick={() => actions.addMindMapChild(entity)}
                    title="Tab"
                >
                    + 子节点
                </button>
                {!isRoot && (
                    <button
                        className="mindmap-action-btn"
                        onClick={() => actions.addMindMapSibling(entity)}
                        title="Enter"
                    >
                        + 兄弟节点
                    </button>
                )}
                {childCount > 0 && (
                    <button
                        className="mindmap-action-btn"
                        onClick={() => actions.toggleMindMapCollapse(entity)}
                        title="Space"
                    >
                        {mindMapNode.collapsed ? '展开' : '折叠'}
                    </button>
                )}
                {!isRoot && (
                    <button
                        className="mindmap-action-btn danger"
                        onClick={() => actions.deleteMindMapNode(entity)}
                        title="Delete"
                    >
                        删除
                    </button>
                )}
                <button
                    className="mindmap-action-btn"
                    onClick={() => actions.relayoutMindMap()}
                >
                    重新布局
                </button>
            </div>
            <div className="mindmap-panel-shortcuts">
                <div className="shortcut-item"><kbd>Tab</kbd> 添加子节点</div>
                <div className="shortcut-item"><kbd>Enter</kbd> 添加兄弟节点</div>
                <div className="shortcut-item"><kbd>Space</kbd> 折叠/展开</div>
                <div className="shortcut-item"><kbd>Delete</kbd> 删除节点</div>
                <div className="shortcut-item"><kbd>双击</kbd> 编辑文本</div>
            </div>
        </div>
    );
};

export default MindMapPanel;
