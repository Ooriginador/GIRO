# 🚀 GIRO Project - Roadmap de Melhorias (Top 10)

Este documento descreve as 10 melhorias prioritárias identificadas após análise da codebase, focando em Segurança, Arquitetura, DevOps e Experiência do Usuário.

## 🚨 Alta Prioridade (Críticos)

### 1. Segurança e Privacidade: Bloqueio de "Data Leak"

**Problema:** Dados de desenvolvimento (admin logado, vendas teste, banco local) podem vazar para o binário de produção.
**Ação:**

- [x] Adicionar guarda `#[cfg(debug_assertions)]` no comando `seed_database`.
- [x] Verificar `tauri.conf.json` para garantir que o `giro.db` nunca seja incluído nos resources.
- [x] Forçar flag `fresh_install` para garantir setup limpo em novas máquinas (Installer já possui lógica de limpeza).

### 2. Arquitetura: Type Safety Real (Substituir `dispatcher.rs`)

**Problema:** O arquivo `dispatcher.rs` possui ~1400 linhas de parsing manual de JSON, propenso a erros e dessincronia com o frontend.
**Ação:**

- [/] Adotar **[Tauri-Specta](https://github.com/oscartbeaumont/tauri-specta)** ou **TypeShare** para gerar tipos TypeScript automaticamente a partir das Structs Rust. (Infraestrutura configurada + Módulo Produtos migrado)
- [ ] Eliminar contratos manuais (`ipc_contract`) e strings mágicas.
- [ ] Mover lógica de autenticação do dispatcher (que agora é seguro) para middlewares individuais em cada comando, permitindo a deleção do dispatcher.

### 3. Hardening: Fechar a "Porta dos Fundos" do `main.rs`

**Problema:** O `main.rs` registra comandos diretamente via `.invoke_handler()`, permitindo que qualquer comando seja chamado via console do navegador, ignorando middlewares de negócio.
**Ação:**

- [x] Centralizar todas as invocações através de um único ponto de entrada seguro ou aplicar middleware em todos os comandos.
- [x] Remover exposição direta de comandos administrativos (ex: `create_admin`) e de escrita.

### 4. Segurança: Middleware de Autenticação Centralizado

**Problema:** O frontend injeta `employee_id` manualmente. Um atacante pode alterar esse ID no payload.
**Ação:**

- [x] Implementar **Request Guard** no Rust (`AuthenticatedRequest`).
- [x] Backend deve extrair o usuário da sessão ativa (State), ignorando o ID enviado pelo frontend.
- [x] Refatorar `dispatcher.rs` para usar o Middleware de Sessão em todos os comandos críticos.

## 🛠️ Média Prioridade (Estabilidade & DevOps)

### 5. DevOps: Pipeline de CI/CD

**Problema:** Erros de build em Release aparecem tarde demais.
**Ação:**

- [ ] Criar workflow GitHub Actions (`.github/workflows/ci.yml`).
- [ ] Steps obrigatórios: `cargo check`, `cargo test`, `npm run type-check`.

### 6. Testes: Estratégia Híbrida (E2E + Integração)

**Problema:** Cobertura de testes baixa em fluxos críticos de backend.
**Ação:**

- [ ] Criar testes de integração Rust com banco em memória (`sqlite::memory:`).
- [ ] Configurar **Playwright** para testes E2E básicos (Login -> Venda -> Fechamento).

### 7. Padronização de Código (Code Cleanup)

**Problema:** Mistura de convenções (`snake_case` vs `camelCase`) dificultando a manutenção.
**Ação:**

- [ ] Aplicar `#[serde(rename_all = "camelCase")]` globalmente nas structs Rust.
- [ ] Organizar scripts soltos na raiz para `scripts/`.

## ✨ Baixa Prioridade (UX & Features)

### 8. Resiliência: Offline-First Robusto

**Problema:** Dependência forte do License Server pode travar a operação se a internet cair.
**Ação:**

- [ ] Implementar cache seguro/criptografado da licença localmente.
- [ ] UX para "Modo Offline" com contador de dias restantes.

### 9. Fiscal: Interface de Configuração NFC-e

**Problema:** Backend pronto, mas sem UI para o usuário configurar certificado.
**Ação:**

- [ ] Criar aba "Fiscal" em Settings.
- [ ] Implementar upload de `.pfx` e validação de senha/CSC.

### 10. Hardware: Dashboard de Diagnóstico

**Problema:** Suporte difícil para problemas de impressora/balança.
**Ação:**

- [ ] Criar tela de "Hardware Check".
- [ ] Botões para autoteste de periféricos com logs visuais.
