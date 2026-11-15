---
name: privacy-lgpd
description: "Aplicar privacidade e proteção de dados no LibrasEdu, especialmente voz, vídeo, imagem, crianças/adolescentes e dados de aprendizagem."
---

# Privacidade desde a arquitetura

## Procedimento
1. Mapear entrada, finalidade, base de tratamento apropriada, acesso, risco, retenção e descarte de cada dado.
2. Tratar áudio, vídeo, imagem, conteúdo escolar, métricas de aprendizagem e eventuais dados de menores como dados pessoais que exigem cuidados proporcionais.
3. Minimizar coleta: áudio e vídeo **não são guardados por padrão**; pedir autorização clara para transmissão/armazenamento e explicar finalidade.
4. Preferir processamento local quando possível e evitar compartilhamento com terceiros sem aviso e controle.
5. Criptografar tráfego e dados em repouso quando aplicável; limitar acesso por perfil e registrar ações sem conteúdo privado.
6. Garantir rotinas de eliminação, exportação e correção compatíveis com requisitos aprovados.
7. Separar dados reais de teste, usar fixtures sintéticas e verificar vazamentos em logs, exceções, analytics e backups.
8. Revisar com responsáveis jurídicos/LGPD quando uma decisão depender de interpretação legal.

## Aceite
Fluxo de dados documentado, permissão e retenção claras, nenhum dado real em código de teste e testes de autorização/remoção.
