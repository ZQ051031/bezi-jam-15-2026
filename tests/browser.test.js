import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright-core';

test('browser: menu, blueprint edits, hazard and successful extraction with zero errors', { timeout: 30000 }, async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'google-chrome',
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
    const errors = [];
    const failed = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) failed.push(response.status() + ' ' + response.url());
    });
    const shots = process.env.SHOTS_DIR;
    if (shots) await mkdir(shots, { recursive: true });
    const shot = name => shots && page.screenshot({ path: join(shots, 'vectorwright-' + name + '.png'), fullPage: true });
    const button = name => page.getByRole('button', { name, exact: true });
    const heading = name => page.getByRole('heading', { name, exact: true });
    const checkText = async (selector, value) => {
      await page.waitForFunction(([sel, text]) => document.querySelector(sel).textContent === text, [selector, value]);
    };

    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
    assert.equal(await page.locator('.level-card').count(), 6);
    await shot('menu');
    await button('Begin testing').click();
    await heading('First Contact').waitFor();
    await button('Run circuit').click();
    await page.keyboard.down('ArrowRight');
    await heading('Courier offline.').waitFor({ timeout: 5000 });
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('KeyR');
    assert.equal(await page.locator('#result').isHidden(), true);
    await page.keyboard.press('Escape');
    await button('Place Hold switch').dragTo(page.locator('#board'));
    await button('Hold switch output').waitFor();
    await button('Place Gravity coil').click();
    await button('Hold switch output').click();
    await button('Gravity coil drive input').click();
    assert.equal(await page.locator('.wire').count(), 1);
    await button('Gravity coil drive input').click();
    assert.equal(await page.locator('.wire').count(), 0);
    await button('Hold switch output').dragTo(button('Gravity coil drive input'));
    assert.equal(await page.locator('.wire').count(), 1);
    await shot('blueprint');

    await button('Run circuit').click();
    await page.keyboard.down('KeyF');
    await page.keyboard.down('ArrowRight');
    await checkText('#gravity', '↑ INVERTED');
    await page.waitForTimeout(690);
    assert.equal(await page.locator('.wire.live').count(), 1);
    await shot('gameplay');
    await heading('Chamber cleared.').waitFor({ timeout: 8000 });
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('KeyF');
    await shot('win');
    await button('Next chamber →').click();
    await heading('Memory Cell').waitFor();
    await button('← Chambers').click();
    await checkText('#progress', '1 / 6 CLEARED');
    await page.reload();
    await checkText('#progress', '1 / 6 CLEARED');
    await page.locator('.level-card').filter({ hasText: 'The Double Inversion' }).click();
    await heading('The Double Inversion').waitFor();
    assert.deepEqual(failed, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
