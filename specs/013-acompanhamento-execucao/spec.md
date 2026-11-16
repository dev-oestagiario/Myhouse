# F6.7 — Specify: execução e acompanhamento

Base: F6.6 integrada na develop. Estado: desenvolvimento em PR (não release).

## Requisitos
- RF06/RF13: Acompanhamento com agenda de pendências (atrasadas, próximos 7/30 dias e sem prazo), ordenada por prioridade e datas em America/Sao_Paulo.
- RF08: relatório por etapa livre, valores previstos e gastos confirmados em centavos. Não duplicar compra ligada a tarefa; orçamento separado da contingência.
- RF05/RF06: tarefas e compras com etapa opcional de até 80 caracteres.
- RF12/RF14: anexos privados do projeto ou tarefa, CRUD com formatos PDF/JPG/PNG/WebP/TXT até 8 MiB, no máximo 30 por projeto.
- RNF01: bucket não público com políticas RLS por usuário e projeto; o JSON conserva apenas metadados, sem bytes.
- RNF02/RNF03: acompanhamento acessível sem 3D, responsivo.
- RNF04: backups V2 anteriores sem fases e anexos continuam compatíveis.

## Exclusões e gates
Sem calendário externo, colaboração, previsão de custo com IA, auditoria imutável ou arquivos embutidos no JSON.
Não aplicar SQL em produção nem publicar APK antes de gates do F6.8, migração V2 e testes de 2 contas.
