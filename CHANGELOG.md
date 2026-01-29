# GIRO - Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [2.4.9] - 2026-01-28

### Adicionado

- **Windows Printer Detection**: Implementação nativa usando Windows API (EnumPrintersW, GetDefaultPrinterW)
- **Native Print Spooler**: Suporte direto ao Print Spooler do Windows sem dependências externas
- **Auto-Printer Selection**: Seleção automática da impressora padrão ou melhor térmica disponível
- **Printer Status Check**: Verificação de status da impressora (pronta, offline, sem papel, etc.)
- **Security Layer**: CODEOWNERS, LICENSE proprietária, scripts de verificação de segurança
- **Repository Protection**: Branch protection configurada via API para todos os repositórios

### Corrigido

- **Platform Detection**: Hook useWindowsPrinters agora detecta plataforma antes de invocar comandos Windows
- **Connection Mapping**: Impressoras Windows corretamente mapeadas para conexão USB
- **Accessibility**: Adicionado aria-label no botão de refresh de impressoras
- **Repository URLs**: Migração completa de jhonslife → Ooriginador em todos os arquivos

### Documentação

- Criado `docs/PRINTER-DETECTION-FLOW.md` com arquitetura completa
- Criado `.github/REPOSITORY_SECURITY.md` com procedimentos de segurança
- Criado `MAKE-PUBLIC-GUIDE.md` para guia de release público
- Criado `scripts/check-security.sh` para verificação pré-commit

---

## [2.4.5] - 2026-01-28

### Atualizado

- Versão geral do sistema para 2.4.5.

---

## [2.1.6] - 2026-01-27

### Corrigido

- **Hardware/Impressora Windows**: Melhorada detecção de impressoras no Windows via PowerShell (`Get-Printer`).
- **Listagem de Portas**: Impressoras Windows agora aparecem automaticamente como `\\localhost\NomeImpressora`.
- **Mensagens de Erro**: Instruções mais claras para configuração de impressora no Windows.
- **UI Settings**: Renomeada opção "USB (Automático/Físico)" para "USB (Automático - Linux)" e adicionada nota explicativa.

---

## [2.0.0] - 2026-01-26

### Adicionado

- **PDV Search**: Sistema de busca robusto com debounce (300ms)
- **Barcode Detection**: Detecção automática de códigos de barras (EAN-8, UPC-12, EAN-13, GTIN-14)
- **Zero Cache**: Remoção total de cache nas queries de produtos para dados sempre frescos
- **Keyboard Navigation**: Navegação aprimorada por teclado com scroll automático
- **UX Enhancements**: Feedback visual rico, badges informativos e indicadores de resultados

### Corrigido

- **Rust Clippy**: Corrigidos 6 warnings de Clippy no código Rust
  - `useless_format` em reports_enterprise.rs
  - `should_implement_trait` em enterprise.rs (renomeado `from_str` → `parse_status`)
  - `needless_borrows_for_generic_args` em activity_repository.rs e contract_repository.rs
- **bcrypt**: Adicionada dependência bcrypt faltante
- **PII Encryption**: Corrigido uso de `OsRng` e importado trait `Aead`
- **Customer Repository**: Adicionada anotação de tipo explícita
- **React Hooks**: Corrigido warning de `exhaustive-deps` em ProductsPage.tsx

### Melhorado

- **Performance**: Redução de ~80% nas queries ao backend com debounce
- **Code Quality**: Redução de 13 para 10 warnings no ESLint
- **Type Safety**: Melhor inferência de tipos no TypeScript
- **Clean State**: Limpeza completa de estado na busca do PDV
- **Test Quality**: Removido código não utilizado nos testes E2E

### Refatorado

- Renomeado `ContractStatus::from_str` para `ContractStatus::parse_status`
- Otimizado uso de `useMemo` em ProductsPage.tsx
- Removidos imports e funções não utilizadas em testes E2E

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
