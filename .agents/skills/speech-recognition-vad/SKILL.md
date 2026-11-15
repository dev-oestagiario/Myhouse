---
name: speech-recognition-vad
description: "Projetar reconhecimento de fala em português com Faster-Whisper e segmentação Silero VAD, com timestamps, revisão humana, testes e privacidade."
---

# Reconhecimento de fala e VAD

## Ativação
Implementações ou bugs de áudio, captura, VAD, segmentação, transcrição, temporização e legendas.

## Contrato do pipeline
1. Captura com permissão explícita, formato/amostragem documentados, limites de tamanho e feedback visual.
2. VAD Silero segmenta fala e silêncio; não traduz língua nem reconhece sinais.
3. Faster-Whisper transcreve trechos; registrar idioma, versão do modelo, estratégia de processamento e limitações.
4. Harmonizar timestamps dos segmentos de volta ao relógio da mídia; tratar sobreposição e cortes.
5. Preservar pontuação/números com revisão e correção do usuário antes de publicar legendas ou alimentar um pipeline de tradução.
6. Separar métricas de **tempo real**, **WER/CER medidos** e **qualidade linguística em Libras**.
7. Erros: microfone negado, áudio vazio, excesso de ruído, arquivo inválido, indisponibilidade de modelo e timeout não devem travar a UI.

## Segurança
- Não armazenar áudio por padrão; limpeza de arquivos temporários e limites de retenção explícitos.
- Não enviar áudio a nuvem sem ação informada do usuário.
- Não registrar gravações ou dados sensíveis em logs.
- Isolar tarefas longas e cancelar com segurança.

## Testes
Fala curta/longa, silêncio, pausas, números, nomes, sotaques, ruído, codec, taxa de amostragem e sincronismo de legendas com vídeo.
