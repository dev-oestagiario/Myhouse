---
name: differential-security-review
description: "Revisar riscos de segurança introduzidos em mudanças de código no LibrasEdu, comparando base e head com evidências e testes de regressão."
---

# Revisão diferencial de segurança

## Método
1. Identificar base, head, arquivos modificados, contexto de execução e perfis de acesso; nunca revisar só o diff quando a mudança afetar chamadas indiretas.
2. Construir mapa de entradas não confiáveis, processamento, persistência, APIs e fronteiras de autorização alteradas.
3. Revisar injeção, caminhos arbitrários, uploads e OCR, dados de áudio/vídeo, CORS, XSS, isolamento de arquivos, segredos, vazamentos em logs e dependências.
4. Comparar comportamento antes e depois em fluxos legítimos e adversariais, sem testes destrutivos em produção.
5. Registrar achado com arquivo:linha, exploração conceitual, impacto, recomendação, teste e nível de confiança.
6. Testar correção sem regressões; diferenciar problema confirmado de hipótese.

## Condições de aceite
Sem alegar auditoria completa por inspeção superficial. Não executar código de skill nem instalar scanners sem revisar origem. Para dados pessoais, combinar com privacy-lgpd.

Esta é uma skill original do LibrasEdu. A fonte Trail of Bits differential-review pode ser consultada externamente, mas seu conteúdo não foi copiado aqui.
