import React, { useRef } from 'react';
import { ToolType } from '../engine/bridge/ECSBridge';
import './ToolPanel.css';

export interface ToolPanelProps {
    currentTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onImageUpload: (dataUrl: string) => void;
}

interface ToolItem {
    id: ToolType;
    label: string;
    icon: string;
    shortcut: string;
}

const tools: ToolItem[] = [
    { id: 'select', label: '选择', icon: '⇱', shortcut: 'V' },
    { id: 'hand', label: '手型', icon: '✋', shortcut: 'H' },
    { id: 'rect', label: '矩形', icon: '▭', shortcut: 'R' },
    { id: 'circle', label: '圆形', icon: '○', shortcut: 'O' },
    { id: 'text', label: '文本', icon: 'T', shortcut: 'T' },
    { id: 'image', label: '图片', icon: '🖼', shortcut: 'I' },
    { id: 'mindmap', label: '思维导图', icon: '🧠', shortcut: 'M' },
];

const ToolPanel: React.FC<ToolPanelProps> = ({ currentTool, onToolChange, onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleToolClick = (tool: ToolType) => {
        if (tool === 'image') {
            // 图片工具触发文件选择
            fileInputRef.current?.click();
            return;
        }
        onToolChange(tool);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                onImageUpload(dataUrl);
            }
        };
        reader.readAsDataURL(file);

        // 清空 input 以便重复选择同一文件
        e.target.value = '';
    };

    return (
        <div className="tool-panel">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    className={`tool-panel-btn ${currentTool === tool.id ? 'active' : ''}`}
                    onClick={() => handleToolClick(tool.id)}
                    title={`${tool.label} (${tool.shortcut})`}
                >
                    <span className="tool-icon">{tool.icon}</span>
                    <span className="tool-shortcut">{tool.shortcut}</span>
                </button>
            ))}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
};

export default ToolPanel;
