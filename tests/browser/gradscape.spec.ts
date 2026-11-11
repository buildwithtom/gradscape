import { test, expect } from '@playwright/test';
for (const width of [390, 768, 1440])
  test(`GradScape identity, sticky navigation and footer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page).toHaveTitle('GradScape — A master’s. A change of scene.');
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'GradScape home', exact: true })).toBeVisible();
    await expect(header.getByText('Local & private', { exact: true })).toHaveCount(0);
    await expect(
      header.getByRole('combobox', { name: 'Display currency', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1000));
    const rect = await header.boundingBox();
    expect(rect?.y).toBe(0);
    await expect(header.getByRole('link', { name: 'Compare', exact: true })).toBeInViewport();
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect(
      page
        .getByRole('contentinfo')
        .getByText(
          'Your notes stay in this browser. Export a backup before clearing your browser data.',
        ),
    ).toBeVisible();
    await expect(
      page
        .getByRole('contentinfo')
        .getByRole('button', { name: 'Data & exchange rates', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/gradscape-footer-${width}.png`,
      fullPage: false,
      animations: 'disabled',
    });
    await header.getByRole('link', { name: 'My priorities', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My priorities', exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/gradscape-priorities-${width}.png`,
      fullPage: false,
      animations: 'disabled',
    });
  });
