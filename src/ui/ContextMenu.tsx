import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
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

interface CanvasContextMenuProps {
    children: React.ReactNode;
    sections: ContextMenuSection[];
    onOpenChange?: (open: boolean) => void;
}

export default function CanvasContextMenu({ children, sections, onOpenChange }: CanvasContextMenuProps) {
    return (
        <ContextMenuPrimitive.Root onOpenChange={onOpenChange}>
            <ContextMenuPrimitive.Trigger asChild>
                {children}
            </ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal>
                <ContextMenuPrimitive.Content className="context-menu-content">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx}>
                            {sIdx > 0 && <ContextMenuPrimitive.Separator className="context-menu-separator" />}
                            {section.items.map((item, iIdx) => (
                                <ContextMenuPrimitive.Item
                                    key={iIdx}
                                    className="context-menu-item"
                                    disabled={item.disabled}
                                    onSelect={item.onClick}
                                >
                                    <span className="context-menu-label">{item.label}</span>
                                    {item.shortcut && (
                                        <span className="context-menu-shortcut">{item.shortcut}</span>
                                    )}
                                </ContextMenuPrimitive.Item>
                            ))}
                        </div>
                    ))}
                </ContextMenuPrimitive.Content>
            </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>
    );
}
