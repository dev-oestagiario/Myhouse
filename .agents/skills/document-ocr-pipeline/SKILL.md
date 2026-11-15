---
name: document-ocr-pipeline
description: "Planejar extração segura e acessível de conteúdo de PDF, imagem e apostilas com OCR/Tesseract, controle de qualidade e revisão."
---

# Extração de texto e OCR

## Pipeline
1. Validar MIME real, extensão, tamanho, páginas, criptografia e limites de tempo/memória do documento.
2. Priorizar texto embutido e estrutura semântica; usar OCR/Tesseract só para páginas digitalizadas ou trechos sem texto.
3. Preservar vínculo entre trecho, página, região, idioma e confiança; reconhecer que OCR pode errar números, acentos, tabelas e fórmulas.
4. Fornecer prévia e correção humana; não transformar texto de baixa confiança diretamente em tradução sinalizada.
5. Segregar arquivos temporários, bloquear caminhos arbitrários e não executar conteúdo incorporado.
6. Garantir representação alternativa de imagens e descrição das informações indispensáveis, com autorização de uso.
7. Testar PDFs digitais e escaneados, páginas rotacionadas, arquivos grandes, tabelas, português acentuado e casos inválidos.

## Aceite
Origem rastreável, dados de confiança não inventados, erros recuperáveis, privacidade e possibilidade de reprocessamento da página.
