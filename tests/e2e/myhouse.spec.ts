import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { navigate, setupMockSession } from './fixtures';

test('cadastrar e editar um cômodo, registrar obra e ver histórico', async ({ page }) => {
  const state = await setupMockSession(page);
  await navigate(page, 'Obras');
  await page.getByRole('button', { name: 'Adicionar cômodo' }).click();
  await expect(page.getByRole('dialog', { name: 'Adicionar cômodo' })).toBeVisible();
  await page.getByLabel('Nome do cômodo *').fill('Quarto QA');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar cômodo' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Cômodo', { exact: true }).selectOption({ label: 'Quarto QA' });
  await page.getByLabel('O que você fez? (opcional)').fill('Primer aplicado');
  await page.getByRole('button', { name: 'Salvar atualização' }).click();
  await expect(page.getByText('Primer aplicado')).toBeVisible();
  await navigate(page, 'Histórico de atividades');
  await expect(page.getByText('Primer aplicado')).toBeVisible();
  await expect.poll(() => state.data.rooms.length).toBe(2);
});

test('compras com categoria livre, edição e conclusão', async ({ page }) => {
  await setupMockSession(page);
  await navigate(page, 'Lista de compras');
  await page.getByRole('button', { name: 'Adicionar item' }).first().click();
  await page.getByLabel('Nome do item *').fill('Tinta para parede');
  await page.getByLabel('Categoria (livre) *').fill('Reforma personalizada');
  await page.getByLabel('Preço unitário (R$)').fill('79.90');
  await page.getByRole('button', { name: 'Salvar item' }).click();
  await expect(page.getByText('Tinta para parede')).toBeVisible();
  await expect(page.locator('.purchase-meta span').filter({ hasText: 'Reforma personalizada' }).first()).toBeVisible();
});

test('planta 2D — criar formato L, porta e salvar mantendo backup', async ({ page }) => {
  const state = await setupMockSession(page);
  await navigate(page, 'Editar planta 2D');
  await page.getByRole('button', { name: 'Formato L' }).click();
  await page.getByRole('button', { name: 'Adicionar vão' }).click();
  await page.getByRole('button', { name: 'Salvar planta do cômodo' }).click();
  await expect(page.getByText('Alterações salvas.')).toBeVisible();
  await expect.poll(() => state.data.rooms[0].footprint?.length).toBe(6);
  await expect.poll(() => state.data.rooms[0].openings?.length).toBe(1);
  await navigate(page, 'Planta 3D');
  await expect(page.getByRole('button', { name: /Sala de teste/ })).toBeVisible();
});

test('escaneamento ao vivo não solicita fotos e mantém revisão manual', async ({ page }) => {
  await setupMockSession(page);
  await navigate(page, 'Escanear cômodo');
  const start = page.getByRole('button', { name: 'Iniciar escaneamento' });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('heading', { name: 'Desenhe o contorno do piso' })).toBeVisible();
  await expect(page.getByText('Referência — lado 1 (m)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tirar foto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Usar modo manual' }).click();
  await page.getByPlaceholder('Ex.: Quarto principal').fill('Cozinha nova');
  await page.getByRole('button', { name: 'Visualizar em 3D' }).click();
  const save = page.getByRole('button', { name: 'Criar cômodo na Planta 3D' });
  await expect(save).toBeDisabled();
  await page.getByRole('checkbox', { name: /Conferi as medidas/ }).check();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Cozinha nova', { exact: true })).toBeVisible();
});

test('modal: Escape fecha e foco volta para o botão de origem', async ({ page }) => {
  await setupMockSession(page);
  await navigate(page, 'Lista de compras');
  const add = page.getByRole('button', { name: 'Adicionar item' }).first();
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(add).toBeFocused();
});

test('navegação e principais formulários sem violações axe graves', async ({ page }) => {
  await setupMockSession(page);
  for (const area of ['Lista de compras','Obras','Editar planta 2D']) {
    await navigate(page, area);
    const violations = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(violations.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
  }
});

test('telas móveis não criam rolagem horizontal', async ({ page, isMobile }) => {
  if (!isMobile) test.skip();
  await setupMockSession(page);
  for (const route of ['Obras', 'Editar planta 2D', 'Escanear cômodo']) {
    await navigate(page, route);
    const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
  }
});
