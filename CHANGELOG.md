# GIRO - Changelog

Todas as alteracoes notaveis deste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.0.10] - 2026-01-18

### Corrigido

- **Emails atualizados**: Todos os emails do sistema agora usam o domínio real `arkheion-tiktrend.com.br`

---

## [1.0.9] - 2026-01-18

### Corrigido

- **Licença não aparecia nas Configurações**: A chave de ativação agora é salva corretamente na tabela de settings
- **Loop na criação do primeiro admin**: Corrigida race condition onde o app voltava para a tela de boas-vindas após criar o administrador

### Melhorado

- Logs de debug para fluxo de setup inicial

---

## [1.0.0] - 2026-01-08

### Adicionado

- Sistema completo de PDV (Ponto de Venda)
- Gestao de Produtos e Categorias
- Controle de Estoque com rastreamento de lotes
- Sistema de Alertas (vencimento, estoque baixo)
- Gestao de Funcionarios com RBAC
- Controle de Caixa (abertura, fechamento, sangria)
- Relatorios gerenciais
- Sistema de Tutoriais interativos
- Backup para Google Drive
- Integracao com impressoras termicas
- Integracao com balancas
- Scanner mobile (celular como leitor)

### Documentacao

- EULA (Contrato de Licenca)
- Termos de Servico
- Politica de Privacidade
- Guia de Instalacao
- Guia de Branding

### Tecnologia

- Frontend: React 18, TypeScript, Vite
- Backend: Rust, Tauri 2.0, SQLite
- 332 testes automatizados (254 Vitest + 78 Rust)

---

## [Unreleased]

### Planejado

- NFC-e / NF-e (Nota Fiscal Eletronica)
- Integracao TEF (cartoes)
- App mobile gerencial
- Multi-loja

---

## GIRO - Sistema de Gestao Comercial

## Desenvolvido por Arkheion
