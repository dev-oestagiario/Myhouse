import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {navigate,setupMockSession} from './fixtures';

test('F7.6 — modal isola fundo, teclado percorre formulário e foco retorna',async({page})=>{
  await setupMockSession(page);
  await navigate(page,'Projetos');
  const trigger=page.getByRole('button',{name:'Ações de cadastro'});
  await trigger.click();
  await page.getByRole('button',{name:'Novo projeto',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Novo projeto'});
  await expect(dialog).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert','');
  const first=dialog.getByRole('button',{name:'Fechar janela'});
  const last=dialog.getByRole('button',{name:'Salvar projeto'});
  await expect(first).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert','');
  await expect(trigger).toBeFocused();
});

test('F7.6 — menu mobile impede interação com fundo e restaura foco',async({page,isMobile})=>{
  test.skip(!isMobile,'Drawer exclusivo mobile');
  await setupMockSession(page);
  const trigger=page.getByRole('navigation',{name:'Navegação rápida'}).getByRole('button',{name:'Mais'});
  await trigger.click();
  const menu=page.getByRole('dialog',{name:'Menu principal'});
  await expect(menu).toBeVisible();
  await expect(page.locator('main.main')).toHaveAttribute('inert','');
  await expect(menu.getByRole('button',{name:'Fechar navegação'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu.getByRole('button',{name:'Exportar backup pelo menu'})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('button',{name:'Fechar navegação'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('F7.6 — audita formulário aberto e seções opcionais',async({page})=>{
  await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Ações de cadastro'}).click();
  await page.getByRole('button',{name:'Novo projeto',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Novo projeto'});
  await expect(dialog).toBeVisible();
  for(const title of ['Planejamento e orçamento','Ambientes envolvidos']){
    await dialog.locator('summary').filter({hasText:title}).click();
  }
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(v=>['critical','serious'].includes(v.impact??'')).map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(dialog).toHaveCount(0);
});

test('F7.6 — falha ao carregar módulo pesado não derruba navegação',async({page})=>{
  await page.route('**/src/plan/HouseModel.tsx*',route=>route.abort('failed'));
  await setupMockSession(page);
  await navigate(page,'Planta 3D');
  const alert=page.getByRole('alert').filter({hasText:'Não foi possível abrir esta visualização'});
  await expect(alert).toBeVisible();
  await alert.getByRole('button',{name:'Abrir editor 2D'}).click();
  await expect(page.getByRole('heading',{name:'Editar planta',exact:true})).toBeVisible();
  await navigate(page,'Obras');
  await expect(page.getByRole('button',{name:/Sala de teste/})).toBeVisible();
});
