import { describe, expect, it } from 'vitest';
import { isShapeTool, shapePoints } from '@/lib/shapes';
import type { Point } from '@/lib/types';

const start: Point = { x: 0.2, y: 0.3, p: 0.5 };
const end: Point = { x: 0.8, y: 0.7, p: 0.5 };

describe('shapePoints', () => {
  it('recognizes only real shape tools', () => {
    expect(isShapeTool('line')).toBe(true);
    expect(isShapeTool('rect')).toBe(true);
    expect(isShapeTool('ellipse')).toBe(true);
    expect(isShapeTool('pen')).toBe(false);
    expect(isShapeTool('fill')).toBe(false);
  });

  it('samples a line from the drag start to the drag end', () => {
    const points = shapePoints('line', start, end);

    expect(points.length).toBe(25);
    expect(points[0]).toMatchObject({ x: 0.2, y: 0.3 });
    expect(points.at(-1)).toMatchObject({ x: 0.8, y: 0.7 });
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0.2);
      expect(point.x).toBeLessThanOrEqual(0.8);
      expect(point.y).toBeGreaterThanOrEqual(0.3);
      expect(point.y).toBeLessThanOrEqual(0.7);
    }
  });

  it('keeps a rectangle inside the drag bounds and includes every corner', () => {
    const points = shapePoints('rect', start, end);

    expect(points.length).toBeGreaterThan(4);
    expect(points.length).toBeLessThanOrEqual(150);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0.2);
      expect(point.x).toBeLessThanOrEqual(0.8);
      expect(point.y).toBeGreaterThanOrEqual(0.3);
      expect(point.y).toBeLessThanOrEqual(0.7);
    }
    expect(points.some((point) => point.x === 0.2 && point.y === 0.3)).toBe(true);
    expect(points.some((point) => point.x === 0.8 && point.y === 0.3)).toBe(true);
    expect(points.some((point) => point.x === 0.8 && point.y === 0.7)).toBe(true);
    expect(points.some((point) => point.x === 0.2 && point.y === 0.7)).toBe(true);
  });

  it('draws a closed ellipse inside the drag bounds', () => {
    const points = shapePoints('ellipse', start, end);

    expect(points.length).toBe(65);
    expect(points.length).toBeLessThanOrEqual(150);
    expect(points[0]).toEqual(points.at(-1));
    for (const point of points) {
      const normalized =
        ((point.x - 0.5) / 0.3) ** 2 + ((point.y - 0.5) / 0.2) ** 2;
      expect(normalized).toBeLessThanOrEqual(1.001);
    }
  });

  it('clamps off-canvas drags and survives a zero-size shape', () => {
    const outside = shapePoints('rect', { x: -1, y: -1, p: 0.5 }, { x: 2, y: 2, p: 0.5 });
    for (const point of outside) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }

    const dot = shapePoints('ellipse', { x: 0.5, y: 0.5, p: 0.5 }, { x: 0.5, y: 0.5, p: 0.5 });
    expect(dot.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });
});
