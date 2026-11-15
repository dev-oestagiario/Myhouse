# My House — Escaneamento assistido de cômodos

> **Evolução F5 (15/11/2026):** o fluxo de fotos descrito abaixo é histórico. A experiência atual em desenvolvimento passa a usar câmera ao vivo sem fotografias. Consultar [F5_LIVE_SCAN.md](F5_LIVE_SCAN.md). A geração automática sem ARCore pertence à etapa 2, e a build do APK foi adiada para o final das três etapas.

## Objetivo e limites

Uma pessoa em mudança ou reforma usa seu celular para registrar um cômodo e incorporá-lo à Planta 3D sem precisar configurar a geometria manualmente no editor. O **MVP fase 1** registra imagens guiadas, solicita largura, comprimento e altura *medidos ou conferidos pela pessoa*, pré-visualiza o volume e salva apenas o cômodo. **Fotos não produzem medidas automáticas nesta fase**.

Não chamar a prévia de planta arquitetônica ou levantamento técnico preciso. A planta existente representa cômodos como prismas retangulares (posição X/Z e altura), sem portas e janelas.

## Jornada da Fase 1

1. Acessar Planta 3D ou Obras e escolher **Escanear cômodo**.
2. Ler orientação de privacidade e escolher captura ou entrada manual.
3. Capturar (ou selecionar) fotos de entrada, parede direita, parede oposta, parede esquerda e teto/piso, uma por etapa; cada foto é opcional.
4. Informar nome, largura, comprimento, altura e posição X/Z, com valores iniciais **meramente ilustrativos**. A foto não determina dimensão.
5. Revisar uma prévia tridimensional, validar os valores e marcar confirmação explícita.
6. Salvar um novo cômodo na estrutura `HomeData.rooms` com ID estável. O Supabase continua salvando o documento existente em `user_homes` com suas regras RLS. Ir à Planta 3D e mostrar o cômodo.

## Segurança e privacidade

- Captura depende de ação explícita. Permissões só na hora de capturar; tratar erro e cancelamento.
- Fotos ficam exclusivamente em URLs temporárias / memória durante a sessão. Não persisti-las no estado da casa, backup, banco, analytics ou logs; não implementar upload oculto.
- Evitar fotografar pessoas e documentos; oferecer descartar ou substituir cada foto e prosseguir manualmente.
- Navegação independente de câmera, arrastar ou AR: formulário de medidas sempre acessível.
- Validar nome e dimensões (0,10–100 m) e coordenadas (-100–100 m); não aceitar NaN/Infinity.
- Saída da captura descarta referências temporárias. Não criar cômodos sem confirmação.

## Arquitetura

- `src/scan/roomScan.ts`: regras puras para valores e etapas.
- `src/scan/GuidedRoomScan.tsx`: fluxo de captura, revisão e prévia.
- `src/App.tsx`: entradas de navegação e persistência sem schema novo.
- `src/styles.css`: experiência responsiva.

## Fases

| Fase | Escopo | Critério de aceite |
| --- | --- | --- |
| F0 — Especificação | Modelo, riscos, alternativas, testes e gates | Documentos versionados |
| **F1 — Captura guiada e fallback** | Fotos opcionais via câmera nativa / seletor, medidas conferidas, prévia e cadastro | Testes de regras, build web, APK e teste manual no celular |
| F2 — ARCore opcional | Plugin nativo Android, checagem real de suporte/instalação, permissões, pontos de referência e profundidade onde disponíveis | Medições com precisão documentada em aparelhos compatíveis, fallback em aparelhos incompatíveis |
| F3 — Geometria avançada | Polígono de cômodo, várias paredes e vãos, ajuste fino 2D/3D, conflitos/posicionamento dos cômodos, possível pipeline de visão computacional com consentimento separado | Comparação contra medidas reais e edição manual |
| F4 — Robustez/lançamento | Matriz de dispositivos, UX acessível, testes E2E, exportação, LGPD e monitoramento | Gatilhos de regressão no CI e critérios de lançamento |

## Decisões explícitas

- Fotos estáticas guiadas são preferidas a vídeo contínuo na F1: mais simples, não requer backend para vídeo e funciona em mais aparelhos.
- Não declarar “ARCore compatível” com base apenas no navegador, versão Android ou WebXR. Detectar o serviço nativo na F2.
- Não enviar fotos para o Supabase sem novo aceite e especificação de armazenamento/retencão.
- Para ter medidas automáticas precisas, serão necessários ARCore compatível, calibração e testes; a câmera comum, por si só, não as fornece.

## F2 — Medição ARCore opcional (implementação técnica)

Em Android com ARCore compatível, **Medir com ARCore** abre uma tela Android nativa. Ao apontar para o piso, a pessoa seleciona manualmente quatro pontos: dois para largura e dois para comprimento. O algoritmo usa hit-test contra planos horizontais rastreados, com fallback para pontos de profundidade quando suportados. Os comprimentos são calculados entre âncoras locais; não há reconstrução automática do cômodo, reconhecimento de todos os cantos nem medição de altura.

O ARCore informa se está instalado, se precisa de atualização ou se o aparelho não suporta. O botão aparece somente se houver suporte. A instalação/atualização só é solicitada quando a pessoa inicia a medição. O recurso está declarado como **optional** no AndroidManifest: aparelhos sem ARCore seguem com fotos opcionais e medidas manuais.

O retorno contém apenas largura e comprimento arredondados em centímetros, indicador de suporte/uso de profundidade e método de medida. Esses valores são editáveis no formulário existente, junto com a altura medida manualmente. A confirmação explícita na prévia 3D continua obrigatória antes de salvar no Supabase.

### Limitações e segurança

- O resultado é aproximado e **não serve como planta técnica**. Precisão real varia com iluminação, movimento, textura, rastreamento e sensores.
- O fluxo exige escolher pontos no piso; não identifica automaticamente paredes, teto, portas e janelas. Nenhuma detecção de cantos é anunciada.
- Câmera precisa de permissão apenas ao iniciar AR; recusa, incompatibilidade, instalação cancelada, falha de câmera e ARCore ausente devem oferecer retorno manual sem bloquear.
- Quadros de vídeo, imagens e âncoras não são enviados ao Supabase nem gravados em arquivos locais pelo plugin. Ao encerrar, âncoras e sessão são descartadas.
- Validação de UI, sensor e precisão depende de **teste em aparelhos Android reais** além do build de CI.
- Integração nativa é aplicada por `scripts/install-arcore.mjs` após o `npx cap sync android`, pois `android/` é gerado dinamicamente em CI.
