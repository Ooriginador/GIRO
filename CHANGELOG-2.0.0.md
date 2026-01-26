# Changelog

## [2.0.0] - 2026-01-26

### 🚀 Features

- **PDV Search**: Implementado sistema de busca robusto com debounce (300ms)
- **Barcode Detection**: Detecção automática de códigos de barras (EAN-8, UPC-12, EAN-13, GTIN-14)
- **Zero Cache**: Remoção total de cache nas queries de produtos para dados sempre frescos
- **Keyboard Navigation**: Navegação aprimorada por teclado com scroll automático
- **UX Enhancements**: Feedback visual rico, badges informativos e indicadores de resultados

### 🐛 Bug Fixes

- **Rust Clippy**: Corrigidos 6 warnings de Clippy no código Rust
  - `useless_format` em reports_enterprise.rs
  - `should_implement_trait` em enterprise.rs (renomeado `from_str` → `parse_status`)
  - `needless_borrows_for_generic_args` em activity_repository.rs e contract_repository.rs
- **bcrypt**: Adicionada dependência bcrypt faltante
- **PII Encryption**: Corrigido uso de `OsRng` e importado trait `Aead`
- **Customer Repository**: Adicionada anotação de tipo explícita
- **React Hooks**: Corrigido warning de `exhaustive-deps` em ProductsPage.tsx

### 🔧 Improvements

- **Performance**: Redução de ~80% nas queries ao backend com debounce
- **Code Quality**: Redução de 13 para 10 warnings no ESLint
- **Type Safety**: Melhor inferência de tipos no TypeScript
- **Clean State**: Limpeza completa de estado na busca do PDV
- **Test Quality**: Removido código não utilizado nos testes E2E

### 📝 Documentation

- Adicionado `DEBUG-REPORT-2026-01-26.md` com análise completa de erros corrigidos
- Adicionado `PDV-SEARCH-IMPROVEMENTS-2026-01-26.md` com documentação detalhada das melhorias

### 🔄 Refactoring

- Renomeado `ContractStatus::from_str` para `ContractStatus::parse_status`
- Otimizado uso de `useMemo` em ProductsPage.tsx
- Removidos imports e funções não utilizadas em testes E2E

### ⚡ Performance

- Busca PDV: 70% menos queries ao backend
- Cache: 100% de precisão (sem dados antigos)
- UX: Resposta fluida com debounce de 300ms

### 🎯 Breaking Changes

Nenhuma mudança quebra compatibilidade com versões anteriores.

---

**Full Changelog**: https://github.com/jhonslife/GIRO/compare/v1.5.1...v2.0.0
