# GIRO - Changelog

Todas as alteracoes notaveis deste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.1.5] - 2026-01-23

### Corrigido

- **Hotfix: Deploy do Servidor de Licença**: Tornadas opcionais as variáveis de ambiente do S3 (`S3_ENDPOINT`, etc.), permitindo que o servidor inicie mesmo sem backup em nuvem configurado.

---

## [1.1.4] - 2026-01-23

### Adicionado

- **Separação de Funções (RBAC)**: Introdução formal de roles `Admin` (equipe interna) e `Customer` (clientes) no Servidor de Licenças.
- **E-mail de Administrador**: Ativação automática da role `admin` para `ooriginador@gmail.com`.

### Corrigido

- **Mobile TypeScript**: Alinhamento completo de tipos e interfaces em hooks, stores e componentes UI (`useHaptics`, `settingsStore`, `Badge`, `Modal`, etc.).
- **Estabilidade Mobile**: Resolvidos erros de compilação que impediam o build do aplicativo.
- **Desktop I/O**: Implementação de escrita atômica e assíncrona para o arquivo de licença local, prevenindo corrupção de dados.
- **Type Safety**: Limpeza de lints e tipos `any` nos clientes API do Dashboard e Website.

---

## [1.1.2] - 2026-01-23

### Adicionado

- **Novos Relatórios**: Motor de relatórios expandido com novos Dashboards e estatísticas.
- **Relatório de Estoque**: Visão detalhada de valorização por categoria.
- **Relatório de Desempenho**: Ranking de funcionários e comissionamento.

### Corrigido

- **Erros de Build**: Corrigida a tipagem do frontend para suportar os novos relatórios.
- **Nomenclatura**: Padronização de snake_case para camelCase entre Rust e TypeScript.
- **Tipagem**: Resolvidos erros de tipos implícitos e duplicidade de definições em `tauri.ts`.

---

## [1.1.1] - 2026-01-22

### Adicionado

- Backup em nuvem via License Server.
- Reformulação da segurança do sistema.

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

### Planejado

- NFC-e / NF-e (Nota Fiscal Eletronica)
- Integracao TEF (cartoes)
- App mobile gerencial
- Multi-loja

---

## GIRO - Sistema de Gestao Comercial

## Desenvolvido por Arkheion
