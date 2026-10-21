import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:3000/');
await page.getByLabel('Your nickname').fill('GridCheck');
await page.locator('form button[type="submit"]').click();
await page.waitForURL('**/room/**', { timeout: 15000 });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const grid = document.querySelector('main > div.grid');
  if (!grid) return { error: 'grid not found' };
  const style = getComputedStyle(grid);
  const items = Array.from(grid.children).map((child) => {
    const box = child.getBoundingClientRect();
    const cs = getComputedStyle(child);
    return {
      tag: child.tagName,
      cls: (child.className || '').toString().slice(0, 140),
      x: Math.round(box.x),
      y: Math.round(box.y),
      w: Math.round(box.width),
      h: Math.round(box.height),
      order: cs.order,
      col: cs.gridColumnStart,
      row: cs.gridRowStart,
    };
  });
  return {
    columns: style.gridTemplateColumns,
    items,
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
