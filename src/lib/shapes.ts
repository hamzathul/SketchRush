import type { Point } from './types';

export type ShapeTool = 'line' | 'rect' | 'ellipse';

const SHAPE_TOOLS: readonly ShapeTool[] = ['line', 'rect', 'ellipse'];

export function isShapeTool(value: string): value is ShapeTool {
  return (SHAPE_TOOLS as readonly string[]).includes(value);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function point(x: number, y: number): Point {
  return {
    x: Math.round(clamp01(x) * 1e4) / 1e4,
    y: Math.round(clamp01(y) * 1e4) / 1e4,
    p: 0.5,
  };
}

function lerp(start: Point, end: Point, amount: number): Point {
  return point(start.x + (end.x - start.x) * amount, start.y + (end.y - start.y) * amount);
}

/**
 * Turns a drag into points for the existing freehand stroke pipeline.
 * Shapes are sampled instead of sent as two points so the pen brush,
 * pressure and undo behave exactly like a normal stroke.
 */
export function shapePoints(shape: ShapeTool, start: Point, end: Point): Point[] {
  if (shape === 'line') {
    const steps = 24;
    return Array.from({ length: steps + 1 }, (_, index) => lerp(start, end, index / steps));
  }

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  if (shape === 'rect') {
    const corners = [
      point(left, top),
      point(right, top),
      point(right, bottom),
      point(left, bottom),
    ];
    const points: Point[] = [];
    const segments = 9;
    for (let edge = 0; edge < corners.length; edge++) {
      const from = corners[edge];
      const to = corners[(edge + 1) % corners.length];
      for (let step = 0; step <= segments; step++) {
        // The next edge repeats the shared corner, which keeps it crisp under smoothing.
        points.push(lerp(from, to, step / segments));
      }
    }
    return points;
  }

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const radiusX = Math.max(0.0005, (right - left) / 2);
  const radiusY = Math.max(0.0005, (bottom - top) / 2);
  const steps = 64;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / steps) * Math.PI * 2;
    return point(centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY);
  });
}
