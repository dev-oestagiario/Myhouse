---
name: react-composition-patterns
description: "Projetar componentes React/TypeScript claros por composição, separando responsabilidades, estado, acessibilidade e testes."
---

# Composição React para LibrasEdu

## Quando usar
Componentes que acumulam props condicionais, múltiplas variantes, estado difícil de testar, layouts duplicados ou dependência excessiva de um componente gigante.

## Práticas
1. Projetar API pública com papéis claros e componentes pequenos e reutilizáveis.
2. Preferir composição declarativa a grande número de flags booleanas que criam combinações inválidas.
3. Distinguir componentes apresentacionais, hooks e adaptadores de efeitos externos.
4. Colocar estado no nível de propriedade necessário; evitar contextos globais para valores muito locais.
5. Preservar acessibilidade: semântica HTML, foco, labels, teclado e estados explícitos de erro.
6. Testar variantes relevantes, carregamento/cancelamento e responsividade.
7. Em player de Libras, manter controles (pausa, legenda, velocidade) independentes da implementação do renderizador.

Inspiração geral: documentação pública de padrões de composição React e catálogo vercel-labs/agent-skills; texto original do LibrasEdu.
