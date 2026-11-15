# My House — visão de produto e roadmap

## Público e proposta

Pessoas que se mudaram, estão se mudando ou querem organizar manutenção, compras, mobília e pequenos serviços domésticos. A interface deve ser autoexplicativa, com experiência rápida no celular.

## Fluxos principais do MVP
1. Criar ou editar uma casa com nome e cômodos.
2. Adicionar itens para comprar com categoria livre, cômodo opcional, preço estimado, quantidade e prioridade.
3. Marcar compras feitas e comparar orçamento previsto e realizado.
4. Criar serviços livres: pintar parede, reparar reboco, montar móvel, instalar prateleira, limpar, etc.
5. Associar tarefas a cômodos ou paredes, registrar andamento, data, observações e próxima ação.
6. Consultar a planta 3D, editar medidas e alternar para lista de paredes/tarefas.
7. Fazer backup/recuperação dos dados sem exigir internet.

## Próximas fases

**Fase 0 — fundação:** importar React original, testar build e dados, aplicar identidade escura/minimalista, definir design system e suporte Android; documentar decisões.

**Fase 1 — MVP público:** reformular onboarding, cadastrar casa/cômodos, tarefas de qualquer tipo, compras, filtros, categorias e prioridades, métricas, histórico, responsividade, acessibilidade e alternativa textual ao 3D. Testes E2E e validações de backup.

**Fase 2 — distribuição:** publicar site sob URL própria e oferecer APK de teste assinado adequadamente. Offline-first com migrações de dados e atualização sem perda de informações.

**Fase 3 — colaboração opcional:** contas, convites por residência, permissões, anexos/fotos, sincronização multi-dispositivo e auditoria; LGPD e controle de acesso antes de colocar dados reais em nuvem.

**Fase 4 — recursos avançados:** orçamento de serviços, compras compartilhadas, lembretes, fotos antes/depois, métricas por reforma e geometrias mais detalhadas.

## Qualidade

Priorizar navegação por teclado, foco/labels, boa legibilidade, áreas de toque, estados de erro, recuperação de dados, privacidade por padrão e testes em Android real. Não fazer estimativas técnicas de custos/área de paredes desconsiderando portas e janelas.
