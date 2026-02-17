import { BaseComponent, BaseComponentProps } from '../../Component';
import { Editor } from '../../rich-text/interfaces/editor';

export interface RichTextComponentProps extends BaseComponentProps {
    editor: Editor;
}

/**
 * 富文本数据组件
 * 持有 rich-text Editor 实例，作为文本实体的核心数据源。
 * Editor 包含所有文本数据（characters、styleOverrideTable、lines）
 * 以及排版结果（derivedTextData.glyphs、baselines）。
 */
export class RichTextComponent extends BaseComponent {
    /** rich-text Editor 实例 */
    editor: Editor;
    /** 标记是否需要重绘 */
    needsRender: boolean = true;

    constructor(props: RichTextComponentProps) {
        super(props);
        this.editor = props.editor;
    }
}
