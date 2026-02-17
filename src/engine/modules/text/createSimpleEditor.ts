import {
    Editor,
    setStyle,
    layout,
    setSelection,
    getMetrices,
    insertText,
    getSelection,
    getFonts,
    getText,
    getBaselines,
    getGlyphs,
    selectForXY,
    isCollapse,
    hasSelection,
    deselection,
    getBaseLineCharacterOffset,
    apply,
    deleteText,
    getSelectionRects,
    replaceText,
    selectForCharacterOffset,
    getFont,
    getSelectCharacterOffset,
    getStyleForSelection,
    getTextDecorationRects,
    getFillPaintsForGlyphs,
    addEventListener,
    removeEventListener,
    layoutW,
    layoutH,
    getStyle,
    getTextListTypeForSelection,
    setTextList,
    loadDefaultFont,
    getStyleForStyleID,
    addIndent,
    reduceIndent,
    selectAll,
    getSelectionXY,
    isHoverForQuadrant,
    arrowMove,
    fontMgrFromURL,
    addFontSize,
    reduceFontSize,
    addLineHeight,
    reduceLineHeight,
    addLetterSpacing,
    reduceLetterSpacing,
    getAutoLineHeightOfPixels,
    setParagraphSpacing,
    getParagraphSpacing,
    boldFont,
    italicFont,
    FillPaintType,
} from '../../rich-text';
import detectLangModel from '../../rich-text/detect-lang/pkg/detect_lang';
// @ts-ignore webpack asset/resource import
import wasmURL from '../../rich-text/detect-lang/pkg/detect_lang_bg.wasm';

/** 全局初始化状态（WASM 只需加载一次） */
let wasmInitPromise: Promise<void> | null = null;
let wasmInitDone = false;

/**
 * 全局初始化 WASM 语言检测模型（只加载一次）
 */
async function ensureWasmInit(): Promise<void> {
    if (wasmInitDone) return;
    if (!wasmInitPromise) {
        wasmInitPromise = (async () => {
            await detectLangModel(wasmURL);
            wasmInitDone = true;
        })();
    }
    await wasmInitPromise;
}

export interface SimpleEditorOptions {
    text: string;
    fontSize?: number;
    color?: { r: number; g: number; b: number; a: number };
    fontFamily?: string;
    textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT';
}

/**
 * 创建一个简化的 rich-text Editor 实例
 * 异步初始化字体和 WASM（全局只加载一次）
 * 
 * @param options 文本选项
 * @param onReady 初始化完成后的回调（用于触发重绘）
 */
export function createSimpleEditor(
    options: SimpleEditorOptions,
    onReady?: (editor: Editor) => void,
): Editor {
    const {
        text,
        fontSize = 16,
        fontFamily = 'Inter',
        textAutoResize = 'WIDTH_AND_HEIGHT',
    } = options;

    // 默认颜色：黑色
    const color = options.color ?? { r: 0.2, g: 0.2, b: 0.2, a: 1 };

    const fillPaints: FillPaintType[] = [{
        type: 'SOLID',
        color,
        opacity: 1,
        visible: true,
        blendMode: 'NORMAL',
    }];

    const editor: Editor = {
        width: 0,
        height: 0,
        fonMgr: new Map(),
        style: {
            fontSize,
            textAlignHorizontal: 'LEFT',
            textAlignVertical: 'TOP',
            textAutoResize,
            fontName: {
                family: fontFamily,
                style: 'Regular',
                postscript: `${fontFamily}-Regular`,
            },
            fillPaints,
            paragraphIndent: 0,
            lineHeight: {
                units: 'PERCENT',
                value: 100,
            },
            letterSpacing: {
                units: 'PERCENT',
                value: 0,
            },
            fontVariations: {},
            fontLigatures: 'ENABLE',
            textDecoration: 'NONE',
            textCase: 'NONE',
            fontPosition: 'NONE',
            fontNumericFraction: 'DISABLE',
            maxLines: 999,
            textTruncation: 'DISABLE',
            truncationStartIndex: -1,
            truncatedHeight: -1,
            leadingTrim: 'NONE',
        },
        __selection: {
            anchor: -1,
            focus: -1,
            anchorOffset: -1,
            focusOffset: -1,
        },
        __select_styles: {},
        __events: {},
        __need_cache: 'none',
        isEditor: false,
        derivedTextData: {},
        textData: {
            characters: text,
            lines: [{
                lineType: 'PLAIN',
                indentationLevel: 0,
                isFirstLineOfList: true,
                listStartOffset: 0,
                paragraphSpacing: 0,
            }],
            characterStyleIDs: new Array(text.length).fill(0),
            styleOverrideTable: [],
        },
        fontMetaData: [{
            key: `${fontFamily}#Regular#${fontFamily}-Regular`,
            assetURL: 'https://static.figma.com/font/Inter-Regular_1',
        }],

        // Core
        layout: (...args) => layout(editor, ...args),
        layoutW: (...args) => layoutW(editor, ...args),
        layoutH: (...args) => layoutH(editor, ...args),
        apply: (...args) => apply(editor, ...args),

        // Editor
        setStyle: (...args) => setStyle(editor, ...args),
        getStyle: (...args) => getStyle(editor, ...args),
        getStyleForSelection: (...args) => getStyleForSelection(editor, ...args),
        insertText: (...args) => insertText(editor, ...args),
        replaceText: (...args) => replaceText(editor, ...args),
        addFontSize: (...args) => addFontSize(editor, ...args),
        reduceFontSize: (...args) => reduceFontSize(editor, ...args),
        getText: (...args) => getText(editor, ...args),
        getMetrices: (...args) => getMetrices(editor, ...args),
        getBaselines: (...args) => getBaselines(editor, ...args),
        getGlyphs: (...args) => getGlyphs(editor, ...args),
        getBaseLineCharacterOffset: (...args) => getBaseLineCharacterOffset(editor, ...args),
        deleteText: (...args) => deleteText(editor, ...args),
        getTextDecorationRects: (...args) => getTextDecorationRects(editor, ...args),
        getFillPaintsForGlyphs: (...args) => getFillPaintsForGlyphs(editor, ...args),
        addEventListener: (...args) => addEventListener(editor, ...args),
        removeEventListener: (...args) => removeEventListener(editor, ...args),
        getTextListTypeForSelection: (...args) => getTextListTypeForSelection(editor, ...args),
        setTextList: (...args) => setTextList(editor, ...args),
        getStyleForStyleID: (...args) => getStyleForStyleID(editor, ...args),
        addIndent: (...args) => addIndent(editor, ...args),
        reduceIndent: (...args) => reduceIndent(editor, ...args),
        isHoverForQuadrant: (...args) => isHoverForQuadrant(editor, ...args),
        arrowMove: (...args) => arrowMove(editor, ...args),
        addLineHeight: (...args) => addLineHeight(editor, ...args),
        reduceLineHeight: (...args) => reduceLineHeight(editor, ...args),
        addLetterSpacing: (...args) => addLetterSpacing(editor, ...args),
        reduceLetterSpacing: (...args) => reduceLetterSpacing(editor, ...args),
        getAutoLineHeightOfPixels: (...args) => getAutoLineHeightOfPixels(editor, ...args),
        setParagraphSpacing: (...args) => setParagraphSpacing(editor, ...args),
        getParagraphSpacing: (...args) => getParagraphSpacing(editor, ...args),
        boldFont: (...args) => boldFont(editor, ...args),
        italicFont: (...args) => italicFont(editor, ...args),

        // Font
        fontMgrFromURL: (...args) => fontMgrFromURL(editor, ...args),
        getFont: (...args) => getFont(editor, ...args),
        getFonts: (...args) => getFonts(editor, ...args),

        // Selection
        setSelection: (...args) => setSelection(editor, ...args),
        getSelection: (...args) => getSelection(editor, ...args),
        selectForXY: (...args) => selectForXY(editor, ...args),
        selectForCharacterOffset: (...args) => selectForCharacterOffset(editor, ...args),
        getSelectCharacterOffset: (...args) => getSelectCharacterOffset(editor, ...args),
        isCollapse: (...args) => isCollapse(editor, ...args),
        hasSelection: (...args) => hasSelection(editor, ...args),
        deselection: (...args) => deselection(editor, ...args),
        getSelectionRects: (...args) => getSelectionRects(editor, ...args),
        selectAll: (...args) => selectAll(editor, ...args),
        getSelectionXY: (...args) => getSelectionXY(editor, ...args),
    };

    // 监听 layout 事件（字体异步加载完成后会自动触发 apply → layout 事件）
    editor.addEventListener('layout', () => {
        onReady?.(editor);
    });

    // 异步初始化：加载默认子集字体 + WASM + 主字体，然后执行首次排版
    (async () => {
        await loadDefaultFont(editor);
        await ensureWasmInit();
        // 先加载主字体（如 Inter），确保首次 apply 时字体可用
        const fontName = editor.style.fontName;
        const metaData = editor.fontMetaData.find(
            item => item.key === `${fontName.family}#${fontName.style}#${fontName.postscript}`
        );
        if (metaData?.assetURL) {
            await editor.fontMgrFromURL(fontName, metaData.assetURL);
        }
        editor.apply();
    })();

    return editor;
}
