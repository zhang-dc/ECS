import React, { useCallback, useRef, useState } from 'react';
import { Entity } from '../engine/Entity';
import { ECSState } from '../engine/bridge/ECSBridge';
import { LayoutComponent } from '../engine/modules/layout/LayoutComponent';
import { ShapeRenderer } from '../engine/modules/render/ShapeRenderer';
import { RichTextComponent } from '../engine/modules/text/RichTextComponent';
import { RichTextRenderer } from '../engine/modules/render/RichTextRenderer';
import { MindMapNodeComponent } from '../engine/modules/mindmap/MindMapNodeComponent';
import './RightPanel.css';

// ==================== Types ====================

export interface RightPanelActions {
    // 属性操作
    bringToFront: () => void;
    sendToBack: () => void;
    deleteSelected: () => void;
    updateEntityProperty?: (entity: Entity, property: string, value: number) => void;
    updateEntityStyle?: (entity: Entity, style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }) => void;
    // 多选操作
    copySelected?: () => void;
    pasteClipboard?: () => void;
    duplicateSelected?: () => void;
    alignLeft?: () => void;
    alignRight?: () => void;
    alignTop?: () => void;
    alignBottom?: () => void;
    alignCenterH?: () => void;
    alignCenterV?: () => void;
    distributeH?: () => void;
    distributeV?: () => void;
    updateMultipleEntityStyle?: (entities: Entity[], style: { fillColor?: number; strokeColor?: number; strokeWidth?: number; opacity?: number }) => void;
    // 图片操作
    replaceImage?: (entity: Entity, source: string) => void;
    updateImageOpacity?: (entity: Entity, opacity: number) => void;
    // 文字操作
    updateTextStyle?: (entity: Entity, style: Record<string, any>) => void;
    // 脑图操作
    addMindMapChild?: (parentEntity: Entity, text?: string) => void;
    addMindMapSibling?: (entity: Entity, text?: string) => void;
    deleteMindMapNode?: (entity: Entity) => void;
    toggleMindMapCollapse?: (entity: Entity) => void;
    relayoutMindMap?: () => void;
}

export interface RightPanelProps {
    ecsState: ECSState | null;
    actions: RightPanelActions;
}

// ==================== 主面板 ====================

const RightPanel: React.FC<RightPanelProps> = ({ ecsState, actions }) => {
    const [collapsed, setCollapsed] = useState(false);
    const selectedEntities = ecsState?.selectedEntities ?? [];

    return (
        <div className="right-panel-wrapper">
            <button
                className="right-panel-toggle"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? '展开面板' : '收起面板'}
            >
                {collapsed ? '◀' : '▶'}
            </button>

            {!collapsed && (
                <div className="right-panel">
                    {selectedEntities.length === 0 && <EmptyState />}
                    {selectedEntities.length === 1 && (
                        <SingleSelectContent entity={selectedEntities[0]} actions={actions} />
                    )}
                    {selectedEntities.length > 1 && (
                        <MultiSelectContent entities={selectedEntities} actions={actions} />
                    )}
                </div>
            )}
        </div>
    );
};

// ==================== 空状态 ====================

const EmptyState: React.FC = () => (
    <div className="right-panel-empty">
        <span style={{ fontSize: 20, opacity: 0.4 }}>&#9633;</span>
        <span>未选中元素</span>
        <span className="right-panel-empty-hint">
            点击画布上的元素查看属性，或使用左侧工具创建新元素
        </span>
    </div>
);

// ==================== 单选内容 ====================

const SingleSelectContent: React.FC<{ entity: Entity; actions: RightPanelActions }> = ({ entity, actions }) => {
    const layoutComp = entity.getComponent(LayoutComponent);
    const shapeRenderer = entity.getComponent(ShapeRenderer);
    const richTextComp = entity.getComponent(RichTextComponent);
    const mindMapNode = entity.getComponent(MindMapNodeComponent);
    const textureFillInfo = shapeRenderer?.getTextureFillInfo();
    const replaceInputRef = useRef<HTMLInputElement>(null);

    const handlePropertyChange = (property: string, value: number) => {
        actions.updateEntityProperty?.(entity, property, value);
    };

    const handleFillColorChange = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateEntityStyle?.(entity, { fillColor: color });
    };

    const handleStrokeColorChange = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateEntityStyle?.(entity, { strokeColor: color });
    };

    const toHexColor = (color: number): string => {
        return '#' + color.toString(16).padStart(6, '0');
    };

    const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) actions.replaceImage?.(entity, dataUrl);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleOpacityChange = (value: number) => {
        actions.updateImageOpacity?.(entity, value / 100);
    };

    // 判断标题
    const title = mindMapNode ? `脑图节点` : entity.name;
    const badge = mindMapNode ? `Lv.${mindMapNode.level}` : undefined;

    return (
        <>
            {/* 头部 */}
            <div className="right-panel-header">
                <span className="right-panel-title">{title}</span>
                {badge && <span className="right-panel-badge">{badge}</span>}
            </div>

            {/* 脑图信息 */}
            {mindMapNode && (
                <MindMapInfoSection entity={entity} mindMapNode={mindMapNode} actions={actions} />
            )}

            {/* 位置/尺寸 */}
            {layoutComp && (
                <>
                    <Section title="位置与尺寸">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
                            <EditableRow label="X" value={Math.round(layoutComp.x)} onChange={(v) => handlePropertyChange('x', v)} />
                            <EditableRow label="Y" value={Math.round(layoutComp.y)} onChange={(v) => handlePropertyChange('y', v)} />
                            <EditableRow label="W" value={Math.round(layoutComp.width)} onChange={(v) => handlePropertyChange('width', v)} min={1} />
                            <EditableRow label="H" value={Math.round(layoutComp.height)} onChange={(v) => handlePropertyChange('height', v)} min={1} />
                        </div>
                    </Section>

                    {!mindMapNode && (
                        <Section title="变换">
                            <EditableRow
                                label="旋转"
                                value={Math.round(layoutComp.rotation * 180 / Math.PI)}
                                onChange={(v) => handlePropertyChange('rotation', v * Math.PI / 180)}
                                suffix="°"
                            />
                            <EditableRow
                                label="缩放X"
                                value={Number(layoutComp.scaleX.toFixed(2))}
                                onChange={(v) => handlePropertyChange('scaleX', v)}
                                step={0.1}
                            />
                            <EditableRow
                                label="缩放Y"
                                value={Number(layoutComp.scaleY.toFixed(2))}
                                onChange={(v) => handlePropertyChange('scaleY', v)}
                                step={0.1}
                            />
                        </Section>
                    )}
                </>
            )}

            {/* 图形样式 */}
            {shapeRenderer && (
                <Section title="样式">
                    <div className="rp-row">
                        <span className="rp-label">填充</span>
                        <input
                            type="color"
                            className="rp-color-input"
                            value={toHexColor(shapeRenderer.style.fillColor ?? 0xffffff)}
                            onChange={(e) => handleFillColorChange(e.target.value)}
                        />
                    </div>
                    <div className="rp-row">
                        <span className="rp-label">描边</span>
                        <input
                            type="color"
                            className="rp-color-input"
                            value={toHexColor(shapeRenderer.style.strokeColor ?? 0x333333)}
                            onChange={(e) => handleStrokeColorChange(e.target.value)}
                        />
                    </div>
                </Section>
            )}

            {/* 富文本属性 */}
            {richTextComp && (
                <RichTextSection entity={entity} richTextComp={richTextComp} actions={actions} />
            )}

            {/* 图片属性 */}
            {textureFillInfo && (
                <Section title="图片">
                    <div className="rp-row">
                        <span className="rp-label">原始</span>
                        <span className="rp-value">
                            {textureFillInfo.naturalWidth || '?'} x {textureFillInfo.naturalHeight || '?'}
                        </span>
                    </div>
                    <div className="rp-row">
                        <span className="rp-label">透明度</span>
                        <input
                            type="range"
                            className="rp-range"
                            min={0}
                            max={100}
                            value={Math.round(textureFillInfo.opacity * 100)}
                            onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                        />
                        <span className="rp-value-small">
                            {Math.round(textureFillInfo.opacity * 100)}%
                        </span>
                    </div>
                    <button className="rp-btn" onClick={() => replaceInputRef.current?.click()}>
                        替换图片
                    </button>
                    <input
                        ref={replaceInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleReplaceImage}
                    />
                </Section>
            )}

            {/* 层级 */}
            {layoutComp && !mindMapNode && (
                <Section title="层级">
                    <EditableRow
                        label="Z-Index"
                        value={layoutComp.zIndex}
                        onChange={(v) => handlePropertyChange('zIndex', v)}
                    />
                    <div className="rp-btn-row">
                        <button className="rp-btn" onClick={actions.bringToFront} title="置顶">
                            &#x2B06; 置顶
                        </button>
                        <button className="rp-btn" onClick={actions.sendToBack} title="置底">
                            &#x2B07; 置底
                        </button>
                    </div>
                </Section>
            )}

            {/* 操作 */}
            <Section title="操作">
                <div className="rp-btn-row">
                    <button className="rp-btn" onClick={actions.copySelected} title="复制 (Ctrl+C)">
                        复制
                    </button>
                    <button className="rp-btn" onClick={actions.duplicateSelected} title="原地复制 (Ctrl+D)">
                        复制一份
                    </button>
                </div>
                <button
                    className="rp-btn danger"
                    onClick={mindMapNode ? () => actions.deleteMindMapNode?.(entity) : actions.deleteSelected}
                    style={{ marginTop: 4 }}
                >
                    删除{mindMapNode ? '节点' : ''}
                </button>
            </Section>
        </>
    );
};

// ==================== 脑图信息区块 ====================

const MindMapInfoSection: React.FC<{
    entity: Entity;
    mindMapNode: MindMapNodeComponent;
    actions: RightPanelActions;
}> = ({ entity, mindMapNode, actions }) => {
    const isRoot = mindMapNode.level === 0;
    const childCount = entity.children.filter(c => c.getComponent(MindMapNodeComponent)).length;

    return (
        <Section title="脑图">
            <div className="rp-info-row">
                <span className="rp-info-label">子节点</span>
                <span className="rp-info-value">{childCount}</span>
            </div>
            <div className="rp-info-row">
                <span className="rp-info-label">状态</span>
                <span className="rp-info-value">{mindMapNode.collapsed ? '已折叠' : '已展开'}</span>
            </div>

            <div className="rp-btn-row" style={{ marginTop: 6 }}>
                <button className="rp-btn primary" onClick={() => actions.addMindMapChild?.(entity)} title="Tab">
                    + 子节点
                </button>
                {!isRoot && (
                    <button className="rp-btn primary" onClick={() => actions.addMindMapSibling?.(entity)} title="Enter">
                        + 兄弟
                    </button>
                )}
            </div>
            <div className="rp-btn-row">
                {childCount > 0 && (
                    <button className="rp-btn" onClick={() => actions.toggleMindMapCollapse?.(entity)} title="Space">
                        {mindMapNode.collapsed ? '展开' : '折叠'}
                    </button>
                )}
                <button className="rp-btn" onClick={() => actions.relayoutMindMap?.()}>
                    重新布局
                </button>
            </div>

            <div className="rp-shortcuts">
                <div className="rp-shortcut-item"><span className="rp-kbd">Tab</span> 子节点</div>
                <div className="rp-shortcut-item"><span className="rp-kbd">Enter</span> 兄弟节点</div>
                <div className="rp-shortcut-item"><span className="rp-kbd">Space</span> 折叠/展开</div>
                <div className="rp-shortcut-item"><span className="rp-kbd">Del</span> 删除</div>
                <div className="rp-shortcut-item"><span className="rp-kbd">双击</span> 编辑文本</div>
            </div>
        </Section>
    );
};

// ==================== 多选内容 ====================

const MultiSelectContent: React.FC<{ entities: Entity[]; actions: RightPanelActions }> = ({ entities, actions }) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(e => {
        const l = e.getComponent(LayoutComponent);
        if (l) {
            minX = Math.min(minX, l.x);
            minY = Math.min(minY, l.y);
            maxX = Math.max(maxX, l.x + l.width);
            maxY = Math.max(maxY, l.y + l.height);
        }
    });
    const groupW = Math.round(maxX - minX);
    const groupH = Math.round(maxY - minY);

    const shapeEntities = entities.filter(e => e.getComponent(ShapeRenderer));
    const hasShapes = shapeEntities.length > 0;
    const firstShape = shapeEntities[0]?.getComponent(ShapeRenderer);

    const toHexColor = (color: number): string => '#' + color.toString(16).padStart(6, '0');

    const handleBatchFillColor = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateMultipleEntityStyle?.(shapeEntities, { fillColor: color });
    };

    const handleBatchStrokeColor = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateMultipleEntityStyle?.(shapeEntities, { strokeColor: color });
    };

    return (
        <>
            <div className="right-panel-header">
                <span className="right-panel-title">多选</span>
                <span className="right-panel-badge">{entities.length} 个元素</span>
            </div>

            <Section title="范围">
                <div className="rp-row">
                    <span className="rp-label">尺寸</span>
                    <span className="rp-value">{groupW} x {groupH}</span>
                </div>
            </Section>

            <Section title="对齐">
                <div className="rp-align-grid">
                    <button className="rp-btn" onClick={actions.alignLeft} title="左对齐">&#x2B76;</button>
                    <button className="rp-btn" onClick={actions.alignCenterH} title="水平居中">&#x2B7F;</button>
                    <button className="rp-btn" onClick={actions.alignRight} title="右对齐">&#x2B78;</button>
                    <button className="rp-btn" onClick={actions.alignTop} title="顶对齐">&#x2B60;</button>
                    <button className="rp-btn" onClick={actions.alignCenterV} title="垂直居中">&#x2B5F;</button>
                    <button className="rp-btn" onClick={actions.alignBottom} title="底对齐">&#x2B61;</button>
                </div>
                {entities.length >= 3 && (
                    <div className="rp-btn-row" style={{ marginTop: 4 }}>
                        <button className="rp-btn small" onClick={actions.distributeH} title="水平等间距">
                            &#x21D4; 水平分布
                        </button>
                        <button className="rp-btn small" onClick={actions.distributeV} title="垂直等间距">
                            &#x21D5; 垂直分布
                        </button>
                    </div>
                )}
            </Section>

            {hasShapes && firstShape && (
                <Section title="批量样式">
                    <div className="rp-row">
                        <span className="rp-label">填充</span>
                        <input
                            type="color"
                            className="rp-color-input"
                            value={toHexColor(firstShape.style.fillColor ?? 0xffffff)}
                            onChange={(e) => handleBatchFillColor(e.target.value)}
                        />
                    </div>
                    <div className="rp-row">
                        <span className="rp-label">描边</span>
                        <input
                            type="color"
                            className="rp-color-input"
                            value={toHexColor(firstShape.style.strokeColor ?? 0x333333)}
                            onChange={(e) => handleBatchStrokeColor(e.target.value)}
                        />
                    </div>
                </Section>
            )}

            <Section title="层级">
                <div className="rp-btn-row">
                    <button className="rp-btn" onClick={actions.bringToFront} title="置顶">
                        &#x2B06; 置顶
                    </button>
                    <button className="rp-btn" onClick={actions.sendToBack} title="置底">
                        &#x2B07; 置底
                    </button>
                </div>
            </Section>

            <Section title="操作">
                <div className="rp-btn-row">
                    <button className="rp-btn" onClick={actions.copySelected} title="复制 (Ctrl+C)">
                        复制
                    </button>
                    <button className="rp-btn" onClick={actions.duplicateSelected} title="原地复制 (Ctrl+D)">
                        复制一份
                    </button>
                </div>
                <button className="rp-btn danger" onClick={actions.deleteSelected} style={{ marginTop: 4 }}>
                    删除选中 ({entities.length})
                </button>
            </Section>
        </>
    );
};

// ==================== 富文本属性区块 ====================

const RichTextSection: React.FC<{
    entity: Entity;
    richTextComp: RichTextComponent;
    actions: RightPanelActions;
}> = ({ entity, richTextComp, actions }) => {
    const editor = richTextComp.editor;
    const style = editor.style;

    const fillPaint = style.fillPaints?.[0];
    const textColorHex = fillPaint?.color
        ? '#' + [fillPaint.color.r, fillPaint.color.g, fillPaint.color.b]
            .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
            .join('')
        : '#333333';

    const applyAndRedraw = () => {
        editor.apply();
        richTextComp.needsRender = true;
        const renderer = entity.getComponent(RichTextRenderer);
        if (renderer) {
            renderer.drawText(editor);
            renderer.dirty = true;
        }
    };

    const handleFontSizeChange = (value: number) => {
        const clamped = Math.max(1, Math.min(999, value));
        editor.setStyle({ fontSize: clamped });
        applyAndRedraw();
        actions.updateTextStyle?.(entity, { fontSize: clamped });
    };

    const handleTextColorChange = (hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        editor.setStyle({
            fillPaints: [{
                type: 'SOLID',
                color: { r, g, b, a: 1 },
                opacity: 1,
                visible: true,
                blendMode: 'NORMAL',
            }],
        });
        applyAndRedraw();
        actions.updateTextStyle?.(entity, { fillColor: hexColor });
    };

    const handleAlignChange = (align: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED') => {
        editor.setStyle({ textAlignHorizontal: align });
        applyAndRedraw();
        actions.updateTextStyle?.(entity, { textAlignHorizontal: align });
    };

    const handleDecorationChange = (decoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH') => {
        editor.setStyle({ textDecoration: decoration });
        applyAndRedraw();
        actions.updateTextStyle?.(entity, { textDecoration: decoration });
    };

    return (
        <Section title="文字">
            <EditableRow
                label="字号"
                value={style.fontSize}
                onChange={handleFontSizeChange}
                min={1}
                max={999}
                suffix="px"
            />
            <div className="rp-row">
                <span className="rp-label">颜色</span>
                <input
                    type="color"
                    className="rp-color-input"
                    value={textColorHex}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                />
            </div>
            <div className="rp-row">
                <span className="rp-label">对齐</span>
                <div className="rp-btn-group">
                    {(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] as const).map(a => (
                        <button
                            key={a}
                            className={`rp-btn small ${style.textAlignHorizontal === a ? 'active' : ''}`}
                            onClick={() => handleAlignChange(a)}
                            title={a === 'LEFT' ? '左对齐' : a === 'CENTER' ? '居中' : a === 'RIGHT' ? '右对齐' : '两端对齐'}
                        >
                            {a[0]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="rp-row">
                <span className="rp-label">装饰</span>
                <div className="rp-btn-group">
                    {(['NONE', 'UNDERLINE', 'STRIKETHROUGH'] as const).map(d => (
                        <button
                            key={d}
                            className={`rp-btn small ${style.textDecoration === d ? 'active' : ''}`}
                            onClick={() => handleDecorationChange(d)}
                            title={d === 'NONE' ? '无' : d === 'UNDERLINE' ? '下划线' : '删除线'}
                        >
                            {d === 'NONE' ? 'N' : d === 'UNDERLINE' ? 'U' : 'S'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="rp-row">
                <span className="rp-label">字体</span>
                <span className="rp-value">{style.fontName.family}</span>
            </div>
        </Section>
    );
};

// ==================== 通用子组件 ====================

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="rp-section">
        <div className="rp-section-title">{title}</div>
        {children}
    </div>
);

interface EditableRowProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
}

const EditableRow: React.FC<EditableRowProps> = ({
    label, value, onChange, suffix = '', min, max, step = 1,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(value));

    const handleDoubleClick = useCallback(() => {
        setIsEditing(true);
        setEditValue(String(value));
    }, [value]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        const num = parseFloat(editValue);
        if (!isNaN(num)) {
            let clamped = num;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
        }
    }, [editValue, onChange, min, max]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        else if (e.key === 'Escape') setIsEditing(false);
    }, []);

    if (isEditing) {
        return (
            <div className="rp-row">
                <span className="rp-label">{label}</span>
                <input
                    type="number"
                    className="rp-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    step={step}
                    min={min}
                    max={max}
                    autoFocus
                />
                {suffix && <span className="rp-suffix">{suffix}</span>}
            </div>
        );
    }

    return (
        <div className="rp-row" onDoubleClick={handleDoubleClick}>
            <span className="rp-label">{label}</span>
            <span className="rp-value">{value}{suffix}</span>
        </div>
    );
};

export default RightPanel;
