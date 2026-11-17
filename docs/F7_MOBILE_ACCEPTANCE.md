# Aceite mobile F7.0–F7.6

Use APK de teste e dados sintéticos/autorizados. Não desinstale a versão anterior antes de exportar e verificar backup. Assinatura debug pode diferir do APK anterior. Não registrar email, planta real, tokens ou arquivos privados nos logs.

| Caso | Procedimento | Aceite |
|---|---|---|
| Navegação | Início > Projetos > detalhe > tarefa/cenário; Voltar, breadcrumb, Mais e recarga | volta ao nível apropriado, sem duplicação ou lista escondida |
| Cadastros | Criar projeto, compra, cômodo, tarefa; preencher opcionais; editar e cancelar | campos e rascunhos preservados; teclado não cobre salvar |
| Compras/obras | Detalhe, edição, atualização, filtros, histórico | dados corretos e sincronizados; falha visível e retry |
| Acessibilidade | TalkBack, teclado externo, texto ampliado e zoom 200%, rotação | foco dentro do modal, nomes anunciados, nenhum controle essencial cortado |
| 3D/2D | Abrir, girar, selecionar, alternar plantas e propostas; editor/móveis e área externa | renderização reage à interação; alternativa 2D acessível |
| Scanner | Aparelho ARCore e não ARCore, permissão negada, retornar da câmera e confirmar medidas | dados preservados, estimativas explicitamente conferidas |
| Desempenho | registrar Android/WebView, aparelho, tempo inicial e primeira abertura 3D em 5 execuções, memória e estabilidade | comparar mesma fixture/build anterior, sem prometer melhora não medida |
| Offline | interromper rede durante salvamento, reabrir, recuperar rascunho e exportar | nenhum descarte silencioso |
| Anexos | testar com bucket privado e duas contas de teste autorizadas | isolamento real e CRUD; gate separado pendente |

Status: roteiro escrito, casos físicos não executados. Aceite automatizado usa mock Supabase e Chromium desktop/mobile; relatório do build mede bytes, não tempo real. A V2 já foi aplicada anteriormente; backup integral e Storage real permanecem gates distintos conforme F6.8. Nenhuma liberação estável automática.
