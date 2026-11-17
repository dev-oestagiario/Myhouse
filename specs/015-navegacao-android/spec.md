# F7.0 — Navegação mobile-first e cadastros

## Requisitos
- RF01: Listagem de projetos sem formulário ou cabeçalho de detalhe. Abrir card navega para rota identificada pelo ID, com histórico e recarga.
- RF02: Caminho Myhouse > Projetos > Nome do projeto; níveis anteriores clicáveis. Detalhe com título próprio.
- RF03: Ações de cadastro centralizadas em FAB contextual: projetos, compras, tarefas, obras/cômodos, cenários/espaços, áreas externas e arquivos. Não duplicar botões no estado vazio. Formulários em superfícies separadas, em tela cheia no Android compacto. Editores geométricos mantêm ferramentas diretamente ligadas ao desenho.
- RF04: Retirar e-mail e estado de sucesso de sincronização de todas as telas principais e menu. Manter erros, conflitos, recuperação e backup.
- RNF01: Histórico do navegador, foco, Escape, alvos de toque, safe areas e nenhum overflow horizontal. Sem nova dependência; mesmas regras de negócio e RLS.
- RNF02: Não publicar APK/release estável automaticamente. Validar web desktop/mobile e compilação Android; hardware físico é gate distinto.
