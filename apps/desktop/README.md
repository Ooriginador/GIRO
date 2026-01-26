# GIRO

Sistema de Gestao Comercial para Varejo

## Desenvolvido por Arkheion

---

## Sobre

GIRO e um sistema completo de PDV (Ponto de Venda) e gestao comercial para pequenos e medios varejos brasileiros. Funciona 100% offline como aplicacao desktop nativa para Windows.

## Tecnologias

| Camada   | Tecnologia                                |
| -------- | ----------------------------------------- |
| Frontend | React, TypeScript, Vite, TailwindCSS      |
| Backend  | Rust, Tauri, SQLite                       |
| Testes   | Vitest (254), Cargo Test (78), Playwright |

## Modulos

- PDV/Caixa
- Produtos e Categorias
- Estoque e Validade
- Funcionarios
- Controle de Caixa
- Relatorios
- Alertas
- Sistema de Tutoriais

## Scripts

````bash
# Desenvolvimento
npm run dev
npm run tauri:dev

# Testes
npm run test:run
cargo test

# Build
npm run tauri:build
```text
## Estrutura

```text
apps/desktop/
├── src/                 # Frontend React
├── src-tauri/           # Backend Rust
└── tests/               # Testes E2E
```text
## Documentacao

### Testes
- **[📚 ÍNDICE](docs/INDEX.md)** - Hub central de documentação de testes
- **[⚡ Guia Rápido](docs/QUICK-REFERENCE.md)** - Snippets e templates prontos
- **[🪟 Guia Windows](docs/WINDOWS-TESTING-GUIDE.md)** - Testes robustos para Windows CI
- **[✅ Status Atual](docs/TESTING-STATUS.md)** - Métricas e cobertura
- **[📘 Boas Práticas](docs/TESTING-BEST-PRACTICES.md)** - Padrões e antipadrões

### Legal
- [Instalador Windows](docs/INSTALL_WIZARD.md)
- [Termos de Servico](docs/legal/TERMS_OF_SERVICE.md)
- [Politica de Privacidade](docs/legal/PRIVACY_POLICY.md)
- [EULA](docs/legal/EULA.md)

## Licenca

Copyright 2026 Arkheion. Todos os direitos reservados.

Consulte [LICENSE.md](docs/legal/LICENSE.md) para detalhes.
````
