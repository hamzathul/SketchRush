import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

describe('web app manifest', () => {
  const app = manifest();
  const icons = app.icons ?? [];

  it('is installable and launches standalone at the root', () => {
    expect(app.id).toBe('/');
    expect(app.start_url).toBe('/');
    expect(app.scope).toBe('/');
    expect(app.display).toBe('standalone');
    expect(app.theme_color).toBe('#070910');
    expect(app.background_color).toBe('#070910');
  });

  it('ships normal and maskable icons at install sizes', () => {
    for (const size of ['192x192', '512x512']) {
      expect(icons.some((icon) => icon.sizes === size && icon.purpose === 'any')).toBe(true);
      expect(icons.some((icon) => icon.sizes === size && icon.purpose === 'maskable')).toBe(true);
    }
    expect(icons.every((icon) => icon.type === 'image/png')).toBe(true);
  });

  it('includes launch shortcuts for play and rules', () => {
    expect(app.shortcuts?.map((shortcut) => shortcut.url)).toEqual(['/#play', '/#how-it-works']);
  });
});
