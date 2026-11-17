import {expect,test} from '@playwright/test';
import {navigate,setupMockSession} from './fixtures';

test('F7.8 — cabeçalho e barras seguras ficam fora da rolagem',async({page,isMobile})=>{
  test.skip(!isMobile,'Layout mobile');
  await page.setViewportSize({width:390,height:844});
  await setupMockSession(page);
  await page.evaluate(()=>{
    document.documentElement.style.setProperty('--safe-area-inset-top','28px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom','24px');
  });
  const content=page.locator('#myhouse-page-content');
  const header=page.locator('.topbar');
  const nav=page.getByRole('navigation',{name:'Navegação rápida'});
  const box=async()=>({header:await header.boundingBox(),content:await content.boundingBox(),nav:await nav.boundingBox()});
  const before=await box();
  expect(before.header!.y).toBeGreaterThanOrEqual(28);
  expect(before.content!.y).toBeGreaterThanOrEqual(before.header!.y+before.header!.height-1);
  expect(before.content!.y+before.content!.height).toBeLessThanOrEqual(before.nav!.y+1);
  await content.evaluate(el=>{const spacer=document.createElement('div');spacer.style.height='1300px';el.appendChild(spacer);el.scrollTop=600;});
  await expect.poll(()=>content.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
  const after=await box();
  expect(after.header!.y).toBe(before.header!.y);
  expect(after.nav!.y).toBe(before.nav!.y);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  await navigate(page,'Lista de compras');
  await expect.poll(()=>content.evaluate(el=>el.scrollTop)).toBe(0);
});

test('F7.8 — foco oculta navegação antes de alterar viewport; formulário continua utilizável',async({page,isMobile})=>{
  test.skip(!isMobile,'Layout mobile');
  await setupMockSession(page);
  await navigate(page,'Lista de compras');
  const nav=page.getByRole('navigation',{name:'Navegação rápida'});
  const fab=page.getByRole('button',{name:'Ações de cadastro'});
  await expect(nav).toBeVisible();
  await page.getByLabel('Pesquisar itens').focus();
  // Already hidden without waiting for a native keyboard event or resize.
  await expect(page.locator('html')).toHaveClass(/myhouse-keyboard-open/);
  await expect(nav).not.toBeVisible();
  await expect(fab).not.toBeVisible();
  await page.setViewportSize({width:390,height:420});
  await expect(page.locator('.topbar')).toBeInViewport();
  await page.getByLabel('Pesquisar itens').blur();
  await page.setViewportSize({width:390,height:844});
  await expect(nav).toBeVisible();
  await fab.click();
  await page.getByRole('button',{name:'Adicionar item',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Adicionar à lista de compras'});
  await dialog.getByLabel('Nome do item *').fill('Teste teclado');
  await page.setViewportSize({width:390,height:390});
  await expect(dialog.locator('.modal-heading')).toBeInViewport();
  await dialog.getByRole('button',{name:'Salvar item'}).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button',{name:'Salvar item'})).toBeInViewport();
  await dialog.getByRole('button',{name:'Salvar item'}).click();
  await expect(dialog).toHaveCount(0);
});

test('F7.8 — valores podem ser apagados e digitados sem zeros à esquerda',async({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Lista de compras');
  await page.getByRole('button',{name:'Ações de cadastro'}).click();
  await page.getByRole('button',{name:'Adicionar item',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Adicionar à lista de compras'});
  await dialog.getByLabel('Nome do item *').fill('Preço numérico');
  const price=dialog.locator('#p-price');
  const qty=dialog.locator('#p-qty');
  await expect(price).toHaveAttribute('inputmode','decimal');
  await price.fill('');
  await expect(price).toHaveValue('');
  await price.pressSequentially('50');
  await expect(price).toHaveValue('50');
  await price.fill('050');
  await expect(price).toHaveValue('50');
  await qty.fill('');
  await expect(qty).toHaveValue('');
  await qty.pressSequentially('05');
  await expect(qty).toHaveValue('5');
  await price.fill('12.50');
  await price.blur();
  await expect(price).toHaveValue('12.5');
  await dialog.getByRole('button',{name:'Salvar item'}).click();
  await expect.poll(()=>state.data.purchases[0]?.unitPrice).toBe(12.5);
  expect(state.data.purchases[0]?.quantity).toBe(5);
});
