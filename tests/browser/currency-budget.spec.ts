import { test, expect } from '@playwright/test';

test('currency converts the exact budget, leads fee display and remembers the choice', async ({
  page,
}) => {
  await page.goto('/');
  const currency = page.getByRole('combobox', { name: 'Display currency', exact: true });
  const exact = () =>
    page.getByRole('spinbutton', { name: `Or enter an exact maximum (${current})`, exact: true });
  let current = 'NZD';
  await exact().fill('50000');
  const count = await page.locator('.programme-table tbody tr').count();
  await currency.selectOption('INR');
  current = 'INR';
  await expect(exact()).toHaveValue('2645000');
  await expect(page.locator('.programme-table tbody tr')).toHaveCount(count);
  const aut = page.getByRole('row').filter({
    has: page.getByRole('button', { name: 'Master of IT Project Management', exact: true }),
  });
  await expect(aut.locator('.fee strong')).toHaveText('INR 2,616,434 est.');
  await expect(aut.locator('.fee small').first()).toHaveText('NZD 49,460 original');
  await page.getByRole('button', { name: 'Data & exchange rates', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'INR per 1 NZD', exact: true }).fill('60');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(exact()).toHaveValue('2645000');
  await expect(aut).toHaveCount(0);
  await exact().fill('3000000');
  await expect(aut.locator('.fee strong')).toHaveText('INR 2,967,600 est.');
  await currency.selectOption('NZD');
  current = 'NZD';
  await expect(exact()).toHaveValue('50000');
  await page.getByRole('link', { name: 'My shortlist', exact: true }).click();
  await currency.selectOption('INR');
  await page.reload();
  await expect(currency).toHaveValue('INR');
  await page.getByRole('link', { name: 'My priorities', exact: true }).click();
  await expect(currency).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Tuition budget', exact: true }).fill('50000');
  await page.getByRole('combobox', { name: 'Budget currency', exact: true }).selectOption('INR');
  await expect(page.getByRole('spinbutton', { name: 'Tuition budget', exact: true })).toHaveValue(
    '3000000',
  );
});

for (const width of [390, 768, 1440])
  test(`slider and header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const currency = page.getByRole('combobox', { name: 'Display currency', exact: true });
    await expect(currency).toBeVisible();
    if (width <= 900) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const slider = page.getByRole('slider', {
      name: 'Maximum full tuition slider (NZD)',
      exact: true,
    });
    const exact = page.getByRole('spinbutton', {
      name: 'Or enter an exact maximum (NZD)',
      exact: true,
    });
    await expect(slider).toHaveAttribute('max', '100000');
    await slider.focus();
    await slider.press('Home');
    await expect(exact).toHaveValue('0');
    await slider.press('ArrowRight');
    expect(Number(await exact.inputValue())).toBeGreaterThan(0);
    await slider.press('End');
    await expect(exact).toHaveValue('100000');
    await exact.fill('47834');
    await expect(slider).toHaveValue('47834');
    await page.getByRole('combobox', { name: 'City / campus', exact: true }).selectOption('Napier');
    await expect(slider).toHaveAttribute('max', '100000');
    await page.getByRole('combobox', { name: 'City / campus', exact: true }).selectOption('');
    await exact.fill('200000');
    await expect(exact).toHaveValue('200000');
    await expect(slider).toHaveValue('100000');
    await page.getByRole('button', { name: 'No maximum', exact: true }).click();
    await expect(exact).toHaveValue('');
    await expect(page.locator('.programme-table tbody tr')).toHaveCount(27);
    await page.getByRole('combobox', { name: 'Country', exact: true }).selectOption('AU');
    await expect(slider).toBeDisabled();
    await expect(
      page.getByText('No comparable full-tuition quotes in this currency yet.'),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Country', exact: true }).selectOption('NZ');
    await exact.fill('50000');
    await currency.selectOption('INR');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/currency-budget-${width}.png`, fullPage: true });
  });

test('comparison keeps living-cost inputs and tuition budget consistent when switching currencies', async ({
  page,
}) => {
  await page.goto('/#compare?ids=auckland-it-180,waikato-it-180');
  await page
    .getByRole('spinbutton', { name: 'Monthly living costs (NZD)', exact: true })
    .fill('1000');
  await page
    .getByRole('combobox', { name: 'Compare full tuition in', exact: true })
    .selectOption('INR');
  await expect(page.getByRole('combobox', { name: 'Display currency', exact: true })).toHaveValue(
    'INR',
  );
  await expect(
    page.getByRole('spinbutton', { name: 'Monthly living costs (INR)', exact: true }),
  ).toHaveValue('52900');
});
