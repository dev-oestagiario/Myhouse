---
name: desktop-pyside6
description: "Projetar aplicações desktop acessíveis em Python/PySide6 com arquitetura separada, trabalho assíncrono, empacotamento e testes."
---

# Desktop com PySide6

Usar apenas quando a arquitetura desktop Python/PySide6 for aprovada; **PySide6 e Tauri são tecnologias diferentes** e não devem ser misturadas sem decisão explícita.

## Diretrizes
1. Separar UI Qt, aplicação, serviços, domínio, armazenamento e motores de ASR/VAD.
2. Execuções longas de OCR, áudio e modelos nunca bloqueiam a thread principal; usar workers, sinais Qt, cancelamento e estados de progresso.
3. Tratar permissão de microfone, caminhos temporários, falha de modelo, mudanças de dispositivo e desligamento seguro.
4. Navegação por teclado, rótulos acessíveis, alto contraste, reflow, escalas de DPI e comunicação visual.
5. Testar início/fim de worker, cancelamento, duplicidade de chamadas, vazamento de recursos e builds em Windows quando aplicável.
6. Empacotamento deve declarar dependências nativas, pesos de modelos, licenças, caminhos relativos e política de atualização.

Não declarar funcionamento multiplataforma sem teste nas plataformas efetivas.
