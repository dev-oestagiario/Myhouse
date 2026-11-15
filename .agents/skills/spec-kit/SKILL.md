---
name: spec-kit
description: "Usar o GitHub Spec Kit no LibrasEdu para desenvolvimento orientado por especificações (Constitution, Specify, Clarify, Plan, Tasks, Analyze, Implement e Converge), com rastreabilidade RF/RNF, aprovação de etapas e integração segura à CLI oficial."
---

# GitHub Spec Kit — integração do LibrasEdu

**Fonte oficial:** https://github.com/github/spec-kit
**Documentação:** https://github.github.io/spec-kit/
**Licença do projeto upstream:** MIT — ver `docs/skills/licenses/github-spec-kit-MIT.txt`.
**Tipo:** skill adaptadora original de processos, baseada na documentação pública do projeto; **não** é uma cópia da CLI, uma instalação do Spec Kit ou uma skill distribuída oficialmente pelo GitHub.

## Quando usar

- Preparar/revisar a Constituição de Engenharia;
- Criar especificações, esclarecer requisitos, avaliar viabilidade, planejar funcionalidades;
- Quebrar etapas em tarefas com testes e critérios de aceite;
- Implementar um incremento **autorizado** e verificar lacunas;
- Analisar bugs em vez de aplicar alterações sem causa comprovada.

## Regras do LibrasEdu: leia ANTES de começar

1. Ler `.specify/memory/constitution.md`: a Constituição foi **RATIFICADA v2.0.0 em 2026-11-12**. Não modificar princípios ou versões silenciosamente; emendas exigem nova aprovação expressa.
2. Ler `AGENTS.md`, `docs/governance/constitution-adoption-plan.md` e `docs/requirements/requirements-traceability.md`.
3. Preservar as 10 etapas do Documento Mestre, seus 28 RF, 12 RNF e o **RF29 Mobile da emenda v2.0.0**. O marco 8M Mobile complementa as etapas e possui gate próprio. Toda tarefa deve referenciar requisitos pertinentes.
4. A Etapa 1 (ambiente e estrutura) tem **Specify** em `specs/001-preparacao-ambiente/spec.md`, **Plan** em `specs/001-preparacao-ambiente/plan.md` e **Tasks** em `specs/001-preparacao-ambiente/tasks.md` (20 executadas com evidências documentais/CI e 9 pendentes). **Analyze documental realizado**, com correções A01–A10 em `specs/001-preparacao-ambiente/checklists/analyze-remediation.md`; **Implement está em andamento**, mas [Converge técnico](../../../specs/001-preparacao-ambiente/converge.md) foi iniciado e apontou BLOQUEIOS; o aceite depende de evidências Windows de 8 GB e decisão humana, não podendo liberar Etapa 2. Não presumir Converge ou funcionamento real do Windows; não implementar fala, tradução, OCR ou avatar antecipadamente.
5. Em toda especificação registrar: acessibilidade de pessoas surdas, diferença entre legenda e Libras, avaliação linguística humana, privacidade de voz/dados, requisitos de Windows/8 GB de RAM e estados de falha.
6. Não anunciar animações experimentais como tradução validada. Não depender do avatar para exibir legendas.
7. Não executar `specify init --here --force` automaticamente: em repositório existente pode **sobrescrever arquivos gerenciados**, inclusive dentro de `.specify/`.
8. Nenhum trabalho será marcado como finalizado sem testes efetivamente executados, evidências e **Converge** com decisão do responsável. Mocks são somente recursos identificados de prova de conceito.

## Processo SDD

| Passo | Objetivo | Evidência mínima |
| --- | --- | --- |
| Constitution | Definir princípios e gates do projeto | Constituição versionada; ratificação separada |
| Specify | Definir problema, atores, comportamento e RF/RNF | `spec.md` com cenários e limites |
| Clarify | Resolver dúvidas que alteram comportamento | Respostas/decisões documentadas |
| Plan | Definir arquitetura, stack, contratos, testes e riscos | `plan.md`, ADRs aplicáveis |
| Tasks | Decompor por dependência e incremento testável | `tasks.md` com IDs e referências |
| Analyze | Verificar consistência entre specs/plano/tarefas | Relatório de lacunas e correções |
| Implement | Implementar somente tarefas aprovadas da etapa atual | Código, testes e documentação |
| Converge | Comparar entrega com os critérios e identificar pendências | Evidência, status e decisão de aceite |

O fluxo é **incremental**. Se Converge apontar lacunas, corrigir e executar Converge de novo; um arquivo gerado não é prova de funcionalidade pronta.

## Invocação oficial e condições

O GitHub Spec Kit disponibiliza a ferramenta **Specify CLI** (`specify`), instalada separadamente. Quando instalada em um projeto com integração de agente, os comandos/skills gerados dependem do agente escolhido.

Exemplos **apenas após instalação e inicialização oficial**:

- No **Codex CLI**, skills em `.agents/skills/speckit-<comando>/SKILL.md` e invocação por `$speckit-specify`, `$speckit-plan`, `$speckit-tasks`, `$speckit-implement`, `$speckit-converge`.
- No **GitHub Copilot**, por padrão, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`.
- Outros agentes possuem sintaxe própria. Consulte a documentação oficial de integração.

**Não afirmar que esses comandos estão disponíveis agora.** Esta pasta fornece orientação para o agente, sem inicializar a CLI. O tutorial Windows e a proteção da Constituição estão em `docs/skills/spec-kit-setup.md`.

## Padrão de artefatos

Quando o workflow oficial estiver inicializado, usar a estrutura criada pela ferramenta, normalmente `specs/<id>-<slug>/spec.md`, `plan.md`, `tasks.md` e outros arquivos produzidos pelo processo. Os IDs devem permitir rastrear `RF/RNF → especificação → tarefa → teste → evidência`.

Uma solicitação como “implementar a Etapa 1” **não** autoriza implementar toda a plataforma. Planejar um único incremento reproduzível e respeitar o gate da etapa.

## Proteções de instalação e compatibilidade

- Criar branch e ter working tree limpo antes de aplicar o setup oficial ao repositório existente;
- Fazer backup da Constituição e dos demais arquivos da pasta `.specify`;
- Revisar o diff após inicialização; não aceitar sobrescritas de Constituição, AGENTS.md, catálogo ou skills existentes;
- Usar `specify check` e `specify integration status` quando disponíveis na versão instalada;
- Confirmar Python 3.11+, `uv`, Git e o agente escolhido; registrar versões e licença;
- Não instalar automaticamente extensões, bundles comunitários ou scripts externos sem inspeção.

## Referências upstream

- [Repositório](https://github.com/github/spec-kit)
- [Como adotar em projetos existentes](https://github.github.io/spec-kit/how-to/existing-projects.html)
- [Guia dos agentes](https://github.github.io/spec-kit/integrations/index.html)
- [Integração Codex](https://github.github.io/spec-kit/integrations/codex.html)
- [Fluxo de SDD](https://github.github.io/spec-kit/quickstart.html)
