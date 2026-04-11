import { expect, test, type Page } from '@playwright/test';

async function dismissOrientationIfVisible(page: Page) {
  const dismissButton = page.getByRole('button', { name: 'Dismiss' });
  if (await dismissButton.isVisible()) {
    await dismissButton.click();
  }
}

test('loads the seeded inbox and shows the top-ranked opportunity', async ({ page }) => {
  await page.goto('/');
  await dismissOrientationIfVisible(page);

  await expect(page.getByText('Trade Inbox').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select opportunity ALPHA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select opportunity FAIL' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select opportunity BLOCK' })).toBeVisible();
  await expect(page.getByText('Selected Trade')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ALPHA', exact: true })).toBeVisible();
});

test('reject logs the decision and advances to the next opportunity', async ({ page }) => {
  await page.goto('/');
  await dismissOrientationIfVisible(page);

  await page.getByRole('button', { name: 'Reject' }).click();

  await expect(page.getByText('Recent Decisions')).toBeVisible();
  await expect(page.getByText('reject', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'FAIL', exact: true })).toBeVisible();
});

test('quote success and failure are both visible in the detail rail', async ({ page }) => {
  await page.goto('/');
  await dismissOrientationIfVisible(page);

  await page.getByRole('button', { name: 'Get quote' }).click();
  await expect(page.getByText('Latest quote response')).toBeVisible();
  await expect(page.getByText('quote_only', { exact: true })).toBeVisible();
  await page.getByLabel('P&L %').fill('12.5');
  await page.getByLabel('Vs baseline').selectOption('beat');
  await page.getByLabel('Notes').fill('Exited into strength after the quote.');
  await page.getByRole('button', { name: 'Start tracking' }).click();
  await expect(page.getByText('+12.5%')).toBeVisible();
  await expect(page.getByText('beat', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Select opportunity FAIL' }).click();
  await page.getByRole('button', { name: 'Get quote' }).click();

  await expect(page.getByText('failed', { exact: true })).toBeVisible();
  await expect(page.getByText('Mock quote failure for test coverage.')).toBeVisible();
});
