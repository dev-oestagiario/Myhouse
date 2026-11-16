# F6.7 — Plan

1. Campos opcionais phase em ProjectTask/Purchase, projectFiles em HomeData V2 e validação na importação.
2. Funções puras para agenda, orçamento por etapa e agregação de eventos.
3. UI independente do Canvas: Acompanhamento, Arquivos, editores de tarefas/compras atualizados.
4. Anexos em Supabase Storage privado: pasta ownerId/projectId/fileUUID.ext, upload sem upsert, leitura com JWT, remoção controlada. Metadados em JSONB e aviso explícito sobre backups sem bytes.
5. Preparar SQL RLS aditivo; não executar em produção até compatibilidade HomeData V2, revisão de segurança, backup e prova entre contas.
6. QA Vitest, TypeScript/React, Playwright desktop/mobile. CI no PR para develop; sem main nem Android.

## Contratos
Compra com fase vazia vinculada a tarefa herda fase da tarefa. Reserva de contingência é exibida à parte e não duplicada por fase.
Mudanças de estado continuam usando as validações existentes; o histórico consolidado é informativo e não imutável.
