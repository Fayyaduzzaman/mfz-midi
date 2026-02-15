import { expect, test } from '@playwright/test';

test('piano roll can add notes and schedule playback', async ({ page }) => {
  await page.goto('/editor/piano-roll');

  await page.getByTestId('cell-0-0').click();
  await page.getByTestId('cell-0-1').click();
  await page.getByTestId('cell-0-2').click();

  await page.getByTestId('play-button').click();

  await page.waitForTimeout(800);

  const scheduleCount = await page.evaluate(() => {
    const globalWindow = window as Window & { __MFZ_LAST_SCHEDULE_COUNT?: number };
    return globalWindow.__MFZ_LAST_SCHEDULE_COUNT ?? 0;
  });

  expect(scheduleCount).toBeGreaterThanOrEqual(3);
});
