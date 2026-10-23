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

async function canvasPixel(page: Page, x: number, y: number): Promise<string> {
  return page.locator('canvas').evaluate(
    (element, position) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) return 'no-context';
      const data = context.getImageData(
        Math.floor(canvas.width * position.x),
        Math.floor(canvas.height * position.y),
        1,
        1,
      ).data;
      return `${data[0]},${data[1]},${data[2]}`;
    },
    { x, y },
  );
}

/** Let entry and scroll-reveal animations finish before taking a landing screenshot. */
async function settleLanding(page: Page): Promise<void> {
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
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

      // Rule presets apply a coherent bundle of settings in one click.
      await page.getByRole('button', { name: /Quick 2 rounds/ }).click();
      await expect(page.locator('select').nth(1)).toHaveValue('2');
      await expect(page.locator('select').nth(2)).toHaveValue('45');

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
          const pixelBeforeFill = await canvasPixel(guesser, 0.85, 0.85);
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
          await expect
            .poll(async () => canvasPixel(guesser, 0.85, 0.85), { timeout: 10_000 })
            .not.toBe(pixelBeforeFill);
          const pixelAfterFill = await canvasPixel(guesser, 0.85, 0.85);

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
            .poll(async () => canvasPixel(guesser, 0.85, 0.85), { timeout: 15_000 })
            .toBe(pixelAfterFill);

          // Undo restores the flattened pre-fill canvas, even after a refresh.
          const undo = artist.getByRole('button', { name: 'Undo last action' });
          await expect(undo).toBeEnabled({ timeout: 10_000 });
          await undo.click();
          await expect
            .poll(async () => canvasPixel(guesser, 0.85, 0.85), { timeout: 10_000 })
            .toBe(pixelBeforeFill);
          await artist.screenshot({ path: 'screenshots/fill-undo.png', fullPage: true });
        } else {
          // The recap uses the last turn, so leave a real drawing there too.
          const box = await artist.getByLabel('Drawing canvas').boundingBox();
          if (!box) throw new Error('Canvas has no bounding box');
          await artist.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.45);
          await artist.mouse.down();
          for (let step = 1; step <= 10; step++) {
            await artist.mouse.move(
              box.x + box.width * (0.3 + step * 0.04),
              box.y + box.height * (0.45 + Math.sin(step / 2) * 0.12),
            );
          }
          await artist.mouse.up();
          await artist.waitForTimeout(500);
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
          await expect(artist.getByTestId('round-replay')).toBeVisible();
          await expect(artist.getByTestId('round-replay').getByRole('img')).toBeVisible();
          await artist.waitForTimeout(1_600);
          await artist.screenshot({ path: 'screenshots/round-end.png', fullPage: true });
          await page.screenshot({ path: 'screenshots/round-end-host.png', fullPage: true });
        }
      }

      await expect(page.getByText('Final scores')).toBeVisible({ timeout: 30_000 });
      await expect(guest.getByText('Final scores')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/wins!/)).toBeVisible();
      await expect(page.getByText(/Winner charms:/)).toBeVisible();
      await page.screenshot({ path: 'screenshots/game-end.png', fullPage: true });

      // The recap card is painted locally from the final replay frame.
      await page.getByRole('button', { name: /Recap card/ }).click();
      await expect(page.getByRole('heading', { name: 'Your recap' })).toBeVisible();
      await expect(page.getByRole('img', { name: 'SketchRush game recap card' })).toBeVisible({
        timeout: 20_000,
      });
      const recapHasInk = await page.evaluate(async () => {
        const recap = document.querySelector<HTMLImageElement>('img[alt="SketchRush game recap card"]');
        if (!recap) return false;
        await recap.decode();
        const canvas = document.createElement('canvas');
        canvas.width = recap.naturalWidth;
        canvas.height = recap.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return false;
        context.drawImage(recap, 0, 0);
        const { data } = context.getImageData(240, 494, 600, 450);
        for (let index = 0; index < data.length; index += 4) {
          if (Math.min(data[index], data[index + 1], data[index + 2]) < 120) return true;
        }
        return false;
      });
      expect(recapHasInk).toBe(true);
      await page.screenshot({ path: 'screenshots/recap-card.png', fullPage: true });
      await page.getByRole('button', { name: 'Close dialog' }).click();
      await expect(page.getByRole('heading', { name: 'Your recap' })).not.toBeVisible();

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

  test('promotes a mid-game spectator at the next round', async ({ page, browser }) => {
    test.setTimeout(150_000);
    await page.goto('/');
    await page.getByLabel('Your nickname').fill('SpecHost');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4,8}$/, { timeout: 20_000 });
    const code = new URL(page.url()).pathname.split('/').pop() ?? '';
    const origin = new URL(page.url()).origin;

    const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const watcherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const guest = await guestContext.newPage();
    const watcher = await watcherContext.newPage();

    try {
      await guest.goto(`${origin}/room/${code}`);
      await guest.getByLabel('Your nickname').fill('SpecGuest');
      const join = guest.getByRole('button', { name: /Join room/ });
      await expect(join).toBeEnabled({ timeout: 15_000 });
      await join.click();
      await expect(page.getByText('SpecGuest', { exact: true })).toBeVisible({ timeout: 20_000 });

      const selects = page.locator('select');
      await selects.nth(1).selectOption('2');
      await selects.nth(2).selectOption('30');
      await expect(guest.getByText('30s').first()).toBeVisible({ timeout: 15_000 });

      await page.locator('button:visible').filter({ hasText: 'Start game' }).first().click();

      const roundPlayers = [page, guest];
      const firstArtist = await waitForWordChooser(roundPlayers);
      const firstGuesser = firstArtist === page ? guest : page;
      const firstChooser = firstArtist.getByRole('dialog');
      const firstWord = (await firstChooser.locator('button p').first().textContent())?.trim() ?? '';
      await firstChooser.getByRole('button').first().click();
      await expect(firstArtist.getByRole('button', { name: 'Pen', exact: true })).toBeVisible({
        timeout: 15_000,
      });

      // Join after the game has started; late arrivals are seated as spectators.
      await watcher.goto(`${origin}/room/${code}`);
      await watcher.getByLabel('Your nickname').fill('SpecWatch');
      const watchJoin = watcher.getByRole('button', { name: /Join room/ });
      await expect(watchJoin).toBeEnabled({ timeout: 15_000 });
      await watchJoin.click();
      await expect(watcher.getByText(/Watch the drawing.*join the next round/i)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(/SpecWatch joined as a spectator/)).toBeVisible({ timeout: 10_000 });

      await firstGuesser.getByPlaceholder(/Type your guess/).fill(firstWord);
      await firstGuesser.getByPlaceholder(/Type your guess/).press('Enter');
      await expect(firstArtist.getByText('Turn complete. The word was')).toBeVisible({ timeout: 20_000 });

      // Finish the second turn of round 1 so round 2 can promote the spectator.
      const secondArtist = await waitForWordChooser(roundPlayers);
      const secondGuesser = secondArtist === page ? guest : page;
      const secondChooser = secondArtist.getByRole('dialog');
      const secondWord = (await secondChooser.locator('button p').first().textContent())?.trim() ?? '';
      await secondChooser.getByRole('button').first().click();
      await expect(secondArtist.getByRole('button', { name: 'Pen', exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await secondGuesser.getByPlaceholder(/Type your guess/).fill(secondWord);
      await secondGuesser.getByPlaceholder(/Type your guess/).press('Enter');
      await expect(secondArtist.getByText('Turn complete. The word was')).toBeVisible({ timeout: 20_000 });

      // Round 2 starts; the watcher should now be in the turn order.
      await expect(page.getByText(/SpecWatch joined the game for round 2/)).toBeVisible({ timeout: 30_000 });
      await expect(watcher.getByText(/joined the game for round 2/)).toBeVisible({ timeout: 10_000 });
      await expect(watcher.getByText(/you'll join the next round/i)).not.toBeVisible({ timeout: 15_000 });
      const nextArtist = await waitForWordChooser([page, guest, watcher]);
      await expect(nextArtist.getByRole('dialog').getByText('Pick your word')).toBeVisible();
      await watcher.screenshot({ path: 'screenshots/spectator-promoted.png', fullPage: true });
    } finally {
      await guestContext.close();
      await watcherContext.close();
    }
  });

  test('remembers recent rooms for one-tap rejoin', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'sketchrush:recent-rooms',
        JSON.stringify([{ code: 'ABC123', nickname: 'Recent', at: Date.now() - 5 * 60 * 1000 }]),
      );
    });

    await page.goto('/');
    await expect(page.getByText('Jump back in')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Played as Recent')).toBeVisible();
    await expect(page.getByText('ABC123', { exact: true })).toBeVisible();
    await settleLanding(page);
    await page.screenshot({ path: 'screenshots/landing-recent.png', fullPage: true });

    await page.getByRole('button', { name: /Played as Recent/ }).click();
    await expect(page).toHaveURL(/\/room\/ABC123$/);
  });
});

test.describe('SketchRush mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile layout checks run on the mobile project.');

  test('landing and room fit a phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Draw badly');
    await expect(page.getByLabel('Your nickname')).toBeVisible();
    await settleLanding(page);
    await page.screenshot({ path: 'screenshots/landing-mobile.png', fullPage: true });

    await page.getByText('From zero to chaos in 30 seconds.').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Create a room' })).toBeVisible();
    await page.waitForTimeout(700);
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
