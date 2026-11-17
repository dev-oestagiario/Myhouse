import {expect,test} from '@playwright/test';
import {setupMockSession} from './fixtures';

test('F7.7 — Android mantém navegação inferior mesmo em WebView larga',async({page})=>{
  // Capacitor resolves this custom platform in its normal runtime. No fake
  // viewport or CSS class is forced; the app decides its own layout.
  await page.addInitScript(()=>{
    Object.defineProperty(window,'CapacitorCustomPlatform',{value:{name:'android',plugins:{}}});
  });
  await page.setViewportSize({width:1280,height:800});
  await setupMockSession(page);
  const sidebar=page.locator('#myhouse-menu');
  const bottom=page.getByRole('navigation',{name:'Navegação rápida'});
  for(const viewport of [{width:1280,height:800},{width:1024,height:640},{width:390,height:844},{width:960,height:540}]){
    await page.setViewportSize(viewport);
    await expect(page.locator('html')).toHaveAttribute('data-layout','mobile');
    await expect(sidebar).toHaveAttribute('hidden','');
    await expect(sidebar).not.toBeVisible();
    await expect(bottom).toBeVisible();
    const main=await page.locator('main.main').boundingBox();
    const inner=await page.evaluate(()=>document.documentElement.clientWidth);
    expect(main!.x).toBeLessThanOrEqual(1);
    expect(main!.width).toBeGreaterThanOrEqual(inner-2);
    const fab=page.getByRole('button',{name:'Ações de cadastro'});
    if(await fab.isVisible()){
      const a=await fab.boundingBox(),b=await bottom.boundingBox();
      expect(a!.y+a!.height).toBeLessThanOrEqual(b!.y+1);
    }
  }
  await bottom.getByRole('button',{name:'Mais'}).click();
  const drawer=page.getByRole('dialog',{name:'Menu principal'});
  await expect(drawer).toBeVisible();
  await expect(sidebar).not.toHaveAttribute('hidden','');
  await expect(page.locator('main.main')).toHaveAttribute('inert','');
  await page.setViewportSize({width:1280,height:800});
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button',{name:'Projetos',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Projetos da casa'})).toBeVisible();
  await expect(sidebar).not.toBeVisible();
  await expect(page.locator('main.main')).not.toHaveAttribute('inert','');
  await bottom.getByRole('button',{name:'Compras',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Lista de compras',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ações de cadastro'}).click();
  await page.getByRole('button',{name:'Adicionar item',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Adicionar item'});
  await expect(dialog).toBeVisible();
  const bounds=await dialog.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(1240);
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(sidebar).not.toBeVisible();
  await expect(bottom).toBeVisible();
});

test('F7.7 — web desktop mantém sidebar e troca corretamente ao redimensionar',async({page,isMobile})=>{
  test.skip(isMobile,'Valida desktop com mouse');
  await page.setViewportSize({width:1366,height:768});
  await setupMockSession(page);
  const sidebar=page.locator('#myhouse-menu');
  const bottom=page.getByRole('navigation',{name:'Navegação rápida'});
  await expect(page.locator('html')).toHaveAttribute('data-layout','desktop');
  await expect(sidebar).toBeVisible();
  await expect(bottom).not.toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(sidebar).not.toBeVisible();
  await expect(bottom).toBeVisible();
  await bottom.getByRole('button',{name:'Mais'}).click();
  await expect(page.getByRole('dialog',{name:'Menu principal'})).toBeVisible();
  await page.setViewportSize({width:1366,height:768});
  await expect(page.locator('html')).toHaveAttribute('data-layout','desktop');
  await expect(sidebar).toBeVisible();
  await expect(sidebar).not.toHaveAttribute('role','dialog');
  await expect(bottom).not.toBeVisible();
  await expect(page.locator('main.main')).not.toHaveAttribute('inert','');
});
