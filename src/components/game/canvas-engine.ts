import { getStroke } from 'perfect-freehand';
import type { Point, Stroke } from '@/lib/types';

const PAPER = '#fbfbf7';

interface CanvasData {
  baseImage: string | null;
  strokes: Stroke[];
  active: Stroke[];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Two-layer canvas renderer:
 *  - `base` holds the flattened PNG snapshot plus every finished stroke.
 *  - the visible canvas paints `base` then the in-progress strokes each frame.
 * This keeps 60fps while drawing and makes undo/late-join replays cheap.
 */
export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssWidth = 1;
  private cssHeight = 1;
  private baseImageUrl: string | null = null;
  private baseImage: HTMLImageElement | null = null;
  private strokes: Stroke[] = [];
  private active = new Map<string, Stroke>();
  private frame = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not supported');

    this.canvas = canvas;
    this.ctx = context;
    this.base = document.createElement('canvas');
    const baseContext = this.base.getContext('2d', { willReadFrequently: true });
    if (!baseContext) throw new Error('Canvas 2D is not supported');
    this.baseCtx = baseContext;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));

    if (this.cssWidth === nextWidth && this.cssHeight === nextHeight && this.dpr === dpr) return;

    this.cssWidth = nextWidth;
    this.cssHeight = nextHeight;
    this.dpr = dpr;

    this.canvas.width = Math.round(nextWidth * dpr);
    this.canvas.height = Math.round(nextHeight * dpr);
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rebuild();
  }

  sync(data: CanvasData): void {
    if (data.baseImage !== this.baseImageUrl) {
      this.setBaseImage(data.baseImage);
    }

    let needsRebuild = false;

    if (data.strokes.length < this.strokes.length) {
      this.strokes = data.strokes;
      needsRebuild = true;
    } else if (data.strokes.length > this.strokes.length) {
      if (this.samePrefix(data.strokes)) {
        const added = data.strokes.slice(this.strokes.length);
        this.strokes = data.strokes;
        for (const stroke of added) this.drawStroke(this.baseCtx, stroke);
      } else {
        this.strokes = data.strokes;
        needsRebuild = true;
      }
    } else if (!this.sameStrokes(data.strokes)) {
      this.strokes = data.strokes;
      needsRebuild = true;
    }

    const nextActive = new Map(data.active.map((stroke) => [stroke.id, stroke]));
    this.active = nextActive;

    if (needsRebuild) {
      this.rebuild();
    } else {
      this.requestRender();
    }
  }

  private samePrefix(next: Stroke[]): boolean {
    for (let index = 0; index < this.strokes.length; index++) {
      if (this.strokes[index] !== next[index]) return false;
    }
    return true;
  }

  private sameStrokes(next: Stroke[]): boolean {
    if (next.length !== this.strokes.length) return false;
    for (let index = 0; index < next.length; index++) {
      if (next[index] !== this.strokes[index]) return false;
    }
    return true;
  }

  private setBaseImage(url: string | null): void {
    this.baseImageUrl = url;
    if (!url) {
      this.baseImage = null;
      this.rebuild();
      return;
    }

    const image = new Image();
    image.onload = () => {
      if (this.destroyed || this.baseImageUrl !== url) return;
      this.baseImage = image;
      this.rebuild();
    };
    image.src = url;
  }

  private rebuild(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (!width || !height) return;

    this.baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.baseCtx.fillStyle = PAPER;
    this.baseCtx.fillRect(0, 0, width, height);
    this.baseCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.baseImage) {
      this.baseCtx.drawImage(this.baseImage, 0, 0, this.cssWidth, this.cssHeight);
    }
    for (const stroke of this.strokes) {
      this.drawStroke(this.baseCtx, stroke);
    }
    this.requestRender();
  }

  private requestRender(): void {
    if (this.frame || this.destroyed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  private render(): void {
    const canvas = this.canvas;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(this.base, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (const stroke of this.active.values()) {
      this.drawStroke(this.ctx, stroke);
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const points = stroke.points;
    if (!points.length) return;

    const scaleX = this.cssWidth;
    const scaleY = this.cssHeight;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.tool === 'highlighter' ? Math.min(1, stroke.opacity * 0.55) : stroke.opacity;

    if (stroke.tool === 'pen') {
      const outline = getStroke(
        points.map((point) => ({
          x: point.x * scaleX,
          y: point.y * scaleY,
          pressure: point.p ?? 0.5,
        })),
        {
          size: Math.max(1.5, stroke.size),
          thinning: 0.55,
          smoothing: 0.55,
          streamline: 0.5,
          simulatePressure: false,
          last: true,
        },
      );

      if (outline.length) {
        ctx.beginPath();
        ctx.moveTo(outline[0][0], outline[0][1]);
        for (let index = 1; index < outline.length; index++) {
          const [x, y] = outline[index];
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    const lineWidth =
      stroke.tool === 'highlighter' ? stroke.size * 2.4 : stroke.tool === 'eraser' ? stroke.size * 1.8 : stroke.size;
    ctx.strokeStyle = stroke.tool === 'eraser' ? PAPER : stroke.color;
    ctx.lineWidth = Math.max(2, lineWidth);

    const mapped = points.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY }));

    if (mapped.length === 1) {
      ctx.beginPath();
      ctx.arc(mapped[0].x, mapped[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(mapped[0].x, mapped[0].y);
    for (let index = 1; index < mapped.length - 1; index++) {
      const current = mapped[index];
      const next = mapped[index + 1];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = mapped[mapped.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Flood fills the flattened layer and returns the resulting PNG snapshot.
   * The server clears its stroke log when it receives this snapshot, so fill
   * effectively flattens history (that is intentional and keeps every client
   * in sync after a bucket fill).
   */
  floodFill(normalizedX: number, normalizedY: number, color: string, tolerance = 36): string | null {
    const width = this.base.width;
    const height = this.base.height;
    if (!width || !height) return null;

    const x = Math.min(width - 1, Math.max(0, Math.floor(normalizedX * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(normalizedY * height)));

    const imageData = this.baseCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const startIndex = (y * width + x) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    const [fillR, fillG, fillB] = hexToRgb(color);
    if (
      Math.abs(targetR - fillR) < 4 &&
      Math.abs(targetG - fillG) < 4 &&
      Math.abs(targetB - fillB) < 4 &&
      targetA === 255
    ) {
      return null;
    }

    const visited = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    let top = 0;
    stack[top++] = y * width + x;

    const matches = (index: number): boolean => {
      const offset = index * 4;
      return (
        Math.abs(data[offset] - targetR) <= tolerance &&
        Math.abs(data[offset + 1] - targetG) <= tolerance &&
        Math.abs(data[offset + 2] - targetB) <= tolerance &&
        Math.abs(data[offset + 3] - targetA) <= tolerance
      );
    };

    while (top > 0) {
      const index = stack[--top];
      if (visited[index]) continue;
      visited[index] = 1;
      if (!matches(index)) continue;

      const offset = index * 4;
      data[offset] = fillR;
      data[offset + 1] = fillG;
      data[offset + 2] = fillB;
      data[offset + 3] = 255;

      const px = index % width;
      const py = (index / width) | 0;
      if (px > 0) stack[top++] = index - 1;
      if (px < width - 1) stack[top++] = index + 1;
      if (py > 0) stack[top++] = index - width;
      if (py < height - 1) stack[top++] = index + width;
    }

    this.baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.baseCtx.putImageData(imageData, 0, 0);
    this.baseCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const dataUrl = this.base.toDataURL('image/png');
    this.strokes = [];
    this.active.clear();
    this.baseImageUrl = dataUrl;
    const image = new Image();
    image.onload = () => {
      if (!this.destroyed && this.baseImageUrl === dataUrl) this.baseImage = image;
    };
    image.src = dataUrl;

    this.requestRender();
    return dataUrl;
  }

  toDataURL(): string {
    return this.base.toDataURL('image/png');
  }

  /**
   * A small JPEG frame for the end-of-round flipbook. It includes the active
   * strokes so the final replay frame matches what everyone just saw.
   */
  toReplayFrame(maxWidth = 480): string | null {
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (!width || !height || this.cssWidth <= 0 || this.cssHeight <= 0) return null;

    const targetWidth = Math.max(1, Math.min(maxWidth, width));
    const targetHeight = Math.max(1, Math.round((height / width) * targetWidth));
    const frame = document.createElement('canvas');
    frame.width = targetWidth;
    frame.height = targetHeight;
    const context = frame.getContext('2d');
    if (!context) return null;

    context.drawImage(this.base, 0, 0, targetWidth, targetHeight);

    if (this.active.size > 0) {
      context.setTransform(
        targetWidth / this.cssWidth,
        0,
        0,
        targetHeight / this.cssHeight,
        0,
        0,
      );
      for (const stroke of this.active.values()) this.drawStroke(context, stroke);
    }

    return frame.toDataURL('image/jpeg', 0.62);
  }
}
