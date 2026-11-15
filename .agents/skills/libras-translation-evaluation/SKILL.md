---
name: libras-translation-evaluation
description: "Planejar pipeline e testes de tradução para Libras, separando ASR, texto, interpretação semântica, glosa, animação e avaliação humana."
---

# Tradução e avaliação de Libras

## Fluxo sugerido
Entrada (fala ou texto) → transcrição revisável → compreensão/contexto → planejamento linguístico → representação sinalizada → revisão humana → publicação, com rastreabilidade em cada fase.

## Limites
- ASR/Faster-Whisper produz texto, não Libras.
- Glosas são representações de apoio e podem omitir gramática espacial e expressões não manuais.
- Avatar só deve ser rotulado como tradutor de Libras após verificação linguística documentada, não por executar animações.
- Tradutores humanos e membros da comunidade surda precisam participar das avaliações; consultas automatizadas não os substituem.

## Testes necessários
1. Termos ambíguos, números, nomes próprios e vocabulário técnico.
2. Negação, interrogativas, tempo, concordância e uso do espaço.
3. Fluidez entre sinais e movimentos não manuais sincronizados.
4. Tarefas de compreensão com avaliadores fluentes, respeitando consentimento.
5. Falhas de ASR, ausência de sinal cadastrado, conteúdo inseguro ou não suportado: indicar limitação e oferecer texto/legenda revisável.
6. Registrar versão de corpus, origem, licença, critérios, avaliadores e resultados medidos; nunca inventar métricas de fidelidade.
