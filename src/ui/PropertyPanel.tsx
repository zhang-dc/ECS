import React, { useCallback, useRef, useState } from 'react';
import { Entity } from '../engine/Entity';
import { ECSState } from '../engine/bridge/ECSBridge';
import { LayoutComponent } from '../engine/modules/layout/LayoutComponent';
import { ShapeRenderer } from '../engine/modules/render/ShapeRenderer';
import { RichTextComponent } from '../engine/modules/text/RichTextComponent';
import { RichTextRenderer } from '../engine/modules/render/RichTextRenderer';
import './PropertyPanel.css';

export interface PropertyPanelActions {
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
}

export interface PropertyPanelProps {
    ecsState: ECSState | null;
    actions: PropertyPanelActions;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ ecsState, actions }) => {
    const selectedEntities = ecsState?.selectedEntities ?? [];

    if (selectedEntities.length === 0) {
        return (
            <div className="property-panel">
                <div className="property-panel-empty">
                    <span className="property-panel-empty-icon">📋</span>
                    <span>未选中任何元素</span>
                    <span className="property-panel-hint">点击画布上的元素或使用左侧工具创建新元素</span>
                </div>
            </div>
        );
    }

    if (selectedEntities.length > 1) {
        return <MultiSelectPanel entities={selectedEntities} actions={actions} />;
    }

    // 单选
    return <SingleSelectPanel entity={selectedEntities[0]} actions={actions} />;
};

// ==================== 多选面板 ====================

const MultiSelectPanel: React.FC<{ entities: Entity[]; actions: PropertyPanelActions }> = ({ entities, actions }) => {
    // 计算选中实体的组合 AABB
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

    // 检查是否有 ShapeRenderer（用于批量样式编辑）
    const shapeEntities = entities.filter(e => e.getComponent(ShapeRenderer));
    const hasShapes = shapeEntities.length > 0;

    // 获取第一个 shape 的样式作为默认值
    const firstShape = shapeEntities[0]?.getComponent(ShapeRenderer);

    const handleBatchFillColor = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateMultipleEntityStyle?.(shapeEntities, { fillColor: color });
    };

    const handleBatchStrokeColor = (hexColor: string) => {
        const color = parseInt(hexColor.replace('#', ''), 16);
        actions.updateMultipleEntityStyle?.(shapeEntities, { strokeColor: color });
    };

    const toHexColor = (color: number): string => {
        return '#' + color.toString(16).padStart(6, '0');
    };

    return (
        <div className="property-panel">
            <div className="property-panel-header">
                <span className="property-panel-title">多选 ({entities.length})</span>
            </div>

            <PropertySection title="组合信息">
                <div className="property-row">
                    <span className="property-label">范围</span>
                    <span className="property-value">{groupW} × {groupH}</span>
                </div>
            </PropertySection>

            <PropertySection title="对齐">
                <div className="property-row-buttons align-buttons">
                    <button className="property-btn small" onClick={actions.alignLeft} title="左对齐">
                        ⫷
                    </button>
                    <button className="property-btn small" onClick={actions.alignCenterH} title="水平居中">
                        ⫿
                    </button>
                    <button className="property-btn small" onClick={actions.alignRight} title="右对齐">
                        ⫸
                    </button>
                    <button className="property-btn small" onClick={actions.alignTop} title="顶对齐">
                        ⫠
                    </button>
                    <button className="property-btn small" onClick={actions.alignCenterV} title="垂直居中">
                        ⫟
                    </button>
                    <button className="property-btn small" onClick={actions.alignBottom} title="底对齐">
                        ⫡
                    </button>
                </div>
                {entities.length >= 3 && (
                    <div className="property-row-buttons">
                        <button className="property-btn small" onClick={actions.distributeH} title="水平等间距">
                            ⇔ 水平分布
                        </button>
                        <button className="property-btn small" onClick={actions.distributeV} title="垂直等间距">
                            ⇕ 垂直分布
                        </button>
                    </div>
                )}
            </PropertySection>

            {hasShapes && firstShape && (
                <PropertySection title="批量样式">
                    <div className="property-row">
                        <span className="property-label">填充</span>
                        <input
                            type="color"
                            className="property-color-input"
                            value={toHexColor(firstShape.style.fillColor ?? 0xffffff)}
                            onChange={(e) => handleBatchFillColor(e.target.value)}
                        />
                    </div>
                    <div className="property-row">
                        <span className="property-label">描边</span>
                        <input
                            type="color"
                            className="property-color-input"
                            value={toHexColor(firstShape.style.strokeColor ?? 0x333333)}
                            onChange={(e) => handleBatchStrokeColor(e.target.value)}
                        />
                    </div>
                </PropertySection>
            )}

            <PropertySection title="层级">
                <div className="property-row-buttons">
                    <button className="property-btn" onClick={actions.bringToFront} title="置顶">
                        ⬆ 置顶
                    </button>
                    <button className="property-btn" onClick={actions.sendToBack} title="置底">
                        ⬇ 置底
                    </button>
                </div>
            </PropertySection>

            <PropertySection title="操作">
                <div className="property-row-buttons">
                    <button className="property-btn" onClick={actions.copySelected} title="复制 (Ctrl+C)">
                        📋 复制
                    </button>
                    <button className="property-btn" onClick={actions.duplicateSelected} title="原地复制 (Ctrl+D)">
                        📄 复制一份
                    </button>
                </div>
                <button className="property-btn danger" onClick={actions.deleteSelected}>
                    🗑 删除选中 ({entities.length})
                </button>
            </PropertySection>
        </div>
    );
};

// ==================== 单选面板 ====================

const SingleSelectPanel: React.FC<{ entity: Entity; actions: PropertyPanelActions }> = ({ entity, actions }) => {
    const layoutComp = entity.getComponent(LayoutComponent);
    const shapeRenderer = entity.getComponent(ShapeRenderer);
    const richTextComp = entity.getComponent(RichTextComponent);
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
            if (dataUrl) {
                actions.replaceImage?.(entity, dataUrl);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleOpacityChange = (value: number) => {
        actions.updateImageOpacity?.(entity, value / 100);
    };

    return (
        <div className="property-panel">
            <div className="property-panel-header">
                <span className="property-panel-title">{entity.name}</span>
            </div>

            {layoutComp && (
                <>
                    <PropertySection title="位置">
                        <EditablePropertyRow
                            label="X"
                            value={Math.round(layoutComp.x)}
                            onChange={(v) => handlePropertyChange('x', v)}
                        />
                        <EditablePropertyRow
                            label="Y"
                            value={Math.round(layoutComp.y)}
                            onChange={(v) => handlePropertyChange('y', v)}
                        />
                    </PropertySection>

                    <PropertySection title="尺寸">
                        <EditablePropertyRow
                            label="W"
                            value={Math.round(layoutComp.width)}
                            onChange={(v) => handlePropertyChange('width', v)}
                            min={1}
                        />
                        <EditablePropertyRow
                            label="H"
                            value={Math.round(layoutComp.height)}
                            onChange={(v) => handlePropertyChange('height', v)}
                            min={1}
                        />
                    </PropertySection>

                    <PropertySection title="变换">
                        <EditablePropertyRow
                            label="旋转"
                            value={Math.round(layoutComp.rotation * 180 / Math.PI)}
                            onChange={(v) => handlePropertyChange('rotation', v * Math.PI / 180)}
                            suffix="°"
                        />
                        <EditablePropertyRow
                            label="缩放X"
                            value={Number(layoutComp.scaleX.toFixed(2))}
                            onChange={(v) => handlePropertyChange('scaleX', v)}
                            step={0.1}
                        />
                        <EditablePropertyRow
                            label="缩放Y"
                            value={Number(layoutComp.scaleY.toFixed(2))}
                            onChange={(v) => handlePropertyChange('scaleY', v)}
                            step={0.1}
                        />
                    </PropertySection>

                    {shapeRenderer && (
                        <PropertySection title="样式">
                            <div className="property-row">
                                <span className="property-label">填充</span>
                                <input
                                    type="color"
                                    className="property-color-input"
                                    value={toHexColor(shapeRenderer.style.fillColor ?? 0xffffff)}
                                    onChange={(e) => handleFillColorChange(e.target.value)}
                                />
                            </div>
                            <div className="property-row">
                                <span className="property-label">描边</span>
                                <input
                                    type="color"
                                    className="property-color-input"
                                    value={toHexColor(shapeRenderer.style.strokeColor ?? 0x333333)}
                                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                                />
                            </div>
                        </PropertySection>
                    )}

                    {richTextComp && (
                        <RichTextPropertySection
                            entity={entity}
                            richTextComp={richTextComp}
                            actions={actions}
                        />
                    )}

                    {textureFillInfo && (
                        <PropertySection title="图片">
                            <div className="property-row">
                                <span className="property-label">原始</span>
                                <span className="property-value">
                                    {textureFillInfo.naturalWidth || '?'} × {textureFillInfo.naturalHeight || '?'}
                                </span>
                            </div>
                            <div className="property-row">
                                <span className="property-label">透明度</span>
                                <input
                                    type="range"
                                    className="property-range-input"
                                    min={0}
                                    max={100}
                                    value={Math.round(textureFillInfo.opacity * 100)}
                                    onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                                />
                                <span className="property-value-small">
                                    {Math.round(textureFillInfo.opacity * 100)}%
                                </span>
                            </div>
                            <button
                                className="property-btn"
                                onClick={() => replaceInputRef.current?.click()}
                            >
                                替换图片
                            </button>
                            <input
                                ref={replaceInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleReplaceImage}
                            />
                        </PropertySection>
                    )}

                    <PropertySection title="层级">
                        <EditablePropertyRow
                            label="Z-Index"
                            value={layoutComp.zIndex}
                            onChange={(v) => handlePropertyChange('zIndex', v)}
                        />
                        <div className="property-row-buttons">
                            <button className="property-btn" onClick={actions.bringToFront} title="置顶">
                                ⬆ 置顶
                            </button>
                            <button className="property-btn" onClick={actions.sendToBack} title="置底">
                                ⬇ 置底
                            </button>
                        </div>
                    </PropertySection>
                </>
            )}

            <PropertySection title="操作">
                <div className="property-row-buttons">
                    <button className="property-btn" onClick={actions.copySelected} title="复制 (Ctrl+C)">
                        📋 复制
                    </button>
                    <button className="property-btn" onClick={actions.duplicateSelected} title="原地复制 (Ctrl+D)">
                        📄 复制一份
                    </button>
                </div>
                <button className="property-btn danger" onClick={actions.deleteSelected}>
                    🗑 删除
                </button>
            </PropertySection>
        </div>
    );
};

// ==================== 子组件 ====================

const PropertySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="property-section">
        <div className="property-section-title">{title}</div>
        {children}
    </div>
);

interface EditablePropertyRowProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
}

const EditablePropertyRow: React.FC<EditablePropertyRowProps> = ({
    label,
    value,
    onChange,
    suffix = '',
    min,
    max,
    step = 1,
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
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    }, []);

    if (isEditing) {
        return (
            <div className="property-row">
                <span className="property-label">{label}</span>
                <input
                    type="number"
                    className="property-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    step={step}
                    min={min}
                    max={max}
                    autoFocus
                />
                {suffix && <span className="property-suffix">{suffix}</span>}
            </div>
        );
    }

    return (
        <div className="property-row" onDoubleClick={handleDoubleClick}>
            <span className="property-label">{label}</span>
            <span className="property-value">{value}{suffix}</span>
        </div>
    );
};

// ==================== 富文本属性面板 ====================

const RichTextPropertySection: React.FC<{
    entity: Entity;
    richTextComp: RichTextComponent;
    actions: PropertyPanelActions;
}> = ({ entity, richTextComp, actions }) => {
    const editor = richTextComp.editor;
    const style = editor.style;

    // 获取当前文字颜色
    const fillPaint = style.fillPaints?.[0];
    const textColorHex = fillPaint?.color
        ? '#' + [fillPaint.color.r, fillPaint.color.g, fillPaint.color.b]
            .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
            .join('')
        : '#333333';

    const handleFontSizeChange = (value: number) => {
        const clamped = Math.max(1, Math.min(999, value));
        editor.setStyle({ fontSize: clamped });
        editor.apply();
        richTextComp.needsRender = true;
        const renderer = entity.getComponent(RichTextRenderer);
        if (renderer) {
            renderer.drawText(editor);
            renderer.dirty = true;
        }
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
        editor.apply();
        richTextComp.needsRender = true;
        const renderer = entity.getComponent(RichTextRenderer);
        if (renderer) {
            renderer.drawText(editor);
            renderer.dirty = true;
        }
        actions.updateTextStyle?.(entity, { fillColor: hexColor });
    };

    const handleAlignChange = (align: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED') => {
        editor.setStyle({ textAlignHorizontal: align });
        editor.apply();
        richTextComp.needsRender = true;
        const renderer = entity.getComponent(RichTextRenderer);
        if (renderer) {
            renderer.drawText(editor);
            renderer.dirty = true;
        }
        actions.updateTextStyle?.(entity, { textAlignHorizontal: align });
    };

    const handleDecorationChange = (decoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH') => {
        editor.setStyle({ textDecoration: decoration });
        editor.apply();
        richTextComp.needsRender = true;
        const renderer = entity.getComponent(RichTextRenderer);
        if (renderer) {
            renderer.drawText(editor);
            renderer.dirty = true;
        }
        actions.updateTextStyle?.(entity, { textDecoration: decoration });
    };

    return (
        <PropertySection title="文字">
            <EditablePropertyRow
                label="字号"
                value={style.fontSize}
                onChange={handleFontSizeChange}
                min={1}
                max={999}
                suffix="px"
            />
            <div className="property-row">
                <span className="property-label">颜色</span>
                <input
                    type="color"
                    className="property-color-input"
                    value={textColorHex}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                />
            </div>
            <div className="property-row">
                <span className="property-label">对齐</span>
                <div className="property-btn-group">
                    <button
                        className={`property-btn small ${style.textAlignHorizontal === 'LEFT' ? 'active' : ''}`}
                        onClick={() => handleAlignChange('LEFT')}
                        title="左对齐"
                    >
                        L
                    </button>
                    <button
                        className={`property-btn small ${style.textAlignHorizontal === 'CENTER' ? 'active' : ''}`}
                        onClick={() => handleAlignChange('CENTER')}
                        title="居中"
                    >
                        C
                    </button>
                    <button
                        className={`property-btn small ${style.textAlignHorizontal === 'RIGHT' ? 'active' : ''}`}
                        onClick={() => handleAlignChange('RIGHT')}
                        title="右对齐"
                    >
                        R
                    </button>
                    <button
                        className={`property-btn small ${style.textAlignHorizontal === 'JUSTIFIED' ? 'active' : ''}`}
                        onClick={() => handleAlignChange('JUSTIFIED')}
                        title="两端对齐"
                    >
                        J
                    </button>
                </div>
            </div>
            <div className="property-row">
                <span className="property-label">装饰</span>
                <div className="property-btn-group">
                    <button
                        className={`property-btn small ${style.textDecoration === 'NONE' ? 'active' : ''}`}
                        onClick={() => handleDecorationChange('NONE')}
                        title="无"
                    >
                        N
                    </button>
                    <button
                        className={`property-btn small ${style.textDecoration === 'UNDERLINE' ? 'active' : ''}`}
                        onClick={() => handleDecorationChange('UNDERLINE')}
                        title="下划线"
                    >
                        U
                    </button>
                    <button
                        className={`property-btn small ${style.textDecoration === 'STRIKETHROUGH' ? 'active' : ''}`}
                        onClick={() => handleDecorationChange('STRIKETHROUGH')}
                        title="删除线"
                    >
                        S
                    </button>
                </div>
            </div>
            <div className="property-row">
                <span className="property-label">字体</span>
                <span className="property-value">{style.fontName.family}</span>
            </div>
        </PropertySection>
    );
};

export default PropertyPanel;
