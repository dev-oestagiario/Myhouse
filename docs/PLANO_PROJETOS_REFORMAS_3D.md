# My House — Plano de evolução: mudanças, reformas e projetos de espaços

**Status:** PROPOSTA PARA REVISÃO (não implementada).  
**Data:** 16/11/2026.  
**Base verificada:** main 7fb66484000bd8f74ef76f4ca4d4774ebb67cdcb (F5).  
**Processo:** Constituição -> Specify -> Clarify -> Plan -> Tasks -> Analyze -> Implement -> Converge (referência metodológica do Spec Kit, sem instalar CLI).  
**Regra de entrega:** a criação deste documento não deve compilar APK nem alterar o comportamento atual. Futuras features serão entregues por PRs testáveis; publicar APK somente quando uma versão acordada estiver estável.

## 1. Visão e proposta de produto

O My House evolui de um registro de cômodos, compras e etapas de parede para um **ambiente integrado de planejamento da casa**. O usuário pode mudar de residência, reformar uma sala, decorar um quarto, planejar uma varanda ou criar um deck externo. Cada projeto relaciona: objetivo, situação atual, cenário planejado, serviços e materiais, compras, orçamento, prazos, arquivos e progresso, sem confundir o que se deseja construir com o que já existe.

### Três perguntas que toda tela deve responder

1. **Como é hoje?** Planta e itens reais da residência, problemas existentes e histórico.
2. **Como quero que fique?** Cenário futuro independente, com desenho 2D/3D e disposição dos objetos.
3. **O que falta para chegar lá?** Tarefas, compras, custos, responsáveis (opcional), etapas e pendências.

O 3D **não substitui** a gestão da reforma: é uma visualização conectada a projetos, tarefas e compras, com alternativa 2D/lista. O app **não é CAD, projeto estrutural ou orçamento técnico de engenharia**.

## 2. Diagnóstico fundamentado no repositório

| Capacidade atual | Evidência na main | Lacuna para a visão solicitada |
| --- | --- | --- |
| Cômodos com medidas, polígonos, portas e janelas | src/types.ts: Room; src/plan/geometry.ts; PlanEditor.tsx | Não há estados distintos atual x planejado, pisos/níveis, área externa nem modelagem de móveis |
| Renderização 3D | src/plan/HouseModel.tsx com Canvas, RoomFloor, RoomBoundary, OrbitControls | O usuário seleciona paredes, mas não posiciona móveis/objetos nem edita volumetria diretamente |
| Compras livres | Purchase em src/types.ts, CRUD em App.tsx | Não vinculam projeto/tarefa, não distinguem estimativa x preço real, não agregam múltiplos orçamentos |
| Obras | WorkLog/WallStages; estágios fixos Raspagem/Reparo/Lixamento/Preparação/Pintura | Não modelam tarefas livres para deck, mudança, montagem, instalação, decoração; não há responsável, dependências ou cronograma |
| Visão geral | Indicadores de compra e conclusão por parede | Falta painel por projeto, custo total, itens/serviços pendentes, previsão e próximos passos |
| Dados e segurança | user_homes JSONB e RLS por usuário; HomeData versão 1; backup JSON | Não há entidade Projeto nem cenários; risco de documentos grandes e sobrescrita por edições concorrentes |
| Escaneamento F5 | ARCore opcional e câmera comum com referência/contorno assistido | Mapeamento automático completo e precisão métrica não existem; não devem ser anunciados |

O arquivo docs/PRODUCT_ROADMAP.md é genérico e anterior às funcionalidades F3–F5: este documento propõe a próxima evolução, não substitui automaticamente os compromissos já assumidos.

## 3. Constituição de produto (proposta)

- **Projetos primeiro:** tarefas, compras, cenas 3D e arquivos associados a um projeto, mas também permitir compras e manutenção independentes.
- **Atual ≠ Planejado:** nunca substituir a planta real apenas por experimentar uma ideia. Cenários podem ser descartados, comparados e aprovados explicitamente.
- **Uma única fonte para geometria:** planta 2D e dados dimensionais alimentam a projeção 3D; alterações sincronizam, com Undo/Redo e transações claras.
- **Sem dependência do 3D:** o mesmo conteúdo é editável por listas, campos e vista 2D, incluindo em aparelhos de menor desempenho.
- **Dados retrocompatíveis:** backups v1 precisam continuar importáveis; Supabase/RLS e rascunhos não devem perder dados ao migrar.
- **Planejamento responsável:** preços são estimativas informadas, simulações de estruturas não equivalem a análise de segurança; registros privados por padrão.
- **Operação rápida:** adicionar tarefa/compra a um projeto em poucos passos, com estados vazios e carregamento visíveis, sem formulários longos.

## 4. Jornadas prioritárias

### J1. Reforma da sala

1. Abrir a residência e criar **Projeto: Renovar a sala**, marcando cômodo e prioridade.
2. Duplicar o estado atual para um cenário **Sala renovada**, sem alterar a planta existente.
3. Na cena, reposicionar sofá, mesa e TV, mudar cores/acabamentos e conferir medidas.
4. Adicionar serviços livres (pintar parede, retirar revestimento, instalar luminárias), com checklist, sequência e previsão.
5. Adicionar materiais/móveis necessários à lista do projeto: quantidade, unidade, preço estimado, prioridade, links e notas.
6. O orçamento agrega produtos + serviços + reserva de contingência, distinguindo previsto de gasto confirmado.
7. Marcar uma compra e uma tarefa como concluídas; a visão geral do projeto atualiza progresso e gastos.
8. Aprovar o cenário, mantendo revisão histórica da versão anterior; não substituir a situação real antes de aplicar a mudança explicitamente.

### J2. Construção de deck externo

1. Criar Projeto: **Deck no quintal** (sem exigir cômodo existente).
2. Definir **espaço externo planejado**, contorno, largura, profundidade e diferença de nível.
3. Configurar representação paramétrica simples de plataforma, pisos, guarda-corpo e degraus em 2D/3D.
4. Organizar serviços: preparação, fornecimento de material, execução, acabamento, inspeção — todos editáveis, sem sequência obrigatória.
5. Registrar tábuas, suportes, ferragens e iluminação como necessidades de compra, sem sugerir dimensionamento estrutural seguro.
6. Comparar cenários simples de dimensões e acabamento e visualizar o orçamento de cada variante.
7. Salvar projeto para retomar depois, mesmo sem executar nenhuma compra.

### J3. Mudança de casa

1. Criar um plano de mudança com origem/destino (quando houver mais de uma residência; no MVP, destino e localização livre).
2. Listar objetos para levar, comprar, vender/doar ou instalar; associar ao cômodo de destino e a caixas opcionais.
3. Criar tarefas de embalagem, transporte, montagem, reparos e serviços contratados.
4. Ver pendências, prioridade, datas e custos; não exigir abrir o editor 3D.

### J4. Planejamento rápido

Adicionar uma ideia (ex.: trocar armários) sem medidas nem 3D. Depois, evoluir a ideia em projeto com tarefas, compras e cenários, preservando o histórico.

## 5. Arquitetura funcional proposta

### 5.1 Entidades (contratos conceituais, sujeitos a Specify)

- **Residence:** id, nome, tipo (atual/destino/futura), cômodos/espaços. Na primeira migração, a conta atual vira residência padrão sem perder IDs.
- **Space:** id, residenceId, nome, tipo (interno/externo), geometria, nível/elevacão, situação (existente/planejado). O Room legado permanece compatível ou é adaptado por migração explícita.
- **Project:** id, residenceId, nome, descrição, tipo (mudança/reforma/decoração/ampliação/manutenção/outro), status (ideia/planejando/aprovado/em execução/pausado/concluído/cancelado), prioridade, orçamento-alvo, datas, criadoEm, atualizadoEm.
- **ProjectScope:** projetoId -> espaços afetados, podendo ser múltiplos; aceita projeto externo sem cômodo existente.
- **WorkTask:** id, projectId opcional, spaceId opcional, título, descrição, status, prioridade, data prevista, checklist, ordem, dependências, custo estimado/real, referência de parede/objeto opcional, histórico.
- **PurchaseNeed:** id, projectId opcional, taskId opcional, spaceId opcional, item, categoria livre, unidade, quantidade, preço estimado, preço real, status (preciso/pesquisando/orçado/comprado/recebido/instalado/cancelado), link, fornecedor opcional.
- **ProjectScenario:** id, projectId, nome, estado (rascunho/aprovado/arquivado), versão, cópia de geometria e objetos do espaço; comparável com estado atual. **Jamais** guardar apenas referências mutáveis à planta atual.
- **PlacedObject:** id, scenarioId, spaceId, tipo/modelo, medidas reais em metros, posição x/y/z, rotação, cor/material, estado (existente/a comprar/a instalar/remover), PurchaseNeed/WorkTask opcionais; renderização usa modelo paramétrico antes de GLB.
- **Quote/Expense:** fornecedor opcional, valores estimados/reais, data, vínculos a tarefa/produto, origem e comprovantes como metadados privados.
- **Attachment/Activity:** autorização, vínculo com projeto/tarefa/objeto, arquivo, notas e eventos de alteração; upload só após política de Storage, RLS e retenção.

Regras de integridade: IDs estáveis, referências válidas, não duplicar a mesma compra dentro de duas listas; compras globais podem ser filtradas por projeto; excluir projeto exige ação explícita sobre tarefas/compras anexadas; arquivar não apaga registros. Moeda BRL com cálculos em centavos para valores persistidos, unitários e totais coerentes; quantidades e unidades explicitadas.

### 5.2 Persistência e migração

**Estado atual:** HomeData version 1 em public.user_homes.data (JSONB); database/schema.sql restringe data->>'version' = '1'. Portanto, **não** simplesmente alterar o front-end para version 2.

1. Criar contrato/versionador e testes de migração v1 -> v2; imóveis e compras antigas tornam-se registros da residência padrão; WorkLog por parede é preservado como histórico legado.
2. Fazer migration SQL reversível, backup e rollback. Alterar constraint do Supabase explicitamente em deploy controlado, nunca apagar dados de produção.
3. Manter importação de backup v1, exportação v2 e compatibilidade para cômodos antigos sem footprint.
4. Inicialmente manter snapshot JSONB para permitir evolução segura e simples, mas extrair camada de domínio e repositório, separada da interface. Desenhar estratégia de sincronização por revisões já existente, com detecção de conflito ao editar de dois aparelhos.
5. Migrar anexos para bucket privado + metadados separados e RLS; se aumentar volume, avaliar normalização por entidade (projects, tasks, purchases, scenarios), com migração faseada e índices por projeto/usuário, **sem mudança prematura de stack**.
6. Se mais residências e convites compartilhados forem implementados, criar políticas de membros e permissões no banco. A RLS atual é por usuário; não presumir compartilhamento já existente.

### 5.3 Organização React/Three.js

- Migrar gradualmente a App.tsx monolítica para módulos features/projects, features/tasks, features/purchases, features/scenarios, features/designer e shared/ui.
- Preservar React/TypeScript, Three.js, React Three Fiber/Drei, Capacitor e Supabase atuais; adicionar dependências apenas por ADR e após checagem de versões/licenças.
- Cena 3D dirigida por dados, componentes de sala, espaço externo e objeto separados; modos **visualizar**, **selecionar**, **mover**, **girar**, **dimensionar** e **medir**, com ações equivalentes via painel de propriedades.
- Seleção de objetos por toque, foco de item, grade configurável, snapping, alinhamento, indicação de obstruções, Undo/Redo, múltipla seleção opcional; apenas alertar sobre colisões, não bloquear experimentação por padrão.
- O catálogo inicial não depende de download de móveis: objetos paramétricos leves (sofá, mesa, cadeira, cama, armário, bancada, eletrodoméstico, tapete, luminária, deck). Biblioteca GLB/glTF licenciada e importação de modelos externos ficam para etapa posterior.
- Geometria externa e plataformas com diferença de nível exigem nova representação espacial. Evitar estender arbitrariamente Room como se toda superfície fosse parede de um cômodo interno.
- Otimização móvel: geometria reutilizada, instâncias, carregamento sob demanda, renderização econômica quando ocioso, limite de objetos/triângulos testado e opção de editor 2D quando WebGL falhar.

### 5.4 Interface proposta

**Navegação primária:** Início · Projetos · Ambientes · Compras · Agenda; "Planta 2D/3D" acessível pelo contexto de cada ambiente/projeto. "Histórico", "Configurações", "Backup" e "Sair" como ações secundárias.

**Tela de Projeto:** topo com nome, etapa, locais, prioridade, orçamento e ação "Abrir planejamento". Abas: **Resumo**, **Planejamento 2D/3D**, **Tarefas**, **Compras/Orçamento**, **Arquivos e histórico**. Uma única fonte de dados: abas são visões, não cadastros duplicados.

**Editor de cenários:** no desktop, lista de ambientes/objetos à esquerda, canvas central, propriedades à direita, barra de ferramentas compacta e alternância 2D/3D; em mobile, tela de projeto primeiro, canvas em área ampla, catálogo e propriedades em drawers inferiores e controles de toque grandes. Evitar congestionamento de botões.

**Resumo:** "O que quero mudar", "Quanto falta gastar", "Próximas ações", "Compras pendentes", "Cenário atual x planejado". Visual minimalista com azul atual da F5 e estados semânticos.

### 5.5 Fluxos e estados essenciais

- Criar projeto -> salvar ideia -> adicionar ambientes -> construir cenário -> decompor tarefas -> gerar/completar lista de compras -> acompanhar execução -> arquivar projeto.
- Antes/depois: comparação por alternância e, depois, layout lado a lado. "Aprovar cenário" **não altera** automaticamente a planta oficial.
- Tarefas podem existir sem projeto ou sem cômodo; compras podem existir sem tarefa; projeto pode existir sem 3D.
- Ao remover um cômodo ou trocar geometria, mostrar referências que seriam afetadas e escolher remapear, desvincular ou cancelar, sem exclusão silenciosa.
- Indicar ausência de conexão, última sincronização, rascunhos e conflitos; nunca dar feedback de "salvo" antes da confirmação real.

## 6. Fases e entregáveis (proposta de implementação)

Cada fase deve ter PRs pequenos, testes e documentação de aceite. Fases podem ser divididas em PRs, mas cada PR precisa compilar e não deixar dados incompatíveis.

| Fase | Entrega principal | Prioridade | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| **F6.0 — Fundação de dados** | Contratos, migrações v1/v2, Residence/Space/Project, isolamento de camada de dados | P0 | Nenhuma | Importa backup v1 sem perda, cria projeto sem alterar o funcionamento legado, Supabase/RLS passa em testes |
| **F6.1 — Projetos** | CRUD de projeto, lista/status/filtros, ideia -> execução, vínculos opcionais a ambientes | P0 | F6.0 | Criar "Renovar sala" ou "Deck" sem plantas; editar/arquivar/reativar com histórico e zero perda |
| **F6.2 — Obras e tarefas** | WorkTask livre, checklists, prioridades, prazos, quadro por status e eventos | P0 | F6.1 | Projeto com serviços diversos; marcar tarefas altera progresso; registros antigos de paredes continuam acessíveis |
| **F6.3 — Compras e orçamento** | Relação projeto/tarefa, unidades, valores previstos/reais, categorias livres, cotações básicas, contingência | P0 | F6.1–F6.2 | Uma compra em projeto aparece na lista global; previsto/real corretos e total recalculado |
| **F6.4 — Cenários e editor espacial** | Clonar situação atual -> cenário, versões e comparação; controles 2D/3D com Undo/Redo | P0/P1 | F6.0–F6.1 | Experimentar mudanças na sala sem alterar cômodo real; descartar/recuperar; aprovar sem publicar automaticamente |
| **F6.5 — Planejador de interiores** | Catálogo paramétrico, inserir/mover/girar/dimensionar móveis e acabamentos, ligação a compras | P1 | F6.4 | Arrastar sofá e mesa, editar dimensões por teclado, manter dados ao reabrir, mostrar possíveis colisões |
| **F6.6 — Espaços externos** | Espaço externo com polígono e nível, deck paramétrico, acessórios e lista de atividades | P1 | F6.4–F6.5 | Criar cenário Deck no quintal sem "cômodo interno", estimar área e organizar compras/tarefas |
| **F6.7 — Execução e acompanhamento** | Agenda, prioridades, orçamento por fase, arquivos privados, histórico, relatórios simples | P1 | F6.2–F6.6 | Consultar pendências e gastos do projeto sem precisar abrir o 3D; anexos privados e acessíveis |
| **F6.8 — Qualidade e versão** | QA regressivo, performance, migração, mobile/Android, publicação de release única | P0 obrigatório | Todas da versão aprovada | Gates automáticos verdes, matriz de aparelhos registrada e APK disponibilizado apenas ao final do marco |

### Gate de implementação por fase

**Specify:** requisitos RF/RNF, telas, permissões, estados e exemplos.  
**Clarify:** decisões em aberto fechadas antes de código, especialmente múltiplos imóveis e compartilhamento.  
**Plan:** contratos de dados, interface, testes, migração e riscos.  
**Tasks:** pequenas tarefas verticais com IDs e PRs independentes, incluindo critérios de testes.  
**Analyze:** consistência, impacto em dados antigos e acesso via mobile.  
**Implement:** código + teste unitário + Playwright + verificação TypeScript.  
**Converge:** revisão comparativa com aceitação, sem chamar testes simulados de validação física.

## 7. Requisitos rastreáveis e cenários de aceite

### RF (funcionais)

- **RF01** Criar, visualizar, editar, arquivar e excluir projetos com confirmação e backup.
- **RF02** Permitir projeto sem cômodo definido e projeto vinculado a mais de um espaço.
- **RF03** Manter estado atual da residência separado dos cenários de projeto.
- **RF04** Criar múltiplos cenários/versionamentos por projeto e comparar antes/depois.
- **RF05** Criar tarefas de qualquer tipo e vincular a projeto, espaço, objeto ou parede opcionais.
- **RF06** Checklist, dependências simples, status, prioridades, prazos e histórico por tarefa.
- **RF07** Relacionar compras a projetos/tarefas sem duplicação e agregar lista geral.
- **RF08** Calcular orçamento previsto e gasto real por produto/serviço, com reserva e unidade correta.
- **RF09** Modelar e editar o contorno/posição de ambientes e áreas externas sem perder geometria original.
- **RF10** Inserir/editar objetos 3D dimensionados, manipuláveis também via painel 2D/textual.
- **RF11** Comparar e pré-visualizar projeto para sala, interior e deck externo.
- **RF12** Salvar, carregar, importar, exportar e migrar dados antigos com estabilidade e privacidade.
- **RF13** Painel e agenda de ações pendentes por projeto e visão global de projetos.
- **RF14** CRUD completo de projetos, tarefas, compras, cenários, itens e anexos quando habilitados.
- **RF15** Criar projeto apenas como ideia e completar informações posteriormente.

### RNF (não funcionais)

- **RNF01:** dados de residências/arquivos privados; Supabase RLS e consentimento para anexos; sem modelos 3D arbitrários executáveis.
- **RNF02:** acessibilidade teclado/toque/zoom/leitor de tela e alternativa 2D à manipulação 3D.
- **RNF03:** não exigir GPU para consultas, tarefas e compras; editor otimizado para Android intermediário.
- **RNF04:** migração idempotente de backup v1, recuperação offline e conflito de revisão sem sobrescrita silenciosa.
- **RNF05:** validação geométrica de pisos e objetos; valores estimados não tratados como medições estruturais.
- **RNF06:** CRUD previsível, estados de carregamento/erro/indisponibilidade e sincronização explícita.
- **RNF07:** preservar autonomia da pessoa: sem dependência de IA ou de plano pago para planejar um projeto.

### Testes prioritários de aceitação

- **CT01:** criar "Renovar sala" -> adicionar 3 tarefas -> registrar 2 produtos -> confirmar somatórios -> concluir uma tarefa sem afetar outras.
- **CT02:** criar "Deck" sem sala -> gerar área externa -> adicionar tarefas de execução e materiais -> reabrir e corrigir dimensões.
- **CT03:** duplicar planta para cenário, mover sofá e descartar -> planta real permanece idêntica; reabrir após login mantém cenário separado.
- **CT04:** dois cenários diferentes não trocam objetos ou custos; aprovado e rascunho coexistem.
- **CT05:** migrar backup v1 contendo sala em L, portas, compras, progresso de parede e logs -> dados antigos íntegros após exportação e importação v2.
- **CT06:** negar câmera / falhar WebGL / operar com teclado -> tarefas, compras e revisão 2D funcionam sem Canvas.
- **CT07:** desconectar e reconectar, editar no segundo aparelho -> conflito detectado com escolha consciente, sem sobrescrita silenciosa.
- **CT08:** tentar acessar dados de outra conta e anexos privados -> banco e storage negam acesso.
- **CT09:** reescalar um cômodo com móveis e aberturas -> verificar vínculos, possíveis colisões e escolha de remapeamento.
- **CT10:** testar 320, 390, 768, 1366 px e Android real; sem rolagem horizontal ou perda de controles relevantes.

## 8. Riscos e decisões a esclarecer

| Risco | Probabilidade / impacto | Mitigação |
| --- | --- | --- |
| Atualizar v1/v2 e constraint Supabase de modo incompatível | Alta / crítico | Migrations, backup, staging, rollback, testes de duas versões, sem wipe |
| Dados grandes no JSONB (cenas e histórico) e concorrência entre dispositivos | Média / alto | Repositório/migração progressiva, versionamento e política de conflito, assets separados |
| Editor 3D custoso e travado em celular | Alta / alto | Objetos paramétricos, instancing, limites de renderização, 2D completo, teste de hardware |
| Relação compras x tarefas com valores duplicados | Média / alto | IDs estáveis, vínculo único e cálculo de orçamento central |
| Dimensões de deck usadas para execução estrutural | Média / crítico | Aviso de planejamento ilustrativo, sem cálculo de carga/estrutura e revisão profissional quando necessário |
| Privacidade de fotos, planta e comprovantes | Média / alto | Storage privado, RLS, expiração de links e política de exclusão/retention |
| Crescimento de telas e complexidade de cadastro | Alta / médio | Jornadas rápidas, modais contextuais, abas com separação de responsabilidades, teste UX |

**Decisões para aprovação do responsável antes de implementar:**

1. Múltiplas residências na primeira entrega ou apenas um imóvel com preparação técnica para múltiplos? **Proposta:** preparar o modelo com Residence agora; apresentar interface multi-residência mais adiante.
2. Compartilhamento de projetos com familiares/profissionais na primeira versão? **Proposta:** não, manter RLS por usuário e projetar permissões para evolução posterior.
3. Catálogo 3D autoral paramétrico ou modelos prontos externos já no MVP? **Proposta:** começar com biblioteca leve paramétrica, mantendo suporte futuro a GLB/glTF e licenças revisadas.
4. A aprovação de um projeto altera automaticamente a planta real? **Proposta:** nunca; aplicar mudanças apenas por comando separado, com diff e reversão.
5. Automação/IA para listas de materiais e custos? **Proposta:** não é requisito; a primeira versão calcula apenas com dados informados pelo usuário.

## 9. Sequência recomendada de releases (não uma release por PR)

**Marco A — Planejar e executar:** F6.0 + F6.1 + F6.2 + F6.3. Resultado: projeto funcional com tarefas, compras, orçamento e progresso, mesmo sem nova edição 3D.  
**Marco B — Visualizar e desenhar:** F6.4 + F6.5. Resultado: cenários 2D/3D independentes e mobiliário dimensionado.  
**Marco C — Espaços externos e execução:** F6.6 + F6.7, com suporte a deck, arquivo/histórico e integração total.  
**Marco de qualidade:** F6.8 integra testes de cada entrega, matriz Android e único APK por marco aprovado.

A main tem workflow de build de APK a cada push. Para cumprir a política, desenvolver em branch própria (ou develop), abrir PRs em direção à branch de integração e mesclar na main **somente** quando o marco estiver pronto. Alterar o gatilho do workflow se a equipe desejar merges frequentes sem APK.

## 10. Fora de escopo do primeiro ciclo

- Reprodução fotorealista, física de iluminação ou geração automática por IA.
- Modelo BIM/CAD técnico, cálculo estrutural de deck, fundações, elétrica, hidráulica ou fiscalização de obras.
- Marketplace e compra/pagamento in-app.
- Colaboração em tempo real não implementada, calendário sincronizado com provedores externos, contratação de prestadores.
- Reconstrução 3D automática móvel completa com câmera sem ARCore, como se já estivesse pronta.

## 11. Critério de conclusão do roadmap

É possível criar projeto para sala ou espaço externo, guardar uma proposta sem alterar o imóvel atual, editar o 3D (ou 2D), relacionar tarefas e compras, estimar orçamento, acompanhar execução, reabrir a mesma proposta sem perda e exportar backup. Os cenários J1/J2/J3 e CT01–CT10 devem ter evidência adequada, com lacunas de hardware explicitamente declaradas. Nenhuma funcionalidade do presente documento está implementada pelo simples fato de a especificação existir.
