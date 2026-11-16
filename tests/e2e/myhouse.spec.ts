import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { navigate, setupMockSession } from './fixtures';

test('F6.8 — importar V1 realista, salvar V2 e exportar backup sem perder dados',async ({page})=>{
  const legacy={
    version:1 as const,
    rooms:[{id:'legacy-sala',name:'Sala antiga',width:4,length:3,height:2.7,x:0,z:0,
      footprint:[{x:0,z:0},{x:4,z:0},{x:4,z:3},{x:0,z:3}],
      openings:[{id:'legacy-porta',type:'door' as const,edge:0,offset:.3,width:.8,height:2,sill:0}]}],
    purchases:[{id:'legacy-compra',name:'Tinta antiga',category:'Reforma',roomId:'legacy-sala',
      priority:'alta' as const,quantity:1,unitPrice:19.9,purchased:false,
      notes:'Preservar',url:'',createdAt:'2026-01-01T12:00:00Z'}],
    wallStages:{'legacy-sala:leste':{Pintura:'concluido' as const}},
    logs:[{id:'legacy-event',roomId:'legacy-sala',direction:'leste' as const,stage:'Pintura' as const,
      status:'concluido' as const,note:'Etapa antiga',createdAt:'2026-01-02T12:00:00Z'}],
  };
  const state=await setupMockSession(page,legacy as unknown as import('../../src/types').HomeData);
  await navigate(page,'Projetos');
  await expect(page.locator('canvas')).toHaveCount(0); // consultar projetos não precisa inicializar WebGL
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const editor=page.getByRole('dialog',{name:'Novo projeto'});
  await editor.getByLabel('Nome do projeto *').fill('Reforma após migração');
  await editor.getByRole('button',{name:'Salvar projeto'}).click();
  await expect.poll(()=>state.data.version).toBe(2);
  expect(state.data.rooms).toEqual(legacy.rooms);
  expect(state.data.purchases).toEqual(legacy.purchases);
  expect(state.data.wallStages).toEqual(legacy.wallStages);
  expect(state.data.logs).toEqual(legacy.logs);
  expect(state.data.projects).toHaveLength(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar backup'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/backup.*\.json$/);
  const text=(await import('node:fs/promises')).readFile;
  const exported=JSON.parse(await text(await download.path(),'utf8'));
  expect(exported.version).toBe(2);
  expect(exported.rooms).toEqual(legacy.rooms);
  expect(exported.wallStages).toEqual(legacy.wallStages);
  expect(exported.projects).toHaveLength(1);
});

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

test('câmera sem ARCore calibra o piso e conserva o polígono confirmado', async ({ page }) => {
  // Fluxo sem hardware: os pixels do vídeo são simulados, mas todos os pontos
  // passam pelo componente real, pela homografia e pela validação do cadastro.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => new MediaStream() },
    });
    HTMLMediaElement.prototype.play = async function () {};
  });
  const state=await setupMockSession(page);
  await navigate(page,'Escanear cômodo');
  const start=page.getByRole('button',{name:'Iniciar escaneamento'});
  await expect(start).toBeEnabled();
  await start.click();
  const frame=page.getByRole('button',{name:'Marcar canto da referência no vídeo'});
  await expect(frame).toBeVisible();
  const clickPoint=async (x:number,y:number)=>{
    const target=page.locator('.scan-live-tap');
    const box=await target.boundingBox();
    if(!box)throw new Error('Área de câmera indisponível');
    await target.click({position:{x:box.width*x,y:box.height*y}});
  };
  for(const [x,y] of [[.2,.2],[.4,.2],[.4,.4],[.2,.4]])await clickPoint(x,y);
  await expect(page.getByRole('button',{name:'Marcar canto do cômodo no vídeo'})).toBeVisible();
  for(const [x,y] of [[.1,.1],[.6,.1],[.6,.6],[.1,.6]])await clickPoint(x,y);
  await expect(page.getByText('Planta inicial estimada')).toBeVisible();
  const use=page.getByRole('button',{name:'Usar contorno estimado'});
  await expect(use).toBeEnabled();
  await use.click();
  // Clique por pixel varia alguns milímetros com o tamanho da tela.
  const estimatedWidth=Number(await page.getByLabel('Largura (m)').inputValue());
  const estimatedLength=Number(await page.getByLabel('Comprimento (m)').inputValue());
  expect(estimatedWidth).toBeGreaterThan(1.45);
  expect(estimatedWidth).toBeLessThan(1.55);
  expect(estimatedLength).toBeGreaterThan(1.45);
  expect(estimatedLength).toBeLessThan(1.55);
  await page.getByPlaceholder('Ex.: Quarto principal').fill('Piso projetado');
  await page.getByLabel('Largura (m)').fill('3.2');
  await page.getByLabel('Comprimento (m)').fill('4.1');
  await expect(page.getByRole('img',{name:/Vista superior do piso com 4 cantos, largura 3.2 metros e comprimento 4.1 metros/})).toBeVisible();
  await page.getByRole('button',{name:'Visualizar em 3D'}).click();
  await expect(page.locator('.scan-summary').getByText('Área de piso')).toBeVisible();
  await expect(page.locator('.scan-summary').getByText('Perímetro')).toBeVisible();
  await page.getByRole('checkbox',{name:/Conferi as medidas/}).check();
  await page.getByRole('button',{name:'Criar cômodo na Planta 3D'}).click();
  await expect.poll(()=>state.data.rooms.find(r=>r.name==='Piso projetado')?.footprint?.length).toBe(4);
  const saved=state.data.rooms.find(r=>r.name==='Piso projetado');
  expect(saved?.width).toBe(3.2);
  expect(saved?.length).toBe(4.1);
  expect(saved?.footprint?.[1].x).toBeCloseTo(3.2,3);
  await navigate(page,'Editar planta 2D');
  await expect(page.getByRole('combobox',{name:'Cômodo',exact:true})).toHaveValue(saved!.id);
});


test('ação Sair fica na área da conta e não polui o cabeçalho', async ({page}) => {
  await setupMockSession(page);
  await expect(page.locator('.topbar-actions').getByRole('button',{name:'Sair da conta'})).toHaveCount(0);
  await expect(page.locator('.sidebar-account-actions').getByRole('button',{name:'Sair da conta'})).toHaveCount(1);
});

test('F6.1 — cria projeto de deck sem cômodo e edita com orçamento e ambiente', async ({ page }) => {
  const state = await setupMockSession(page);
  await navigate(page, 'Projetos');
  await expect(page.getByRole('heading', { name: 'Projetos da casa' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo projeto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo projeto' });
  await dialog.getByLabel('Nome do projeto *').fill('Deck no quintal');
  await dialog.getByLabel('O que pretende mudar?').fill('Planejar uma plataforma externa.');
  await dialog.getByLabel('Tipo de projeto').selectOption('ampliacao');
  await dialog.getByLabel('Orçamento previsto (R$)').fill('2500,50');
  await dialog.getByRole('button', { name: 'Salvar projeto' }).click();
  await expect(page.getByRole('heading', { name: 'Deck no quintal' })).toBeVisible();
  await expect(page.getByText('Sem ambiente vinculado.')).toHaveCount(0);
  await expect(page.getByText('Ainda não há ambientes vinculados.')).toBeVisible();
  await expect(page.getByText('R$ 2.500,50')).toBeVisible();
  await page.getByRole('button', { name: 'Editar projeto' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar projeto' });
  await edit.getByLabel('Situação').selectOption('planejando');
  await edit.getByLabel('Prioridade').selectOption('alta');
  await edit.getByRole('checkbox', { name: 'Sala de teste' }).check();
  await edit.getByRole('button', { name: 'Salvar projeto' }).click();
  await expect(page.getByText('Planejando', { exact: true })).toBeVisible();
  await expect(page.getByText('Sala de teste')).toBeVisible();
  await expect.poll(() => state.data.projects[0]?.spaceIds.length).toBe(1);
  expect(state.data.projects[0].budgetTargetCents).toBe(250050);
  expect(state.data.projects[0].status).toBe('planejando');
  expect(state.data.rooms[0].name).toBe('Sala de teste');
  await navigate(page,'Obras');
  await page.getByRole('button', { name: 'Excluir Sala de teste' }).click();
  await expect(page.getByText('Este cômodo está vinculado a um projeto.')).toBeVisible();
  expect(state.data.rooms).toHaveLength(1);
});

test('F6.1 — arquiva, filtra, reativa e exclui projeto sem apagar cômodos', async ({ page }) => {
  const state = await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const dialog=page.getByRole('dialog',{name:'Novo projeto'});
  await dialog.getByLabel('Nome do projeto *').fill('Renovar sala');
  await dialog.getByRole('checkbox',{name:'Sala de teste'}).check();
  await dialog.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('button',{name:'Arquivar projeto'}).click();
  await expect(page.getByRole('button',{name:'Reativar projeto'})).toBeVisible();
  await page.getByRole('button',{name:'Todos os projetos'}).click();
  await expect(page.getByRole('button',{name:/Ver projeto/})).toHaveCount(0);
  await page.getByLabel('Exibição').selectOption('arquivados');
  await expect(page.getByRole('heading',{name:'Renovar sala'})).toBeVisible();
  await page.getByRole('button',{name:'Ver projeto'}).click();
  await page.getByRole('button',{name:'Reativar projeto'}).click();
  await expect(page.getByRole('button',{name:'Editar projeto'})).toBeVisible();
  page.once('dialog', dialog=>void dialog.accept());
  await page.getByRole('button',{name:'Excluir projeto'}).click();
  await expect(page.getByRole('heading',{name:'Renovar sala'})).toHaveCount(0);
  await expect.poll(()=>state.data.projects.length).toBe(0);
  expect(state.data.rooms).toHaveLength(1);
});

test('F6.1 — filtra projetos por situação e pesquisa', async ({ page }) => {
  await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const dialog=page.getByRole('dialog',{name:'Novo projeto'});
  await dialog.getByLabel('Nome do projeto *').fill('Pintura da cozinha');
  await dialog.getByLabel('Situação').selectOption('em-execucao');
  await dialog.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('button',{name:'Todos os projetos'}).click();
  await page.getByLabel('Pesquisar projetos').fill('deck');
  await expect(page.getByRole('heading',{name:'Pintura da cozinha'})).toHaveCount(0);
  await page.getByLabel('Pesquisar projetos').fill('pintura');
  await expect(page.getByRole('heading',{name:'Pintura da cozinha'})).toBeVisible();
  await page.getByLabel('Situação').selectOption('concluido');
  await expect(page.getByRole('heading',{name:'Pintura da cozinha'})).toHaveCount(0);
  await page.getByLabel('Situação').selectOption('em-execucao');
  await expect(page.getByRole('heading',{name:'Pintura da cozinha'})).toBeVisible();
});

test('F6.2 — criar serviço com checklist, acompanhar progresso, arquivar e reativar',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const projectModal=page.getByRole('dialog',{name:'Novo projeto'});
  await projectModal.getByLabel('Nome do projeto *').fill('Renovar a sala');
  await projectModal.getByRole('checkbox',{name:'Sala de teste'}).check();
  await projectModal.getByRole('button',{name:'Salvar projeto'}).click();
  await expect(page.getByRole('heading',{name:'Tarefas e serviços'})).toBeVisible();
  await page.getByRole('button',{name:'Nova tarefa'}).click();
  const taskModal=page.getByRole('dialog',{name:'Nova tarefa'});
  await taskModal.getByLabel('Nome da tarefa *').fill('Pintar as paredes');
  await taskModal.getByLabel('Tipo').selectOption('servico');
  await taskModal.getByLabel('Prioridade').selectOption('alta');
  await taskModal.getByLabel('Prazo previsto (opcional)').fill('2026-12-20');
  await taskModal.getByLabel('Ambiente (opcional)').selectOption({label:'Sala de teste'});
  await taskModal.getByRole('button',{name:'Adicionar etapa'}).click();
  await taskModal.getByRole('textbox',{name:'Etapa 1'}).fill('Cobrir móveis');
  await taskModal.getByRole('button',{name:'Salvar tarefa'}).click();
  await expect(page.getByRole('heading',{name:'Pintar as paredes'})).toBeVisible();
  await expect(page.getByText('Até 20/12/2026')).toBeVisible();
  await expect.poll(()=>state.data.workTasks?.length).toBe(1);
  expect(state.data.workTasks[0].spaceId).toBe(state.data.projects[0].spaceIds[0]);
  expect(state.data.workTasks[0].kind).toBe('servico');
  await page.getByRole('checkbox',{name:'Cobrir móveis'}).check();
  await expect(page.getByText('1/1')).toBeVisible();
  await page.getByRole('combobox',{name:'Situação de Pintar as paredes'}).selectOption('concluido');
  await expect(page.getByRole('progressbar',{name:'Tarefas concluídas'})).toHaveAttribute('aria-valuenow','100');
  await page.getByRole('button',{name:'Ver histórico'}).click();
  await expect(page.getByText('Concluiu: Cobrir móveis')).toBeVisible();
  await page.getByRole('button',{name:'Arquivar projeto'}).click();
  await expect(page.getByRole('button',{name:'Nova tarefa'})).toBeDisabled();
  await page.getByRole('button',{name:'Reativar projeto'}).click();
  await expect(page.getByRole('button',{name:'Nova tarefa'})).toBeEnabled();
  await expect.poll(()=>state.data.workTasks[0]?.status).toBe('concluido');
  await navigate(page,'Obras');
  await expect(page.getByRole('combobox',{name:'Cômodo',exact:true})).toHaveValue('room-sala');
});

test('F6.2 — dependências e integridade na exclusão',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const projectModal=page.getByRole('dialog',{name:'Novo projeto'});
  await projectModal.getByLabel('Nome do projeto *').fill('Deck no quintal');
  await projectModal.getByRole('button',{name:'Salvar projeto'}).click();
  async function addTask(title:string,dependency?:string){
    await page.getByRole('button',{name:'Nova tarefa'}).click();
    const dialog=page.getByRole('dialog',{name:'Nova tarefa'});
    await dialog.getByLabel('Nome da tarefa *').fill(title);
    if(dependency) await dialog.getByRole('checkbox',{name:dependency}).check();
    await dialog.getByRole('button',{name:'Salvar tarefa'}).click();
  }
  await addTask('Preparar o espaço');
  await addTask('Montar a plataforma','Preparar o espaço');
  await expect.poll(()=>state.data.workTasks.length).toBe(2);
  await page.getByRole('combobox',{name:'Situação de Montar a plataforma'}).selectOption('concluido');
  await expect(page.getByText('Não é possível concluir uma tarefa antes das dependências.')).toBeVisible();
  expect(state.data.workTasks.find(t=>t.title==='Montar a plataforma')?.status).toBe('nao-iniciado');
  await page.getByRole('combobox',{name:'Situação de Preparar o espaço'}).selectOption('concluido');
  await page.getByRole('combobox',{name:'Situação de Montar a plataforma'}).selectOption('concluido');
  await expect(page.getByRole('progressbar',{name:'Tarefas concluídas'})).toHaveAttribute('aria-valuenow','100');
  await page.getByRole('button',{name:'Quadro',exact:true}).click();
  await expect(page.getByRole('group',{name:'Visualização das tarefas'}).getByRole('button',{name:'Quadro'})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.task-board-column')).toHaveCount(3);
  await expect(page.locator('.task-board-column').last().getByRole('heading',{name:'Montar a plataforma'})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:'Lista',exact:true}).click();
  await page.getByRole('button',{name:'Excluir tarefa Preparar o espaço'}).click();
  // Confirmação é necessária antes de tentar apagar trabalho vinculado.
  // Sem aceitar o confirm do browser, a tarefa permanece.
  await expect.poll(()=>state.data.workTasks.length).toBe(2);
  page.once('dialog',dialog=>void dialog.accept());
  await page.getByRole('button',{name:'Excluir projeto'}).click();
  await expect(page.getByText(/Este projeto possui tarefas/)).toBeVisible();
  expect(state.data.projects).toHaveLength(1);
  await page.getByRole('button',{name:'Arquivar projeto'}).click();
  await expect(page.getByRole('button',{name:'Reativar projeto'})).toBeVisible();
});

test('F6.3 — compra vinculada e orçamento consolidado sem duplicar lista global',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const modal=page.getByRole('dialog',{name:'Novo projeto'});
  await modal.getByLabel('Nome do projeto *').fill('Reforma com orçamento');
  await modal.getByLabel('Orçamento previsto (R$)').fill('1000,00');
  await modal.getByRole('checkbox',{name:'Sala de teste'}).check();
  await modal.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('button',{name:'Nova tarefa'}).click();
  const task=page.getByRole('dialog',{name:'Nova tarefa'});
  await task.getByLabel('Nome da tarefa *').fill('Pintar a sala');
  await task.getByRole('button',{name:'Salvar tarefa'}).click();
  await page.getByRole('tab',{name:'Compras e orçamento'}).click();
  await expect(page.getByRole('heading',{name:'Compras e orçamento'})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar compra'}).click();
  const buy=page.getByRole('dialog',{name:'Adicionar compra ao projeto'});
  await buy.getByLabel('Nome do item *').fill('Tinta premium');
  await buy.getByLabel('Quantidade').fill('2');
  await buy.getByLabel('Preço unitário (R$)').fill('79.90');
  await buy.getByLabel('Tarefa relacionada (opcional)').selectOption({label:'Pintar a sala'});
  await buy.getByRole('button',{name:'Salvar item'}).click();
  await expect(page.getByRole('heading',{name:'Compras e orçamento'})).toBeVisible();
  await expect(page.getByText('Tinta premium')).toBeVisible();
  await expect(page.getByText('R$ 159,80').first()).toBeVisible();
  await expect.poll(()=>state.data.purchases.length).toBe(1);
  expect(state.data.purchases[0].taskId).toBe(state.data.workTasks[0].id);
  expect(state.data.purchases[0].projectId).toBe(state.data.projects[0].id);
  await page.getByRole('combobox',{name:'Situação de compra de Tinta premium'}).selectOption('comprado');
  await expect(page.getByText('Nenhum gasto real informado.')).toBeVisible();
  await page.getByRole('button',{name:'Editar compra Tinta premium'}).click();
  const edit=page.getByRole('dialog',{name:'Editar compra do projeto'});
  await edit.getByLabel('Preço unitário pago (R$)').fill('75.50');
  await edit.getByRole('button',{name:'Salvar item'}).click();
  await expect(page.getByText('R$ 151,00').first()).toBeVisible();
  await page.getByLabel('Reserva para imprevistos (%)').fill('10');
  await page.getByRole('button',{name:'Aplicar reserva'}).click();
  await expect(page.getByText('R$ 15,98')).toBeVisible();
  await page.getByRole('button',{name:/Cotações/}).click();
  const quotes=page.getByRole('dialog',{name:'Cotações: Tinta premium'});
  await quotes.getByLabel('Fornecedor *').fill('Loja Exemplo');
  await quotes.getByLabel('Preço unitário cotado (R$) *').fill('70,00');
  await quotes.getByRole('button',{name:'Adicionar cotação'}).click();
  await expect(quotes.getByText('Loja Exemplo')).toBeVisible();
  await quotes.getByRole('button',{name:'Fechar janela'}).click();
  await page.getByRole('button',{name:'Custos'}).click();
  const labor=page.getByRole('dialog',{name:/Custos do serviço/});
  await labor.getByLabel('Custo previsto (R$)').fill('200,00');
  await labor.getByLabel('Custo efetivamente pago (R$)').fill('180,00');
  await labor.getByRole('button',{name:'Salvar custos'}).click();
  await expect(page.getByText('R$ 331,00').first()).toBeVisible();
  await expect.poll(()=>state.data.purchases[0].quotes?.length).toBe(1);
  await navigate(page,'Lista de compras');
  await expect(page.getByText('Tinta premium')).toBeVisible();
  await expect(page.locator('.purchase-item')).toHaveCount(1);
});

test('F6.3 — compra geral pode ser vinculada a projeto sem duplicar',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Deck exterior');
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await navigate(page,'Lista de compras');
  await page.getByRole('button',{name:'Adicionar item'}).first().click();
  const buy=page.getByRole('dialog',{name:'Adicionar à lista de compras'});
  await buy.getByLabel('Nome do item *').fill('Madeira tratada');
  await buy.getByLabel('Preço unitário (R$)').fill('30');
  await buy.getByLabel('Projeto (opcional)').selectOption({label:'Deck exterior'});
  await buy.getByRole('button',{name:'Salvar item'}).click();
  await expect.poll(()=>state.data.purchases.length).toBe(1);
  expect(state.data.purchases[0].projectId).toBe(state.data.projects[0].id);
  await expect(page.getByText('Projeto: Deck exterior')).toBeVisible();
});

test('F6.4 — criar cenário da sala, editar medidas, comparar e recuperar a versão anterior',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Sala futura');
  await project.getByRole('checkbox',{name:'Sala de teste'}).check();
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Cenários 2D/3D'}).click();
  await expect(page.getByRole('heading',{name:'Cenários 2D e 3D'})).toBeVisible();
  await page.getByRole('button',{name:'Criar cenário'}).click();
  const create=page.getByRole('dialog',{name:'Criar cenário'});
  await create.getByLabel('Nome da proposta *').fill('Sala azul');
  await create.getByRole('button',{name:'Criar proposta'}).click();
  await expect(page.getByRole('button',{name:'Editar medidas de Sala de teste'})).toBeVisible();
  await expect.poll(()=>state.data.scenarios?.length).toBe(1);
  expect(state.data.scenarios[0].rooms[0].width).toBe(4.5);
  await page.getByRole('button',{name:'Editar medidas de Sala de teste'}).click();
  const room=page.getByRole('dialog',{name:'Editar espaço da proposta'});
  await room.getByLabel('Largura (m)').fill('6');
  await room.getByLabel('Nome do espaço *').fill('Sala ampliada');
  await room.getByRole('button',{name:'Salvar espaço'}).click();
  await expect.poll(()=>state.data.scenarios[0].rooms[0].width).toBe(6);
  expect(state.data.rooms[0].width).toBe(4.5);
  expect(state.data.rooms[0].name).toBe('Sala de teste');
  await page.getByRole('tab',{name:'Antes e depois'}).click();
  await expect(page.getByRole('img',{name:'Planta 2D de planta atual'})).toBeVisible();
  await expect(page.getByRole('img',{name:'Planta 2D de Sala azul'})).toBeVisible();
  await expect(page.getByText('Antes · planta real')).toBeVisible();
  await expect(page.getByText('Depois · Sala azul')).toBeVisible();
  await page.getByRole('tab',{name:'Vista 3D'}).click();
  await page.getByRole('tab',{name:'Editar 2D'}).click();
  await expect(page.getByRole('heading',{name:'Editar planta'})).toBeVisible();
  await page.getByRole('button',{name:'Formato L'}).click();
  await page.getByRole('button',{name:'Salvar planta do cômodo'}).click();
  await expect.poll(()=>state.data.scenarios[0].rooms[0].footprint?.length).toBe(6);
  expect(state.data.rooms[0].footprint).toBeUndefined();
  await page.getByRole('button',{name:'Voltar para o 3D'}).click();
  await expect(page.getByRole('heading',{name:'Histórico de versões'})).toBeVisible();
  const history=page.locator('.scenario-history').getByRole('button',{name:'Restaurar'});
  await expect(history).toHaveCount(2);
  page.once('dialog',dialog=>void dialog.accept());
  await history.first().click();
  await expect.poll(()=>state.data.scenarios[0].rooms[0].footprint).toBeUndefined();
  expect(state.data.rooms[0].width).toBe(4.5);
  await page.locator('.scenario-selected-bar').getByRole('button',{name:'Duplicar',exact:true}).click();
  await expect.poll(()=>state.data.scenarios?.length).toBe(2);
  expect(state.data.scenarios[1].rooms[0].width).toBe(6);
  await navigate(page,'Obras');
  await expect(page.getByRole('combobox',{name:'Cômodo',exact:true})).toHaveValue('room-sala');
});

test('F6.4 — cenário vazio permite planejar espaço futuro sem criar cômodo real',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Deck do quintal');
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Cenários 2D/3D'}).click();
  await page.getByRole('button',{name:'Criar cenário'}).click();
  const create=page.getByRole('dialog',{name:'Criar cenário'});
  await create.getByLabel('Nome da proposta *').fill('Novo deck');
  await create.getByLabel('Começar uma proposta em branco').check();
  await create.getByRole('button',{name:'Criar proposta'}).click();
  await expect(page.getByText('Esta proposta está vazia.')).toBeVisible();
  await page.getByRole('button',{name:'Novo espaço'}).click();
  const room=page.getByRole('dialog',{name:'Novo espaço planejado'});
  await room.getByLabel('Nome do espaço *').fill('Área de estar planejada');
  await room.getByLabel('Largura (m)').fill('5');
  await room.getByLabel('Comprimento (m)').fill('4');
  await room.getByRole('button',{name:'Salvar espaço'}).click();
  await expect.poll(()=>state.data.scenarios?.[0]?.rooms?.[0]?.name).toBe('Área de estar planejada');
  await expect(page.getByRole('button',{name:'Editar medidas de Área de estar planejada'})).toBeVisible();
  expect(state.data.rooms).toHaveLength(1);
  await page.getByRole('tab',{name:'Antes e depois'}).click();
  await expect(page.getByText('Não há cômodos reais associados a este projeto.')).toBeVisible();
  await expect(page.getByRole('img',{name:'Planta 2D de Novo deck'})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('F6.6 — deck externo em cenário vazio, acessórios, histórico e tarefas',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Deck no quintal');
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Cenários 2D/3D'}).click();
  await page.getByRole('button',{name:'Criar cenário'}).click();
  const create=page.getByRole('dialog',{name:'Criar cenário'});
  await create.getByLabel('Nome da proposta *').fill('Deck de madeira');
  await create.getByLabel('Começar uma proposta em branco').check();
  await create.getByRole('button',{name:'Criar proposta'}).click();
  await page.getByRole('tab',{name:'Áreas externas'}).click();
  await page.getByRole('button',{name:'Nova área externa'}).click();
  await page.getByRole('button',{name:'Formato L'}).click();
  await page.getByLabel('Nível do piso (m)').fill('0.35');
  await page.getByLabel('Acabamento visual').selectOption('cinza');
  await page.getByRole('checkbox',{name:'Borda 1'}).check();
  await page.getByLabel('Degraus ilustrativos na borda').selectOption('2');
  await page.getByRole('button',{name:'Salvar área externa'}).click();
  await expect.poll(()=>state.data.scenarios?.[0]?.outdoorAreas?.[0]?.outline?.length).toBe(6);
  expect(state.data.scenarios[0].outdoorAreas[0]).toMatchObject({level:.35,finish:'cinza',railingEdges:[0],stepsEdge:2});
  expect(state.data.scenarios[0].rooms).toHaveLength(0);
  expect(state.data.rooms).toHaveLength(1);
  await expect(page.getByRole('img',{name:'Planta 2D da área externa Deck planejado'})).toBeVisible();
  await expect(page.getByText(/9,76 m²/)).toBeVisible();
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Nome').fill('Deck revisado');
  await page.getByRole('button',{name:'Salvar área externa'}).click();
  await expect.poll(()=>state.data.scenarios?.[0]?.outdoorAreas?.[0]?.name).toBe('Deck revisado');
  await expect(page.getByRole('heading',{name:'Histórico de versões'})).toBeVisible();
  await page.getByRole('button',{name:'Gerenciar tarefas'}).click();
  await expect(page.getByRole('heading',{name:'Tarefas e serviços'})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('F6.5 — móveis planejados no 3D com editor, cores, dimensões e versões',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Sala mobiliada');
  await project.getByRole('checkbox',{name:'Sala de teste'}).check();
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Cenários 2D/3D'}).click();
  await page.getByRole('button',{name:'Criar cenário'}).click();
  const dialog=page.getByRole('dialog',{name:'Criar cenário'});
  await dialog.getByLabel('Nome da proposta *').fill('Interiores opção A');
  await dialog.getByRole('button',{name:'Criar proposta'}).click();
  await page.getByRole('tab',{name:'Interiores 3D'}).click();
  await expect(page.getByRole('heading',{name:'Editor de interiores'})).toBeVisible();
  await expect(page.getByRole('img',{name:/Planta editável dos móveis de Sala de teste/})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar sofá'}).click();
  await expect(page.getByLabel('Nome do móvel')).toHaveValue('Sofá');
  await expect.poll(()=>state.data.scenarios?.[0]?.furniture?.length).toBe(1);
  const originalId=state.data.scenarios[0].furniture[0].id;
  const beforeDrag=state.data.scenarios[0].furniture[0].x;
  const shape=page.locator('.interior-floor-object').first();
  const bounds=await shape.boundingBox();
  if(!bounds)throw new Error('O móvel precisa estar visível na planta 2D');
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+18,bounds.y+bounds.height/2,{steps:6});
  await page.mouse.up();
  await expect.poll(()=>state.data.scenarios?.[0]?.furniture?.[0]?.x).not.toBe(beforeDrag);
  await page.getByLabel('Nome do móvel').fill('Sofá novo');
  await page.getByLabel('Posição X (m)').fill('1.4');
  await page.getByLabel('Largura (m)').fill('1.8');
  await page.getByLabel('Rotação (°)').fill('90');
  await page.getByLabel('Acabamento').selectOption('madeira');
  await page.getByRole('button',{name:'Salvar móvel'}).click();
  await expect.poll(()=>state.data.scenarios?.[0]?.furniture?.[0]?.name).toBe('Sofá novo');
  expect(state.data.scenarios[0].furniture[0]).toMatchObject({id:originalId,x:1.4,width:1.8,rotation:90,color:'madeira'});
  expect(state.data.rooms[0]).toMatchObject({name:'Sala de teste',width:4.5,length:3.2});
  await page.locator('.interior-editor').getByRole('button',{name:'Duplicar',exact:true}).click();
  await expect.poll(()=>state.data.scenarios[0].furniture.length).toBe(2);
  expect(state.data.scenarios[0].furniture[1]).toMatchObject({width:1.8,rotation:90,color:'madeira'});
  await page.getByRole('tab',{name:'Antes e depois'}).click();
  await expect(page.getByRole('img',{name:'Planta 2D de Interiores opção A'})).toBeVisible();
  expect(state.data.rooms[0].width).toBe(4.5);
  await page.getByRole('tab',{name:'Interiores 3D'}).click();
  await expect(page.getByRole('button',{name:'Sofá novo',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sofá novo',exact:true}).click();
  await page.getByRole('button',{name:'Girar 90 graus'}).click();
  await page.getByRole('button',{name:'Salvar móvel'}).click();
  await expect.poll(()=>state.data.scenarios[0].furniture.find(f=>f.id===originalId)?.rotation).toBe(180);
  await page.getByRole('tab',{name:'Vista 3D'}).click();
  await expect(page.getByRole('heading',{name:'Histórico de versões'})).toBeVisible();
  expect(state.data.scenarios[0].revisions.length).toBeGreaterThanOrEqual(3);
  await navigate(page,'Obras');
  await expect(page.getByRole('combobox',{name:'Cômodo',exact:true})).toHaveValue('room-sala');
});

test('F6.5 — objeto não cabe no cômodo e projeto arquivado preserva os móveis',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const p=page.getByRole('dialog',{name:'Novo projeto'});
  await p.getByLabel('Nome do projeto *').fill('Quarto planejado');
  await p.getByRole('checkbox',{name:'Sala de teste'}).check();
  await p.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Cenários 2D/3D'}).click();
  await page.getByRole('button',{name:'Criar cenário'}).click();
  await page.getByRole('dialog',{name:'Criar cenário'}).getByRole('button',{name:'Criar proposta'}).click();
  await page.getByRole('tab',{name:'Interiores 3D'}).click();
  await page.getByRole('button',{name:'Adicionar cadeira'}).click();
  await expect.poll(()=>state.data.scenarios?.[0]?.furniture?.length).toBe(1);
  await page.getByLabel('Posição X (m)').fill('99');
  await page.getByRole('button',{name:'Salvar móvel'}).click();
  await expect(page.getByRole('alert').getByText(/ultrapassa o contorno/)).toBeVisible();
  expect(state.data.scenarios[0].furniture[0].x).not.toBe(99);
  await page.getByLabel('Posição X (m)').fill('2');
  await page.getByRole('button',{name:'Salvar móvel'}).click();
  await expect.poll(()=>state.data.scenarios[0].furniture[0].x).toBe(2);
  await page.getByRole('button',{name:'Arquivar projeto'}).click();
  await expect(page.getByRole('button',{name:'Adicionar cadeira'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Salvar móvel'})).toBeDisabled();
  await page.getByRole('button',{name:'Reativar projeto'}).click();
  await expect(page.getByRole('button',{name:'Adicionar cadeira'})).toBeEnabled();
  expect(state.data.rooms).toHaveLength(1);
});

test('F6.7 — agenda, fases e custos de projeto sem precisar abrir o 3D',async ({page})=>{
  const state=await setupMockSession(page);
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Reforma guiada');
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('button',{name:'Nova tarefa'}).click();
  const task=page.getByRole('dialog',{name:'Nova tarefa'});
  await task.getByLabel('Nome da tarefa *').fill('Preparar o acabamento');
  await task.getByLabel('Etapa do projeto (opcional)').fill('Acabamento');
  await task.getByLabel('Prazo previsto (opcional)').fill('2026-11-22');
  await task.getByRole('button',{name:'Salvar tarefa'}).click();
  await expect.poll(()=>state.data.workTasks?.[0]?.phase).toBe('Acabamento');
  await page.getByRole('tab',{name:'Compras e orçamento'}).click();
  await page.getByRole('button',{name:'Adicionar compra'}).click();
  const buy=page.getByRole('dialog',{name:'Adicionar compra ao projeto'});
  await buy.getByLabel('Nome do item *').fill('Tinta para acabamento');
  await buy.getByLabel('Preço unitário (R$)').fill('80');
  await buy.getByLabel('Quantidade').fill('2');
  await buy.getByLabel('Tarefa relacionada (opcional)').selectOption({label:'Preparar o acabamento'});
  await buy.getByRole('button',{name:'Salvar item'}).click();
  await page.getByRole('tab',{name:'Acompanhamento'}).click();
  await expect(page.getByRole('heading',{name:'Acompanhamento do projeto'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Agenda e prioridades'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Orçamento por etapa'})).toBeVisible();
  await expect(page.getByRole('row',{name:/Acabamento/})).toContainText('R$ 160,00');
  await page.getByLabel('Exibir pendências').selectOption('semana');
  await expect(page.getByRole('region',{name:'Agenda de atividades'}).getByText('Preparar o acabamento')).toBeVisible();
  await expect(page.getByText('Prazo: 22/11/2026')).toBeVisible();
  await page.getByRole('button',{name:'Concluir'}).click();
  await expect.poll(()=>state.data.workTasks?.[0]?.status).toBe('concluido');
  await expect(page.getByRole('progressbar',{name:'Progresso do projeto'})).toHaveAttribute('aria-valuenow','100');
  await expect(page.getByText('Situação: Concluído')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('F6.7 — anexo privado com upload e exclusão sem link público',async ({page})=>{
  const state=await setupMockSession(page);
  const storageCalls:{method:string;url:string}[]=[];
  await page.route('**/storage/v1/object/**',async route=>{
    const request=route.request();
    storageCalls.push({method:request.method(),url:request.url()});
    const headers={'content-type':'application/json','access-control-allow-origin':'*',
      'access-control-allow-headers':'authorization,apikey,content-type,x-client-info'};
    if(request.method()==='POST'){
      await route.fulfill({status:200,headers,body:JSON.stringify({Key:'ok',Id:'ok'})});
    }else if(request.method()==='DELETE'){
      await route.fulfill({status:200,headers,body:'[]'});
    }else if(request.method()==='GET'){
      await route.fulfill({status:200,headers:{'content-type':'application/pdf','access-control-allow-origin':'*'},body:'arquivo teste'});
    }else await route.fulfill({status:404,headers,body:'{}'});
  });
  await navigate(page,'Projetos');
  await page.getByRole('button',{name:'Novo projeto'}).click();
  const project=page.getByRole('dialog',{name:'Novo projeto'});
  await project.getByLabel('Nome do projeto *').fill('Reforma com documentos');
  await project.getByRole('button',{name:'Salvar projeto'}).click();
  await page.getByRole('tab',{name:'Arquivos'}).click();
  await expect(page.getByRole('heading',{name:'Arquivos privados'})).toBeVisible();
  await page.getByLabel('Escolher arquivo do projeto').setInputFiles({
    name:'planta.pdf',mimeType:'application/pdf',buffer:Buffer.from('arquivo privado de teste'),
  });
  await expect.poll(()=>state.data.projectFiles?.length).toBe(1);
  expect(state.data.projectFiles?.[0]?.path).toContain('/'+state.data.projects[0].id+'/');
  expect(storageCalls.some(call=>call.method==='POST'&&call.url.includes('myhouse-project-files'))).toBe(true);
  await expect(page.getByText('planta.pdf')).toBeVisible();
  await expect(page.locator('a[href*="/storage/v1/object/public/"]')).toHaveCount(0);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Excluir arquivo planta.pdf'}).click();
  await expect.poll(()=>state.data.projectFiles?.length).toBe(0);
  expect(storageCalls.some(call=>call.method==='DELETE')).toBe(true);
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
  for (const area of ['Lista de compras','Obras','Editar planta 2D','Projetos']) {
    await navigate(page, area);
    const violations = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(violations.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
  }
});

test('telas móveis não criam rolagem horizontal', async ({ page, isMobile }) => {
  if (!isMobile) test.skip();
  await setupMockSession(page);
  for (const route of ['Obras', 'Editar planta 2D', 'Escanear cômodo', 'Projetos']) {
    await navigate(page, route);
    const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
  }
});
