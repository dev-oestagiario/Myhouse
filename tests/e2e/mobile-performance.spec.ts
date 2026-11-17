import {expect,test,type Page} from '@playwright/test';
import {navigate,setupMockSession} from './fixtures';

async function checkViewport(page:Page,section:string){
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),{message:'Overflow global em '+section}).toBeLessThanOrEqual(1);
  const fab=page.getByRole('button',{name:'Ações de cadastro',exact:true});
  const bottom=page.getByRole('navigation',{name:'Navegação rápida'});
  if(await fab.isVisible()&&await bottom.isVisible()){
    const f=await fab.boundingBox(),b=await bottom.boundingBox();
    expect(f!.y+f!.height).toBeLessThanOrEqual(b!.y+1);
  }
}

test('F7.5 — listas e medição manual não solicitam visualizadores 3D',async({page})=>{
  const loaded:string[]=[];
  page.on('request',request=>loaded.push(new URL(request.url()).pathname));
  await setupMockSession(page);
  await navigate(page,'Projetos');
  await expect(page.getByRole('heading',{name:'Projetos da casa'})).toBeVisible();
  await navigate(page,'Lista de compras');
  await expect(page.getByText('Sua lista de compras está vazia')).toBeVisible();
  await navigate(page,'Escanear cômodo');
  await page.getByRole('button',{name:'Usar modo manual'}).click();
  await expect(page.getByRole('heading',{name:'Medidas do cômodo'})).toBeVisible();
  expect(loaded.filter(path=>/\/(?:HouseModel|OutdoorModel|RoomScanPreview|LiveCameraPreview)\.tsx$/.test(path))).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByLabel('Nome do cômodo',{exact:true}).fill('Cômodo QA');
  await page.getByRole('button',{name:'Visualizar em 3D'}).click();
  await expect(page.locator('.scan-3d canvas')).toBeVisible();
  expect(loaded.some(path=>path.endsWith('/RoomScanPreview.tsx'))).toBe(true);
});

for(const width of [320,390,768]){
  test('F7.5 — auditoria de responsividade '+width+'px',async({page,isMobile})=>{
    test.skip(!isMobile,'Matriz específica do viewport mobile');
    test.setTimeout(90_000);
    await page.setViewportSize({width,height:844});
    await setupMockSession(page);
    await checkViewport(page,'Início');
    const routes=[
      ['Projetos','Projetos da casa'],
      ['Lista de compras','Lista de compras'],
      ['Obras','Obras'],
      ['Histórico de atividades','Histórico de atividades'],
      ['Editar planta 2D','Editar planta'],
      ['Escanear cômodo',''],
      ['Planta 3D','Planta 3D'],
    ];
    for(const [section,title] of routes){
      await test.step(section,async()=>{
        await navigate(page,section);
        if(title)await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
        else await expect(page.getByRole('region',{name:'Escaneamento ao vivo de cômodo'})).toBeVisible();
        if(section==='Planta 3D')await expect(page.locator('.scene canvas')).toBeVisible();
        await checkViewport(page,section);
      });
    }
  });
}
