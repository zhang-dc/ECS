import { Graphics } from 'pixi.js';

/**
 * SVG path 命令类型
 * fontkit 的 glyph.path.toSVG() 生成的 SVG path 字符串
 * 包含 M(moveTo), L(lineTo), C(cubicBezier), Q(quadBezier), Z(close) 命令
 * 
 * 注意：fontkit 输出的 path 已经通过 scale(unitsPerPx, -unitsPerPx) 处理过，
 * 坐标已包含字号缩放和 Y 轴翻转，无需额外变换。
 */

interface PathCommand {
    type: string;
    args: number[];
}

/** 一个子路径：从 M 到 Z 的一段完整闭合路径 */
interface SubPath {
    commands: PathCommand[];
    /** 有符号面积（用于判断绕向：正=顺时针外轮廓，负=逆时针镂空） */
    signedArea: number;
    /** 近似顶点序列（用于包含关系判断） */
    vertices: Array<{ x: number; y: number }>;
}

/**
 * 解析 SVG path data 字符串为命令数组
 */
function parseSVGPath(pathData: string): PathCommand[] {
    if (!pathData) return [];

    const commands: PathCommand[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(pathData)) !== null) {
        const type = match[1];
        const argsStr = match[2].trim();

        if (type === 'Z' || type === 'z') {
            commands.push({ type: 'Z', args: [] });
            continue;
        }

        if (!argsStr) {
            commands.push({ type, args: [] });
            continue;
        }

        const args = parseNumbers(argsStr);
        commands.push({ type, args });
    }

    return commands;
}

/**
 * 从字符串中解析所有数字
 */
function parseNumbers(str: string): number[] {
    const numbers: number[] = [];
    const numRegex = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
    let m: RegExpExecArray | null;
    while ((m = numRegex.exec(str)) !== null) {
        numbers.push(parseFloat(m[0]));
    }
    return numbers;
}

/**
 * 将命令数组拆分为多个子路径（每个 M...Z 段为一个子路径）
 * 同时将所有相对命令转换为绝对坐标，并记录每个子路径的顶点序列用于计算面积
 */
function splitIntoSubPaths(commands: PathCommand[]): SubPath[] {
    const subPaths: SubPath[] = [];
    let currentCmds: PathCommand[] = [];
    let vertices: Array<{ x: number; y: number }> = [];
    let curX = 0, curY = 0;
    let startX = 0, startY = 0;
    let lastCpX = 0, lastCpY = 0;
    let lastCmd = '';

    const flushSubPath = () => {
        if (currentCmds.length > 0) {
            // 计算有符号面积（Shoelace formula）
            const area = computeSignedArea(vertices);
            subPaths.push({ commands: currentCmds, signedArea: area, vertices: vertices });
            currentCmds = [];
            vertices = [];
        }
    };

    for (const cmd of commands) {
        const { type, args } = cmd;

        switch (type) {
            case 'M': {
                // 新的 M 开始新子路径（如果当前有内容先 flush）
                if (currentCmds.length > 0) {
                    flushSubPath();
                }
                curX = args[0];
                curY = args[1];
                startX = curX;
                startY = curY;
                currentCmds.push({ type: 'M', args: [curX, curY] });
                vertices.push({ x: curX, y: curY });
                // M 后续坐标对视为隐式 L
                for (let i = 2; i < args.length; i += 2) {
                    curX = args[i];
                    curY = args[i + 1];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'm': {
                if (currentCmds.length > 0) {
                    flushSubPath();
                }
                curX += args[0];
                curY += args[1];
                startX = curX;
                startY = curY;
                currentCmds.push({ type: 'M', args: [curX, curY] });
                vertices.push({ x: curX, y: curY });
                for (let i = 2; i < args.length; i += 2) {
                    curX += args[i];
                    curY += args[i + 1];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'L': {
                for (let i = 0; i < args.length; i += 2) {
                    curX = args[i];
                    curY = args[i + 1];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'l': {
                for (let i = 0; i < args.length; i += 2) {
                    curX += args[i];
                    curY += args[i + 1];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'H': {
                for (let i = 0; i < args.length; i++) {
                    curX = args[i];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'h': {
                for (let i = 0; i < args.length; i++) {
                    curX += args[i];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'V': {
                for (let i = 0; i < args.length; i++) {
                    curY = args[i];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'v': {
                for (let i = 0; i < args.length; i++) {
                    curY += args[i];
                    currentCmds.push({ type: 'L', args: [curX, curY] });
                    vertices.push({ x: curX, y: curY });
                }
                break;
            }
            case 'C': {
                for (let i = 0; i < args.length; i += 6) {
                    const cp1x = args[i], cp1y = args[i + 1];
                    const cp2x = args[i + 2], cp2y = args[i + 3];
                    const ex = args[i + 4], ey = args[i + 5];
                    lastCpX = cp2x; lastCpY = cp2y;
                    currentCmds.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, ex, ey] });
                    // 对贝塞尔曲线采样几个点用于面积近似
                    sampleCubic(vertices, curX, curY, cp1x, cp1y, cp2x, cp2y, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'c': {
                for (let i = 0; i < args.length; i += 6) {
                    const cp1x = curX + args[i], cp1y = curY + args[i + 1];
                    const cp2x = curX + args[i + 2], cp2y = curY + args[i + 3];
                    const ex = curX + args[i + 4], ey = curY + args[i + 5];
                    lastCpX = cp2x; lastCpY = cp2y;
                    currentCmds.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, ex, ey] });
                    sampleCubic(vertices, curX, curY, cp1x, cp1y, cp2x, cp2y, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'S': {
                for (let i = 0; i < args.length; i += 4) {
                    let cp1x: number, cp1y: number;
                    if (lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's') {
                        cp1x = 2 * curX - lastCpX;
                        cp1y = 2 * curY - lastCpY;
                    } else {
                        cp1x = curX; cp1y = curY;
                    }
                    const cp2x = args[i], cp2y = args[i + 1];
                    const ex = args[i + 2], ey = args[i + 3];
                    lastCpX = cp2x; lastCpY = cp2y;
                    currentCmds.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, ex, ey] });
                    sampleCubic(vertices, curX, curY, cp1x, cp1y, cp2x, cp2y, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 's': {
                for (let i = 0; i < args.length; i += 4) {
                    let cp1x: number, cp1y: number;
                    if (lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's') {
                        cp1x = 2 * curX - lastCpX;
                        cp1y = 2 * curY - lastCpY;
                    } else {
                        cp1x = curX; cp1y = curY;
                    }
                    const cp2x = curX + args[i], cp2y = curY + args[i + 1];
                    const ex = curX + args[i + 2], ey = curY + args[i + 3];
                    lastCpX = cp2x; lastCpY = cp2y;
                    currentCmds.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, ex, ey] });
                    sampleCubic(vertices, curX, curY, cp1x, cp1y, cp2x, cp2y, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'Q': {
                for (let i = 0; i < args.length; i += 4) {
                    const cpx = args[i], cpy = args[i + 1];
                    const ex = args[i + 2], ey = args[i + 3];
                    lastCpX = cpx; lastCpY = cpy;
                    currentCmds.push({ type: 'Q', args: [cpx, cpy, ex, ey] });
                    sampleQuadratic(vertices, curX, curY, cpx, cpy, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'q': {
                for (let i = 0; i < args.length; i += 4) {
                    const cpx = curX + args[i], cpy = curY + args[i + 1];
                    const ex = curX + args[i + 2], ey = curY + args[i + 3];
                    lastCpX = cpx; lastCpY = cpy;
                    currentCmds.push({ type: 'Q', args: [cpx, cpy, ex, ey] });
                    sampleQuadratic(vertices, curX, curY, cpx, cpy, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'T': {
                for (let i = 0; i < args.length; i += 2) {
                    let cpx: number, cpy: number;
                    if (lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't') {
                        cpx = 2 * curX - lastCpX;
                        cpy = 2 * curY - lastCpY;
                    } else {
                        cpx = curX; cpy = curY;
                    }
                    const ex = args[i], ey = args[i + 1];
                    lastCpX = cpx; lastCpY = cpy;
                    currentCmds.push({ type: 'Q', args: [cpx, cpy, ex, ey] });
                    sampleQuadratic(vertices, curX, curY, cpx, cpy, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 't': {
                for (let i = 0; i < args.length; i += 2) {
                    let cpx: number, cpy: number;
                    if (lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't') {
                        cpx = 2 * curX - lastCpX;
                        cpy = 2 * curY - lastCpY;
                    } else {
                        cpx = curX; cpy = curY;
                    }
                    const ex = curX + args[i], ey = curY + args[i + 1];
                    lastCpX = cpx; lastCpY = cpy;
                    currentCmds.push({ type: 'Q', args: [cpx, cpy, ex, ey] });
                    sampleQuadratic(vertices, curX, curY, cpx, cpy, ex, ey);
                    curX = ex; curY = ey;
                }
                break;
            }
            case 'Z':
            case 'z': {
                curX = startX;
                curY = startY;
                currentCmds.push({ type: 'Z', args: [] });
                // Z 结束当前子路径
                flushSubPath();
                break;
            }
            default:
                break;
        }
        lastCmd = type;
    }

    // 未闭合的子路径也 flush
    flushSubPath();

    return subPaths;
}

/**
 * 对三次贝塞尔曲线采样几个点加入顶点列表（用于面积近似计算）
 */
function sampleCubic(
    vertices: Array<{ x: number; y: number }>,
    x0: number, y0: number,
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    x3: number, y3: number,
) {
    const steps = 8;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * x0 + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * x3;
        const y = mt * mt * mt * y0 + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * y3;
        vertices.push({ x, y });
    }
}

/**
 * 对二次贝塞尔曲线采样几个点加入顶点列表
 */
function sampleQuadratic(
    vertices: Array<{ x: number; y: number }>,
    x0: number, y0: number,
    cpx: number, cpy: number,
    x2: number, y2: number,
) {
    const steps = 8;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const x = mt * mt * x0 + 2 * mt * t * cpx + t * t * x2;
        const y = mt * mt * y0 + 2 * mt * t * cpy + t * t * y2;
        vertices.push({ x, y });
    }
}

/**
 * 计算多边形的有符号面积（Shoelace formula）
 * 正值 = 顺时针，负值 = 逆时针
 */
function computeSignedArea(vertices: Array<{ x: number; y: number }>): number {
    let area = 0;
    const n = vertices.length;
    if (n < 3) return 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    return area / 2;
}

/**
 * 将已解析的绝对坐标命令绘制到 Graphics 上
 */
function drawAbsoluteCommands(g: Graphics, commands: PathCommand[], offsetX: number, offsetY: number): void {
    for (const cmd of commands) {
        const { type, args } = cmd;
        switch (type) {
            case 'M':
                g.moveTo(offsetX + args[0], offsetY + args[1]);
                break;
            case 'L':
                g.lineTo(offsetX + args[0], offsetY + args[1]);
                break;
            case 'C':
                g.bezierCurveTo(
                    offsetX + args[0], offsetY + args[1],
                    offsetX + args[2], offsetY + args[3],
                    offsetX + args[4], offsetY + args[5],
                );
                break;
            case 'Q':
                g.quadraticCurveTo(
                    offsetX + args[0], offsetY + args[1],
                    offsetX + args[2], offsetY + args[3],
                );
                break;
            case 'Z':
                g.closePath();
                break;
        }
    }
}

/**
 * 点是否在多边形内部（Ray casting 算法）
 */
function pointInPolygon(
    px: number,
    py: number,
    vertices: Array<{ x: number; y: number }>,
): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * 绘制一个 glyph 的 SVG path，正确处理镂空（如字母 O、e、a 以及复杂中文字符等）
 * 
 * 核心策略：每个外轮廓及其包含的镂空在独立的 beginFill/endFill 块中绘制，
 * 避免 Pixi.js 在同一个 fill 上下文中处理多个不相连闭合路径时的错误填充。
 * 
 * @param g Pixi.Graphics 对象
 * @param pathData SVG path data 字符串
 * @param offsetX 绘制偏移 X
 * @param offsetY 绘制偏移 Y
 * @param fillColor 填充颜色
 * @param fillAlpha 填充透明度
 */
export function drawGlyphPath(
    g: Graphics,
    pathData: string,
    offsetX: number,
    offsetY: number,
    fillColor: number,
    fillAlpha: number,
): void {
    if (!pathData) return;

    const commands = parseSVGPath(pathData);
    const subPaths = splitIntoSubPaths(commands);

    if (subPaths.length === 0) return;

    // 只有一个子路径时，直接绘制
    if (subPaths.length === 1) {
        g.beginFill(fillColor, fillAlpha);
        drawAbsoluteCommands(g, subPaths[0].commands, offsetX, offsetY);
        g.endFill();
        return;
    }

    // 找到面积最大的子路径作为外轮廓的参考方向
    let maxAbsArea = 0;
    let outerSign = 1;
    for (const sp of subPaths) {
        const absArea = Math.abs(sp.signedArea);
        if (absArea > maxAbsArea) {
            maxAbsArea = absArea;
            outerSign = sp.signedArea >= 0 ? 1 : -1;
        }
    }

    // 分离外轮廓和内轮廓（镂空）
    const outerPaths: SubPath[] = [];
    const holePaths: SubPath[] = [];
    for (const sp of subPaths) {
        if (Math.abs(sp.signedArea) < 0.001) {
            continue;
        }
        const sign = sp.signedArea >= 0 ? 1 : -1;
        if (sign === outerSign) {
            outerPaths.push(sp);
        } else {
            holePaths.push(sp);
        }
    }

    // 按面积从小到大排序外轮廓，用于将 hole 分配给直接包含它的最小外轮廓
    const sortedOuters = outerPaths.slice().sort(
        (a, b) => Math.abs(a.signedArea) - Math.abs(b.signedArea)
    );

    // 为每个外轮廓建立 hole 列表
    const holeMap = new Map<SubPath, SubPath[]>();
    for (const outer of outerPaths) {
        holeMap.set(outer, []);
    }

    // 将每个 hole 分配给直接包含它的最小外轮廓（避免嵌套结构中 hole 被多个外轮廓共享）
    // 使用多个测试点提高判断准确性，避免近似多边形边界误判导致 hole 未被分配
    for (const hole of holePaths) {
        if (hole.vertices.length === 0) continue;
        let assigned = false;
        const testCount = Math.min(hole.vertices.length, 5);
        const step = Math.max(1, Math.floor(hole.vertices.length / testCount));
        for (const outer of sortedOuters) {
            for (let ti = 0; ti < hole.vertices.length; ti += step) {
                if (pointInPolygon(hole.vertices[ti].x, hole.vertices[ti].y, outer.vertices)) {
                    holeMap.get(outer)!.push(hole);
                    assigned = true;
                    break;
                }
            }
            if (assigned) break;
        }
    }

    // 对每个外轮廓，独立执行 beginFill/endFill
    for (const outer of outerPaths) {
        g.beginFill(fillColor, fillAlpha);
        drawAbsoluteCommands(g, outer.commands, offsetX, offsetY);

        const myHoles = holeMap.get(outer)!;
        if (myHoles.length > 0) {
            g.beginHole();
            for (const hole of myHoles) {
                drawAbsoluteCommands(g, hole.commands, offsetX, offsetY);
            }
            g.endHole();
        }

        g.endFill();
    }
}

/**
 * 旧版兼容：将 SVG path data 直接绘制到 Graphics（不处理镂空）
 * @deprecated 请使用 drawGlyphPath 代替
 */
export function drawSVGPath(
    g: Graphics,
    pathData: string,
    offsetX: number,
    offsetY: number,
): void {
    if (!pathData) return;
    const commands = parseSVGPath(pathData);
    const subPaths = splitIntoSubPaths(commands);
    for (const sp of subPaths) {
        drawAbsoluteCommands(g, sp.commands, offsetX, offsetY);
    }
}
