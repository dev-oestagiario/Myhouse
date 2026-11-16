# F6.8 — Especificação da qualidade e publicação

## Requisitos de aceite
- Preservar todos os dados ao migrar backups de V1 para V2; migração PostgreSQL idempotente.
- Validar compras, projetos, tarefas, histórico, cenários, interiores e áreas externas, em web desktop e mobile.
- Não exigir WebGL para consultar tarefas, compras e relatório de execução.
- Compilar Android em PR sem publicar APK; só realizar release após matriz física e testes de segurança.
- Confirmar isolamento RLS dos anexos entre duas contas reais antes de habilitar Storage.
- Documentar resultados físicos e pendências; automatização não é substituta do dispositivo real.

## Estado inicial, 16/11/2026
Produção Supabase Myhouse: um documento V1, zero V2; constraint admite apenas versão 1; bucket privado de projetos ausente. Políticas RLS da tabela user_homes presentes. Computadores remotos offline. Não alterar produção nesta etapa sem backup e prova de restauração.
