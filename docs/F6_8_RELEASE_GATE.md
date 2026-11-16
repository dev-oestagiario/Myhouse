# F6.8 — Checklist e evidências de release

**Status: BLOQUEADO para publicação.** O código pode avançar para develop, mas a versão de produção não deve ser substituída até os testes completos.

## Pré-checagem em 16/11/2026 (somente leitura)
- Banco Supabase: projeto Myhouse em sa-east-1, tabela public.user_homes com RLS e quatro políticas por auth.uid().
- Há 1 documento HomeData V1 e 0 V2. Constraint user_homes_data_version atual só aceita V1.
- Bucket myhouse-project-files e políticas myhouse_files_* inexistentes. O SQL da F6.7 não foi aplicado.
- Supabase Security Advisor: proteção contra senhas vazadas desabilitada. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Os PCs CQP-KAINA-72, kainao-pc e PCman estavam offline. Nenhum teste físico de Android foi comprovado.
- Não extrair dados de usuários, arquivos privados ou segredos para logs de CI ou issues.

## Testes automatizados

| Gate | Método | Situação |
| --- | --- | --- |
| Tipos, unitários, build | npm run check, npm run test, npm run build | CI pendente |
| Desktop e mobile | Playwright Chromium com Supabase simulado | CI pendente |
| Banco V1 para V2 | PostgreSQL descartável, SQL de produção aplicado duas vezes, JSON original preservado | CI pendente |
| Android | assembleDebug sem APK publicado | CI pendente |
| Acessibilidade e desempenho reais | Hardware com registro de evidências | Pendente |

## Migração segura do banco
1. Confirmar projeto correto, contagem por versão e permissões de acesso; planejar janela de migração.
2. Criar backup integral, protegido e restaurável, confirmar restauração em ambiente separado, antes de mudar constraints.
3. Aplicar o arquivo database/migrations/20261116_f6_home_v2.sql na janela aprovada. Esse SQL aceita V1 e V2 simultaneamente sem modificar dados existentes.
4. Verificar contagem e checksum dos documentos legados, atualização/autenticação V2, concorrência de revisão, erros de importação e isolamento de contas.
5. Se houver falha, não executar downgrade destrutivo. Bloquear release e restaurar com plano revisado.

## Storage privado
1. Somente após o gate de V2, revisar o SQL database/migrations/20261116_f67_project_files_private_storage.sql.
2. Provisionar bucket privado com limite 8 MiB e políticas RLS de leitura, gravação e exclusão. Não conceder URL pública.
3. Testar upload/download/delete com conta A; autenticar conta B e provar que ela NÃO lê, cria nem exclui objeto da conta A.
4. Verificar arquivos de projeto arquivado, nomes, tipos MIME, erros de upload e dados binários fora do backup JSON.
5. Guardar evidências sem dados pessoais reais.

## Matriz de Android físico

| Perfil | Caso | Resultado | Evidência |
| --- | --- | --- | --- |
| Dispositivo com ARCore | Câmera permitida/negada, medição e retorno à planta | Não executado | — |
| Dispositivo sem ARCore | Calibração, modo manual e correções | Não executado | — |
| Android intermediário | 3D, memória, troca de orientação, tarefas e compras | Não executado | — |
| Rede instável | Rascunho local, conflito, recuperação e exportação | Não executado | — |
| TalkBack/zoom 200% | Campos, foco, modais, botões e alternativa textual ao 3D | Não executado | — |

Para cada registro, anotar modelo do aparelho, Android, WebView, data, condições, resultado, defeitos e evidência. Sem esse registro não declarar aprovação de precisão, FPS ou estabilidade.

## Critérios de release manual
Os workflows web Pages e APK assinado precisam passar no script scripts/assert-release-ready.mjs. Ele exige o arquivo docs/release-evidence/F6.8-approved.json com approvedBy, approvedAt (máximo 14 dias), releaseVersion e os 13 gates verdadeiros **com evidência real por campo**.

Gates: backupsVerified; homeDataV2Applied; migrationRollbackReviewed; storageRlsTwoAccountTest; privateFileCRUDVerified; e2eAndTypecheckGreen; androidBuildGreen; androidARCoreDeviceTest; androidNoARCoreDeviceTest; cameraPermissionsPhysicalTest; offlineRestorePhysicalTest; accessibilityManualReview; releaseSigningVerified.

Não criar um documento de aprovação com valores inventados; o script falha fechado enquanto faltar evidência. O arquivo nunca deve conter senha, token ou chave de assinatura.

A branch develop é a integração de QA. A main, Pages e a release assinada são publicadas somente quando o responsável aprovar todos os gates. O workflow de debug Android produz apenas artifact temporário e não cria GitHub Release.
