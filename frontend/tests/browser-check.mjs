import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const screenshotDirectory = fileURLToPath(new URL('../../ui/login/crimson-hour/screenshots/', import.meta.url));
await mkdir(screenshotDirectory, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let mode = 'credentials';
let requests = 0;
await page.route('**/api/auth/erp-login', async route => {
  requests++;
  assert.deepEqual(route.request().postDataJSON(), { username: 'test-student', password: 'test-password' });
  await new Promise(resolve => setTimeout(resolve, 180));
  const status = mode === 'success' ? 200 : mode === 'service' ? 503 : 401;
  const body = mode === 'success'
    ? { token: 'test-only-token', user: { id: 'test-1', name: 'Test Student', department: 'Computer Science', roll_number: 'TEST01', erp_verified: true } }
    : { error: 'Test response' };
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
});

try {
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  assert.equal(await page.title(), 'Akatsuki — Find your people.');
  assert.equal(await page.locator('canvas').count(), 1);
  assert.ok(await page.locator('.scene-art').evaluate(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${screenshotDirectory}/desktop.png`, fullPage: true });

  await page.getByRole('button', { name: 'A different kind of network' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), false);
  await page.getByRole('button', { name: 'Need a hand?' }).click();
  assert.equal(await page.getByRole('link', { name: 'Open the college ERP' }).getAttribute('href'), 'https://erp.mit.asia');
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByLabel('ERP username', { exact: true }).fill(' test-student ');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Enter the collective' }).click();
  assert.equal(await page.getByRole('button', { name: 'Connecting to your campus…' }).isDisabled(), true);
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /details didn’t work/);
  assert.equal(await page.getByLabel('ERP username', { exact: true }).inputValue(), ' test-student ');
  assert.equal(requests, 1);

  mode = 'service';
  await page.getByRole('button', { name: 'Enter the collective' }).click();
  await page.getByText('The campus sign-in service is unavailable right now. Please try again shortly.').waitFor();
  mode = 'success';
  await page.getByRole('button', { name: 'Enter the collective' }).click();
  await page.getByRole('heading', { name: /You’re in/ }).waitFor();
  assert.equal(await page.locator('.identity-summary strong').innerText(), 'Test Student');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
  await page.getByLabel('ERP username', { exact: true }).fill('');
  console.log('PASS: ERP request, password controls, pending, credentials/service errors, success, memory-only session, dialogs.');

  await page.getByRole('button', { name: 'Pause ambient animation' }).click();
  assert.equal(await page.getByRole('button', { name: 'Play ambient animation' }).getAttribute('aria-pressed'), 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.motion-off').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${screenshotDirectory}/mobile.png`, fullPage: true });
  for (const width of [390, 320, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile screenshots, four responsive widths, reduced motion, no runtime exceptions.');
} finally {
  await browser.close();
}
