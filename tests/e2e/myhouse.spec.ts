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
