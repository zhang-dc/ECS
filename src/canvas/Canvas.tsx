import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Canvas.css';
import { Stage } from '../engine/Stage';
import { initCanvasScene } from './scene';
import { ECSBridge } from '../engine/bridge/ECSBridge';
import { useECSState, useECSActions } from '../engine/bridge/useECS';
import Toolbar from '../ui/Toolbar';
import ToolPanel from '../ui/ToolPanel';
import RightPanel from '../ui/RightPanel';

/** 预加载图片获取原始宽高 */
function loadImageSize(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = src;
    });
}

/** 根据原始尺寸计算限制后的显示尺寸（最大 400px，保持宽高比） */
function constrainImageSize(natW: number, natH: number, maxSize = 400): { width: number; height: number } {
    let w = natW;
    let h = natH;
    if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }
    return { width: w, height: h };
}

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const [bridge, setBridge] = useState<ECSBridge | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        if (!canvas || !mask) return;
        const container = canvas.parentElement;
        const size = container?.getBoundingClientRect();
        if (!size) return;
        canvas.width = Math.floor(size.width);
        canvas.height = Math.floor(size.height);
        const world = new Stage();
        const taskFlow = initCanvasScene({ world, canvas, mask });

        // 创建 ECS 桥接器
        const ecsBridge = new ECSBridge(world);

        taskFlow.run();

        // 在系统启动后初始化桥接器
        ecsBridge.init();
        setBridge(ecsBridge);

        return () => {
            taskFlow.stop();
            ecsBridge.destroy();
        };
    }, []);

    const ecsState = useECSState(bridge);
    const actions = useECSActions(bridge);

    /** 在视口中心插入图片（先获取原始尺寸，再创建实体） */
    const insertImageAtCenter = useCallback(async (dataUrl: string) => {
        if (!bridge) return;
        try {
            const natural = await loadImageSize(dataUrl);
            const { width, height } = constrainImageSize(natural.width, natural.height);
            const state = bridge.getState();
            const centerX = state.viewportOffsetX + (window.innerWidth / 2) / state.viewportScale;
            const centerY = state.viewportOffsetY + (window.innerHeight / 2) / state.viewportScale;
            bridge.addImage({
                x: centerX - width / 2,
                y: centerY - height / 2,
                width,
                height,
                src: dataUrl,
            });
        } catch {
            // 图片尺寸获取失败，使用默认尺寸
            const state = bridge.getState();
            const centerX = state.viewportOffsetX + (window.innerWidth / 2) / state.viewportScale;
            const centerY = state.viewportOffsetY + (window.innerHeight / 2) / state.viewportScale;
            bridge.addImage({ x: centerX - 100, y: centerY - 100, src: dataUrl });
        }
    }, [bridge]);

    /** 在指定屏幕位置插入图片（先获取原始尺寸，再创建实体） */
    const insertImageAtPosition = useCallback(async (dataUrl: string, screenX: number, screenY: number) => {
        if (!bridge) return;
        try {
            const natural = await loadImageSize(dataUrl);
            const { width, height } = constrainImageSize(natural.width, natural.height);
            const state = bridge.getState();
            const worldX = state.viewportOffsetX + screenX / state.viewportScale;
            const worldY = state.viewportOffsetY + screenY / state.viewportScale;
            bridge.addImage({
                x: worldX - width / 2,
                y: worldY - height / 2,
                width,
                height,
                src: dataUrl,
            });
        } catch {
            // 图片尺寸获取失败，使用默认尺寸
            const state = bridge.getState();
            const worldX = state.viewportOffsetX + screenX / state.viewportScale;
            const worldY = state.viewportOffsetY + screenY / state.viewportScale;
            bridge.addImage({ x: worldX, y: worldY, src: dataUrl });
        }
    }, [bridge]);

    /** 从文件读取 DataURL */
    const readFileAsDataUrl = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) resolve(result);
                else reject(new Error('Failed to read file'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }, []);

    // ==================== 拖拽上传 ====================

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));

        // 获取画布容器的位置来计算相对坐标
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        for (let i = 0; i < imageFiles.length; i++) {
            try {
                const dataUrl = await readFileAsDataUrl(imageFiles[i]);
                // 多个图片稍微错开位置
                insertImageAtPosition(dataUrl, screenX + i * 30, screenY + i * 30);
            } catch {
                // 忽略读取失败的文件
            }
        }

        // 也支持拖拽 URL（从浏览器拖拽图片）
        if (imageFiles.length === 0) {
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                // insertImageAtPosition 内部会先 loadImageSize 获取尺寸
                // 如果跨域导致获取失败，会 fallback 到默认尺寸
                insertImageAtPosition(url, screenX, screenY);
            }
        }
    }, [readFileAsDataUrl, insertImageAtPosition]);

    // ==================== 剪贴板粘贴图片 ====================

    useEffect(() => {
        const mask = maskRef.current;
        if (!mask) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        try {
                            const dataUrl = await readFileAsDataUrl(file);
                            insertImageAtCenter(dataUrl);
                        } catch {
                            // 忽略
                        }
                    }
                    return; // 只处理第一个图片
                }
            }
        };

        mask.addEventListener('paste', handlePaste);
        return () => mask.removeEventListener('paste', handlePaste);
    }, [readFileAsDataUrl, insertImageAtCenter]);

    return (
        <div
            className={`canvas-container ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <canvas ref={canvasRef} id='canvas-main'/>
            <div ref={maskRef} id='canvas-mask' tabIndex={0}></div>
            {isDragOver && (
                <div className="canvas-drop-overlay">
                    <div className="canvas-drop-hint">
                        <span className="canvas-drop-icon">🖼</span>
                        <span>释放以插入图片</span>
                    </div>
                </div>
            )}
            {bridge && (
                <div className="canvas-ui-overlay">
                    <Toolbar
                        ecsState={ecsState}
                        actions={{
                            ...actions,
                            copySelected: actions.copySelected,
                            pasteClipboard: actions.pasteClipboard,
                            duplicateSelected: actions.duplicateSelected,
                        }}
                    />
                    <ToolPanel
                        currentTool={ecsState?.currentTool ?? 'select'}
                        onToolChange={actions.setCurrentTool}
                        onImageUpload={insertImageAtCenter}
                    />
                    <RightPanel
                        ecsState={ecsState}
                        actions={{
                            bringToFront: actions.bringToFront,
                            sendToBack: actions.sendToBack,
                            deleteSelected: actions.deleteSelected,
                            updateEntityProperty: actions.updateEntityProperty,
                            updateEntityStyle: actions.updateEntityStyle,
                            copySelected: actions.copySelected,
                            pasteClipboard: actions.pasteClipboard,
                            duplicateSelected: actions.duplicateSelected,
                            alignLeft: actions.alignLeft,
                            alignRight: actions.alignRight,
                            alignTop: actions.alignTop,
                            alignBottom: actions.alignBottom,
                            alignCenterH: actions.alignCenterH,
                            alignCenterV: actions.alignCenterV,
                            distributeH: actions.distributeH,
                            distributeV: actions.distributeV,
                            updateMultipleEntityStyle: actions.updateMultipleEntityStyle,
                            replaceImage: actions.replaceImage,
                            updateImageOpacity: actions.updateImageOpacity,
                            addMindMapChild: actions.addMindMapChild,
                            addMindMapSibling: actions.addMindMapSibling,
                            deleteMindMapNode: actions.deleteMindMapNode,
                            toggleMindMapCollapse: actions.toggleMindMapCollapse,
                            relayoutMindMap: actions.relayoutMindMap,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default Canvas;
