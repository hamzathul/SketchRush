import { devices, expect, test, type Page } from '@playwright/test';

async function waitForWordChooser(pages: Page[]): Promise<Page> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const dialog = page.getByRole('dialog');
      const visible = await dialog
        .getByText('Pick your word')
        .isVisible()
        .catch(() => false);
      if (visible) return page;
    }
    await pages[0].waitForTimeout(200);
  }
  throw new Error('No word chooser appeared in time');
}

test.describe('SketchRush game flow', () => {
  test.skip(({ isMobile }) => isMobile, 'The full multiplayer flow runs on the desktop project.');

  test('create, join, draw, guess, finish and rematch', async ({ page, browser }) => {
    test.setTimeout(180_000);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Draw badly');

    await page.getByLabel('Your nickname').fill('Hosty');

    await page.getByRole('button', { name: 'Change avatar' }).click();
    await expect(page.getByRole('heading', { name: 'Pick your avatar' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/avatar-picker.png', fullPage: true });
    await page.getByRole('button', { name: 'Use avatar 🦊' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Pick your avatar' })).not.toBeVisible();

    const createButton = page.locator('form button[type="submit"]');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4,8}$/, { timeout: 20_000 });

    const code = new URL(page.url()).pathname.split('/').pop() ?? '';
    expect(code).toHaveLength(6);

    const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const guest = await guestContext.newPage();
    try {
      await guest.goto(`/room/${code}`);
      await expect(guest.getByLabel('Your nickname')).toBeVisible({ timeout: 20_000 });
      await guest.getByLabel('Your nickname').fill('Guesty');
      const joinButton = guest.getByRole('button', { name: /Join room/ });
      await expect(joinButton).toBeEnabled();
      await joinButton.click();

      await expect(page.getByText('Game settings')).toBeVisible({ timeout: 20_000 });
      await expect(guest.getByText('Game settings')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Guesty', { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Hosty is back.')).toHaveCount(0);

      const lobbyInput = page.getByPlaceholder('Message the room…');
      await lobbyInput.fill('good luck, have fun');
      await lobbyInput.press('Enter');
      await expect(guest.getByText('good luck, have fun')).toBeVisible({ timeout: 10_000 });

      // Chat lives in the big left column of the lobby.
      const chatBox = await page.getByText('Chat & guesses').first().boundingBox();
      const playersBox = await page.getByText('Players', { exact: true }).first().boundingBox();
      expect(chatBox?.x ?? 0).toBeLessThan(playersBox?.x ?? 0);

      // Settings selects have a solid dark surface so their options stay readable.
      const selectSurface = await page.locator('select').first().evaluate((element) => {
        const style = getComputedStyle(element);
        const option = element.querySelector('option');
        return {
          background: style.backgroundColor,
          chevron: style.backgroundImage,
          optionColor: option ? getComputedStyle(option).color : '',
        };
      });
      expect(selectSurface.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(selectSurface.chevron).toContain('svg');
      expect(selectSurface.optionColor).not.toBe('rgba(0, 0, 0, 0)');

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.screenshot({ path: 'screenshots/lobby-desktop.png', fullPage: true });

      // Lobby reactions are live: they float over the room for everyone.
      await guest.getByRole('button', { name: 'React with 🔥' }).first().click();
      await expect(
        page.getByTestId('reaction-bubble').filter({ hasText: '🔥' }).first(),
      ).toBeVisible();

      // One-tap banter is chatter only — never a guess, never a streak breaker.
      await guest.getByTestId('quick-chat-row').getByRole('button', { name: 'gg 🎉' }).click();
      await expect(page.getByTestId('chat-list').getByText('gg 🎉')).toBeVisible({ timeout: 10_000 });

      // Fast game for CI: one round, 30 seconds per turn.
      const selects = page.locator('select');
      await selects.nth(1).selectOption('1');
      await selects.nth(2).selectOption('30');
      await expect(guest.getByText('30s').first()).toBeVisible({ timeout: 15_000 });

      await page
        .locator('button:visible')
        .filter({ hasText: 'Start game' })
        .first()
        .click();

      const players: Page[] = [page, guest];
      let previousArtist: Page | null = null;

      // One round means every player draws once: two turns here.
      for (let turn = 0; turn < 2; turn++) {
        const artist = await waitForWordChooser(players);
        if (previousArtist) expect(artist).not.toBe(previousArtist);
        previousArtist = artist;
        const guesser = artist === page ? guest : page;

        const chooser = artist.getByRole('dialog');
        const word = (await chooser.locator('button p').first().textContent())?.trim() ?? '';
        expect(word.length).toBeGreaterThan(0);
        await chooser.getByRole('button').first().click();
        await expect(chooser).not.toBeVisible({ timeout: 10_000 });

        await expect(artist.getByRole('button', { name: 'Pen', exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(guesser.locator('canvas')).toBeVisible();

        if (turn === 0) {
          const normalCanvas = await artist.locator('canvas').boundingBox();
          expect(normalCanvas).not.toBeNull();

          // Players are pinned to the left and the canvas fills its column.
          const railBox = await artist.locator('aside').first().boundingBox();
          const mainBox = await artist.locator('main').boundingBox();
          expect(railBox?.x ?? Number.MAX_SAFE_INTEGER).toBeLessThan(normalCanvas?.x ?? 0);
          expect(normalCanvas?.width ?? 0).toBeGreaterThan((mainBox?.width ?? 0) * 0.9);

          await artist.getByRole('button', { name: 'Focus on the canvas' }).click();
          await expect
            .poll(async () => (await artist.locator('canvas').boundingBox())?.width ?? 0, { timeout: 5_000 })
            .toBeGreaterThan(normalCanvas?.width ?? 0);
          await artist.screenshot({ path: 'screenshots/game-artist-focus.png', fullPage: true });
          await artist.keyboard.press('Escape');
          await expect(artist.getByRole('button', { name: 'Focus on the canvas' })).toBeVisible();

          // Floating reactions name the player who sent them.
          const guesserName = guesser === page ? 'Hosty' : 'Guesty';
          await guesser.getByRole('button', { name: 'React with ❤️' }).first().click();
          await expect(
            artist
              .getByTestId('reaction-bubble')
              .filter({ hasText: guesserName })
              .filter({ hasText: '❤️' })
              .first(),
          ).toBeVisible();
          await artist.screenshot({ path: 'screenshots/reactions.png', fullPage: true });

          const before = await guesser
            .locator('canvas')
            .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
          const box = await artist.locator('canvas').boundingBox();
          expect(box).not.toBeNull();
          if (!box) throw new Error('Canvas has no bounding box');

          await artist.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
          await artist.mouse.down();
          for (let step = 1; step <= 12; step++) {
            await artist.mouse.move(
              box.x + box.width * (0.25 + step * 0.035),
              box.y + box.height * (0.35 + Math.sin(step / 2) * 0.16),
            );
          }
          await artist.mouse.up();

          await expect
            .poll(
              async () =>
                guesser
                  .locator('canvas')
                  .evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
              { timeout: 10_000 },
            )
            .not.toBe(before);

          await artist.screenshot({ path: 'screenshots/game-artist.png', fullPage: true });
          await guesser.screenshot({ path: 'screenshots/game-guesser.png', fullPage: true });

          // Bucket fill is sent as a PNG snapshot rather than vector strokes.
          const beforeFill = await guesser
            .locator('canvas')
            .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
          await artist.getByRole('button', { name: 'Fill', exact: true }).click();
          await artist.getByRole('button', { name: 'Color #84cc16' }).click();
          await artist.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.85);
          await expect
            .poll(
              async () =>
                guesser
                  .locator('canvas')
                  .evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
              { timeout: 10_000 },
            )
            .not.toBe(beforeFill);

          await artist.getByRole('button', { name: 'Clear canvas' }).click();
          await expect(artist.getByRole('heading', { name: 'Clear the canvas?' })).toBeVisible();
          await artist.screenshot({ path: 'screenshots/clear-dialog.png', fullPage: true });
          await artist.getByRole('button', { name: 'Cancel' }).click();
          await expect(artist.getByRole('heading', { name: 'Clear the canvas?' })).not.toBeVisible();

          // A refresh restores the seat and the canvas from the server.
          await guesser.reload();
          await expect(guesser.locator('canvas')).toBeVisible({ timeout: 20_000 });
          await expect(guesser.getByPlaceholder(/Type your guess/)).toBeVisible({ timeout: 20_000 });
          await expect
            .poll(
              async () =>
                guesser.locator('canvas').evaluate((element) => {
                  const canvas = element as HTMLCanvasElement;
                  const context = canvas.getContext('2d');
                  if (!context) return 0;
                  return context.getImageData(
                    Math.floor(canvas.width * 0.85),
                    Math.floor(canvas.height * 0.85),
                    1,
                    1,
                  ).data[1];
                }),
              { timeout: 15_000 },
            )
            .toBeGreaterThan(150);
        }

        const guessInput = guesser.getByPlaceholder(/Type your guess/);
        // A one-letter-off guess becomes the round-end "so close" callout.
        const nearMiss = word.replace(/[^a-z0-9]/gi, '').length >= 4 ? `${word}x` : '';
        if (nearMiss) {
          await guessInput.fill(nearMiss);
          await guessInput.press('Enter');
        }

        const artistCountBefore = await artist.getByText(/guessed the word!/).count();
        const guesserCountBefore = await guesser.getByText(/guessed the word!/).count();
        await guessInput.fill(word);
        await guessInput.press('Enter');

        await expect
          .poll(() => guesser.getByText(/guessed the word!/).count(), { timeout: 10_000 })
          .toBeGreaterThan(guesserCountBefore);
        await expect
          .poll(() => artist.getByText(/guessed the word!/).count(), { timeout: 10_000 })
          .toBeGreaterThan(artistCountBefore);

        await expect(artist.getByText('Turn complete. The word was')).toBeVisible({ timeout: 20_000 });
        await expect(guesser.getByText('Turn complete. The word was')).toBeVisible({ timeout: 20_000 });
        await expect(artist.getByRole('heading', { name: word, exact: true })).toBeVisible();
        if (nearMiss) {
          await expect(artist.getByTestId('near-miss')).toContainText(nearMiss);
          await expect(guesser.getByTestId('near-miss')).toContainText(nearMiss);
        }
        if (turn === 0) {
          await artist.screenshot({ path: 'screenshots/round-end.png', fullPage: true });
        }
      }

      await expect(page.getByText('Final scores')).toBeVisible({ timeout: 30_000 });
      await expect(guest.getByText('Final scores')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/wins!/)).toBeVisible();
      await expect(page.getByText(/Winner charms:/)).toBeVisible();
      await page.screenshot({ path: 'screenshots/game-end.png', fullPage: true });

      const hostRematch = page.getByRole('button', { name: /Rematch/ });
      const guestRematch = guest.getByRole('button', { name: /Rematch/ });
      await hostRematch.click();
      await expect(page.getByText(/Waiting for others/)).toBeVisible({ timeout: 10_000 });
      await guestRematch.click();

      const nextArtist = await waitForWordChooser([page, guest]);
      await expect(nextArtist.getByRole('dialog').getByText('Pick your word')).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/rematch-chooser.png', fullPage: true });
    } finally {
      await guestContext.close();
    }
  });
});

test.describe('SketchRush mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile layout checks run on the mobile project.');

  test('landing and room fit a phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Draw badly');
    await expect(page.getByLabel('Your nickname')).toBeVisible();
    await page.screenshot({ path: 'screenshots/landing-mobile.png', fullPage: true });

    await page.getByText('From zero to chaos in 30 seconds.').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Create a room' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/landing-mobile-how.png', fullPage: true });

    await page.getByLabel('Your nickname').fill('Mobile');
    const createButton = page.locator('form button[type="submit"]');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4,8}$/, { timeout: 20_000 });
    await expect(page.getByText('Game settings')).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: 'screenshots/lobby-mobile.png', fullPage: true });
  });

  test('game canvas and chat drawer fit a phone', async ({ page, browser }) => {
    test.setTimeout(120_000);

    await page.goto('/');
    await page.getByLabel('Your nickname').fill('Mophost');
    const createButton = page.locator('form button[type="submit"]');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4,8}$/, { timeout: 20_000 });
    const code = new URL(page.url()).pathname.split('/').pop() ?? '';
    const origin = new URL(page.url()).origin;

    const guestContext = await browser.newContext({ ...devices['Pixel 7'] });
    const guest = await guestContext.newPage();
    try {
      await guest.goto(`${origin}/room/${code}`);
      await expect(guest.getByLabel('Your nickname')).toBeVisible({ timeout: 20_000 });
      await guest.getByLabel('Your nickname').fill('Moguest');
      const joinButton = guest.getByRole('button', { name: /Join room/ });
      await expect(joinButton).toBeEnabled();
      await joinButton.click();
      await expect(page.getByText('Game settings')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Moguest', { exact: true })).toBeVisible({ timeout: 20_000 });

      await page
        .locator('button:visible')
        .filter({ hasText: 'Start game' })
        .first()
        .click();

      const players: Page[] = [page, guest];
      const artist = await waitForWordChooser(players);
      const guesser = artist === page ? guest : page;
      const chooser = artist.getByRole('dialog');
      const word = (await chooser.locator('button p').first().textContent())?.trim() ?? '';
      expect(word.length).toBeGreaterThan(0);
      await chooser.getByRole('button').first().click();
      await expect(chooser).not.toBeVisible({ timeout: 10_000 });

      await expect(artist.locator('canvas')).toBeVisible({ timeout: 15_000 });
      await expect(artist.getByRole('button', { name: 'Pen', exact: true })).toBeVisible();
      await artist.screenshot({ path: 'screenshots/game-artist-mobile.png', fullPage: true });

      const chatButton = guesser.getByRole('button', { name: /Chat & guesses/ });
      await chatButton.click();
      const drawer = guesser.getByTestId('chat-drawer');
      const guessInput = drawer.getByPlaceholder(/Type your guess/);
      await expect(guessInput).toBeVisible({ timeout: 10_000 });
      await guesser.screenshot({ path: 'screenshots/game-guesser-mobile.png', fullPage: true });

      const before = await drawer.getByText(/guessed the word!/).count();
      await guessInput.fill(word);
      await guessInput.press('Enter');
      await expect
        .poll(() => drawer.getByText(/guessed the word!/).count(), { timeout: 15_000 })
        .toBeGreaterThan(before);

      await guesser.keyboard.press('Escape');
      await expect(guesser.getByText('Turn complete. The word was')).toBeVisible({ timeout: 20_000 });
      await guesser.screenshot({ path: 'screenshots/round-end-mobile.png', fullPage: true });
    } finally {
      await guestContext.close();
    }
  });
});
