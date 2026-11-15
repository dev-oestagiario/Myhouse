# F5 — QA final, escaneamento e política de distribuição

## Situação técnica

As três etapas estão implementadas em código, mas a checagem em aparelhos Android físicos **não é substituída por CI**. O escaneamento com ARCore ainda seleciona quatro pontos de piso. No modo sem ARCore, o aplicativo usa **homografia de um plano de piso calibrado**, com a câmera parada e pontos marcados pelo usuário. **Não há SLAM móvel, identificação automática de paredes/cantos ou captura 3D completa** nesta versão. Ao salvar, o contorno aproximado será integrado à planta 2D/3D editável.

## Critérios de aceite automatizáveis

- [x] O fluxo inicial não captura fotos, não grava vídeo e oferece câmera ou entrada manual.
- [x] O ARCore só é selecionado após confirmação da API nativa.
- [x] Modo sem ARCore: escala por referência medida no mesmo piso, geometria sem auto-interseção, aviso em caso de variação importante de imagem.
- [x] Contornos irregulares válidos passam pela validação do modelo `Room`.
- [x] Correção das dimensões redimensiona proporcionalmente a geometria, inclusive depois de o campo numérico ser esvaziado.
- [x] Prévia 2D do piso e 3D, com área, perímetro, altura e resumo da origem da estimativa.
- [x] Confirmação explícita antes de salvar, com sincronização por `HomeData.rooms` e modelo Supabase pré-existente.
- [x] "Sair da conta" movido do cabeçalho para a área de conta no menu lateral; aviso de alterações não sincronizadas preservado.
- [x] Cores de marca padronizadas em azul; verde permanece para sucesso e estados concluídos.
- [ ] Confirmar compilação web, unitários, Playwright e revisão de contraste no CI na última revisão.
- [ ] Compilação única do APK ao final, após integração revisada à `main`.

## Matriz de testes manuais — necessária antes de declarar lançamento estável

| Cenário | Execução | Resultado |
| --- | --- | --- |
| Android com ARCore (câmera e rastreamento) | Medir dois pares de pontos; negar/permitir câmera; cancelar medição | Pendente — aparelho físico |
| Android sem ARCore | Abrir câmera ao vivo no WebView, calibrar referência retangular e marcar cantos | Pendente — aparelho físico |
| Permissão negada e revogada no sistema | Garantir mensagem de erro, retentativa e modo manual | Pendente — aparelho físico |
| App minimizado/bloqueado | Câmera deve parar e retomar apenas com reinicialização de marcações | Pendente — aparelho físico |
| Cômodo retangular de 3×4 m | Comparar largura, comprimento e área com trena; registrar erro absoluto/percentual | Pendente — aparelho físico |
| Cômodo irregular em L | Validar vértices, ajustar medidas, confirmar e reabrir no editor 2D | Pendente — aparelho físico |
| Iluminação baixa/reflexo/piso sem textura | Garantir que casos de baixa confiança não sejam tratados como precisos | Pendente — aparelho físico |
| Sincronização e restauração | Entrar com conta de teste, salvar, reabrir e importar/exportar JSON legado | Pendente — aparelho físico |
| UI 320–480 px, teclado e orientação | Sem corte de header, rolagem horizontal, rótulos inalcançáveis ou botão Sair indevido | Pendente — aparelho físico |

### Registro das medições

Para cada cômodo de referência, registrar: modelo Android, versão, presença de ARCore, modo de escaneamento, largura e comprimento aferidos com trena, resultados do app, erro absoluto em centímetros `abs(estimado-real)*100`, erro relativo `abs(estimado-real)/real*100`, iluminação, geometria e observações. A aprovação para medições depende de faixas de erro definidas após levantamento real; **nenhuma precisão foi validada ou garantida ainda**.

## Publicação

Apenas um APK após conclusão das Etapas 1–3: o merge na `main` dispara `.github/workflows/android-apk.yml`, publica um único arquivo `MyHouse.apk` em Releases, de caráter **debug/testes**. Não é uma assinatura persistente de produção e não implica avaliação em hardware. Antes da instalação por cima de versões anteriores, conferir backup e sincronização Supabase.

A assinatura de produção permanece dependente de uma chave sob controle do responsável e dos Secrets do GitHub. Não criar ou publicar chaves privadas no repositório.
