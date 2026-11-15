---
name: static-security-analysis
description: "Planejar e interpretar análise estática segura de código Python, TypeScript, React e serviços do LibrasEdu sem executar scripts de terceiros automaticamente."
---

# Análise estática e triagem

## Procedimento
1. Descobrir linguagens e frameworks usados de fato, regras do CI e escopo de arquivos gerados.
2. Selecionar scanners apropriados: Semgrep/CodeQL para análise de código; bandit para Python quando fizer sentido; audit de dependências somente com permissões e versões verificadas.
3. Registrar versões, comandos, regras, arquivos analisados e exclusões. Não executar automaticamente ferramentas externas nem alterar dependências como efeito colateral.
4. Priorizar riscos: segredos, autenticação/autorização, operações com sistema de arquivos, uploads, URLs remotas, XSS e retenção de dados de áudio/vídeo.
5. Triar falso positivo com contexto real. Propor teste que reproduza o risco antes de afirmar vulnerabilidade.
6. Reportar evidências por arquivo:linha e sugestões concretas; comparar varreduras antes/depois.

## Critérios de qualidade
Sem afirmar ausência de vulnerabilidades apenas por scanner limpo. Proteger tokens, áudios e dados pessoais nos logs e relatórios. Integrar com differential-security-review e privacy-lgpd.

Esta é uma skill original do LibrasEdu, não a cópia de um plugin de análise estática da Trail of Bits.
