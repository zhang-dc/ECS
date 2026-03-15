import { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuAction {
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
}

export interface ContextMenuSection {
    items: ContextMenuAction[];
}

interface ContextMenuProps {
    /** 是否显示 */
    open: boolean;
    /** 菜单位置（屏幕坐标） */
    x: number;
    y: number;
    /** 菜单分组 */
    sections: ContextMenuSection[];
    /** 关闭回调 */
    onClose: () => void;
}

export default function ContextMenu({ open, x, y, sections, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        // 下一帧再绑定，避免当前右键事件立刻触发关闭
        requestAnimationFrame(() => {
            document.addEventListener('mousedown', handleClick, true);
            document.addEventListener('keydown', handleKey, true);
        });
        return () => {
            document.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('keydown', handleKey, true);
        };
    }, [open, onClose]);

    // 边界修正
    useEffect(() => {
        if (!open || !menuRef.current) return;
        const el = menuRef.current;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (rect.right > vw) {
            el.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > vh) {
            el.style.top = `${y - rect.height}px`;
        }
    }, [open, x, y, sections]);

    if (!open || sections.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="context-menu-content"
            style={{ position: 'fixed', left: x, top: y }}
        >
            {sections.map((section, sIdx) => (
                <div key={sIdx}>
                    {sIdx > 0 && <div className="context-menu-separator" />}
                    {section.items.map((item, iIdx) => (
                        <div
                            key={iIdx}
                            className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                            onClick={() => {
                                if (item.disabled) return;
                                item.onClick();
                                onClose();
                            }}
                        >
                            <span className="context-menu-label">{item.label}</span>
                            {item.shortcut && (
                                <span className="context-menu-shortcut">{item.shortcut}</span>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
