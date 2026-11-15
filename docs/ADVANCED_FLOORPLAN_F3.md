# My House — F3: planta detalhada e editor 2D

## Escopo entregue

- **Geometria opcional:** um `Room` continua com `width/length/height/x/z`; agora pode ter `footprint` (vértices x/z locais) e `openings` (porta ou janela por aresta).
- **Retrocompatibilidade:** se `footprint` estiver ausente, utiliza-se o retângulo antigo, na mesma posição. `HomeData.version` permanece `1`. Dados anteriores e backups JSON permanecem legíveis.
- **Contorno:** modelos retangular, L e U; edição numérica dos vértices e inserção/remoção de pontos. Número máximo 24; validação de faixa, área e auto-interseção. Exige ordem consistente de pontos para o contorno.
- **Aberturas:** escolha de aresta do contorno, distância do ponto inicial, largura, altura e altura de base (portas iniciam no piso). Limite de 50 vãos; sem extrapolar aresta/pé-direito nem permitir sobreposição na mesma parede.
- **Visualização 3D:** piso real em polígono no Three.js, paredes alinhadas com arestas e subdivisão de painéis para abrir vãos sem paredes falsas. Seleção de parede do modelo continua funcionando.
- **Editor 2D separado:** visão superior da casa, seleção de cômodo, edição de pontos por teclado ou touch, visualização dos vãos, posicionamento X/Z e alinhamento com outro cômodo com distância opcional.
- **Segurança e UX:** validação no salvamento e na importação de backups; nome/medidas mantidos, nenhuma mudança de autenticação ou envio de imagem. O fluxo Planta 3D continua prioritariamente de visualização; edição ocorre em **Editar planta 2D**.

## Compatibilidade com as obras existentes

O `WorkLog` e os `wallStages` existentes são indexados por direção (`norte/sul/leste/oeste`), não por aresta. Para não perder histórico, o modelo irregular associa as arestas à direção dominante de sua normal externa. Segmentos da mesma direção compartilham o histórico e as etapas de obra. Área exibida por direção é a soma de superfícies dos segmentos correspondentes, descontando portas e janelas.

**Limite:** paredes diagonais compartilham um dos quatro grupos existentes. O trabalho por segmento individual, com migração de histórico e reconciliação, é uma evolução futura e requer cuidado com dados persistidos.

## Ajuste de medidas e posicionamento

Se o usuário alterar largura ou comprimento pelo cadastro convencional, os pontos do contorno e os tamanhos/posições relativas dos vãos são escalados proporcionalmente; o salvamento valida o resultado. Alterar o formato pelos modelos limpa os vãos locais **somente após confirmação**. Não há exclusão de registros de obra nesta operação.

O alinhamento usa as caixas envolventes dos cômodos e não faz encaixe arquitetônico perfeito de polígonos irregulares. A posição pode ser ajustada manualmente; sobreposição de caixas exibe aviso, sem editar outros cômodos automaticamente.

## Ainda não implementado

- Reconstrução automática de paredes, vãos e polígonos a partir de vídeo/fotos. **Não** se deve inferir medidas reais de imagens sem calibração confiável.
- Reconhecimento por visão computacional opcional, consentimento adicional e controles de retenção. Isso exige investigação e testes de precisão antes de habilitar qualquer upload.
- Alinhamento por vértices/quinas, regras de espessura compartilhada de paredes e plantas de múltiplos pavimentos.
- Simulação arquitetônica, cotas técnicas, etiquetas automáticas de portas/janelas e rastreio de obra por aresta individual.

## Testes e cenários de aceite

1. Importar um backup V1 legado de cômodo retangular; manter geometrias e histórico.
2. Criar formato L e formato U e verificar área do piso e vãos visuais no 3D.
3. Adicionar uma porta e uma janela no mesmo segmento, sem sobreposição; validar que o vão aparece corretamente.
4. Rejeitar polígonos autointersectados, coordenadas fora dos limites e abertura fora da parede ou do pé-direito.
5. Inserir/remover vértices, desfazer edição local (voltar sem salvar) e salvar.
6. Escalar medidas pelo editor convencional, preservando vértices, vãos, compras e registros.
7. Alinhar cômodo à direita/esquerda/acima/abaixo com distância 0 e 0,2 m; conferir aviso de sobreposição.
8. Testar acessibilidade por teclado e em celular; campos numéricos são alternativa ao toque no SVG/3D.
9. Executar Vitest, compilação TypeScript/Vite e montagem do APK com Gradle. Repetir no Android real com algumas salas.

Aprovação de CI **não comprova precisão dimensional, toque em 3D ou usabilidade em dispositivo real**.
