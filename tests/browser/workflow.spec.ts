import { test, expect } from '@playwright/test';
test('explore, compare, timeline, shortlist persistence and backup preview', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A master’s.*A change of scene/ })).toBeVisible();
  await page.getByLabel('City / campus', { exact: true }).selectOption('Auckland');
  await page.getByLabel('Month', { exact: true }).selectOption('02');
  await expect(
    page.getByRole('button', { name: 'Master of IT Project Management', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset all', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'Compare University of Auckland Information Technology',
      exact: true,
    })
    .check();
  await page
    .getByRole('checkbox', {
      name: 'Compare University of Waikato Information Technology · 180 points',
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Compare 2', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your intake timeline', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.timeline-marker.confirmed')).toHaveCount(2);
  await expect(page.locator('.timeline-marker.tentative')).toHaveCount(2);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'docs/comparison.png', fullPage: false, animations: 'disabled' });
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Save University of Auckland Information Technology',
      exact: true,
    })
    .click();
  await page.getByRole('link', { name: 'My shortlist 1', exact: true }).click();
  await page
    .getByLabel('My notes & questions for admissions')
    .fill('Confirm equivalent degree and tuition scope.');
  await page
    .getByLabel('Application status for Information Technology', { exact: true })
    .selectOption('Enquiry sent');
  await page.reload();
  await expect(page.getByLabel('My notes & questions for admissions')).toHaveValue(
    'Confirm equivalent degree and tuition scope.',
  );
  await expect(
    page.getByLabel('Application status for Information Technology', { exact: true }),
  ).toHaveValue('Enquiry sent');
  await page.getByLabel('Restore shortlist file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        items: [{ id: 'canterbury-bis-180', notes: 'Test restored note', status: 'Applying' }],
      }),
    ),
  });
  await expect(page.getByRole('heading', { name: 'Preview shortlist restore' })).toBeVisible();
  await expect(
    page.getByText(
      'This will replace 1 saved programmes with 1 programmes from your backup. Notes and statuses will be replaced.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Replace my shortlist', exact: true }).click();
  await expect(page.getByLabel('My notes & questions for admissions')).toHaveValue(
    'Test restored note',
  );
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await page.getByLabel('Country', { exact: true }).selectOption('AU');
  await expect(page.getByRole('heading', { name: 'This map is still being drawn.' })).toBeVisible();
  await expect(page.getByText('2 of 4 selected', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('exchange override, details, missing starts, priorities and selection limit', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Data & exchange rates', exact: true }).click();
  await page.getByLabel('INR per 1 NZD').fill('60');
  await expect(page.getByText('Your custom rate is active.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByLabel('Year', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Master of Business Intelligence', exact: true }).click();
  await expect(page.getByText('Unknown start', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  for (const name of [
    'Compare University of Auckland Information Technology',
    'Compare University of Waikato Information Technology · 180 points',
    'Compare EIT Information Technology · 180 credits',
    'Compare NZSE Business Intelligence',
  ])
    await page.getByRole('checkbox', { name, exact: true }).check();
  await page
    .getByRole('checkbox', {
      name: 'Compare EIT Information Technology · 240 credits',
      exact: true,
    })
    .click();
  await expect(page.getByText('4 of 4 selected', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', {
      name: 'Compare EIT Information Technology · 240 credits',
      exact: true,
    }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Compare 4', exact: true }).click();
  await expect(page.locator('.unknown-start')).toContainText('Start unknown');
  await page.getByRole('link', { name: 'My priorities', exact: true }).click();
  await page.getByLabel('Tuition budget', { exact: true }).fill('50000');
  await page.reload();
  await expect(page.getByLabel('Tuition budget', { exact: true })).toHaveValue('50000');
});
for (const width of [390, 768, 1440])
  test(`responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    if (width <= 900) {
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await expect(page.getByLabel('City / campus', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
    }
    await expect(
      page.getByRole('button', {
        name: 'Master of Computer and Information Sciences',
        exact: true,
      }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .getByRole('checkbox', {
        name: 'Compare University of Auckland Information Technology',
        exact: true,
      })
      .check();
    await page
      .getByRole('checkbox', {
        name: 'Compare University of Waikato Information Technology · 180 points',
        exact: true,
      })
      .check();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/explore-${width}.png`,
      fullPage: false,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Compare 2', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
test('repository subpath production direct hash navigation', async ({ page }) => {
  await page.goto(
    'http://127.0.0.1:4173/study-abroad-comparator/#compare?ids=auckland-it-180,waikato-it-180',
  );
  await expect(page.getByRole('heading', { name: 'Your intake timeline' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.timeline-row')).toHaveCount(2);
});
