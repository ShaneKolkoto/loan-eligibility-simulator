import { test, expect } from '@playwright/test';

test('completes the eligibility flow and shows a result', async ({ page }) => {
  await page.goto('/');

  // Step 1 — About you
  await page.getByLabel(/age/i).fill('35');
  await page.getByText('Employed', { exact: true }).click();
  await page.getByLabel(/months in current employment/i).fill('24');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 2 — Finances
  await page.getByLabel(/monthly income/i).fill('25000');
  await page.getByLabel(/monthly expenses/i).fill('8000');
  await page.getByLabel(/existing monthly debt/i).fill('2000');
  await page.getByLabel(/credit score/i).fill('700');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 3 — The loan
  await page.getByText('Home improvement', { exact: true }).click();
  await page.getByLabel(/requested amount/i).fill('10000');
  await page.getByText('24 months', { exact: true }).click();
  await page.getByRole('button', { name: /check eligibility/i }).click();

  // Result
  await expect(page.getByText(/you may qualify/i)).toBeVisible();
});

test('shows validation errors on an empty submission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 1 should not advance, and errors should be shown.
  await expect(page.getByText(/age is required/i)).toBeVisible();
});