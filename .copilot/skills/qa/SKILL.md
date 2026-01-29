# 🧪 QA (Quality Assurance) Skill

> **Especialista em testes automatizados, qualidade e cobertura de código**  
> Versão: 1.0.0 | Última Atualização: 28 de Janeiro de 2026

## 📋 Descrição

Esta skill foca na garantia da confiabilidade do software através de uma suite robusta de testes unitários, integração e end-to-end (E2E).

## 🛠️ Stack de Testes

### Frontend

- **Framework**: Vitest
- **Biblioteca**: React Testing Library
- **Mocks**: `vi.mock()` para Tauri APIs e serviços externos.

### Backend (Rust)

- **Unit**: Built-in Rust tests (`#[cfg(test)]`).
- **Mocks**: `mockall` para traits e repositories.

### E2E / Integração

- **E2E**: Playwright com Tauri driver.
- **API**: Testes de comandos Tauri invocados via mock no frontend ou direto no backend.

## 📐 Padrões de Teste

- **Colocation**: Testes unitários de componentes devem estar junto ao arquivo fonte (`Component.test.tsx`).
- **Arrange-Act-Assert (AAA)**: Estrutura padrão para todos os testes.
- **Snapshots**: Use com cautela para componentes de UI complexos.

## 📊 Métricas de Qualidade

- **Cobertura**: Alvo mínimo de 80% (Lines/Statements).
- **Quality Gates**: Linting, Type Checking e Tests devem passar no CI.

## ✅ Checklist

- [ ] Testes unitários para lógica crítica (Calculos, Validadores)
- [ ] Cobertura de componentes React com RTL
- [ ] Testes de integração de banco de dados (SQLite fixtures)
- [ ] Smoke tests para fluxos críticos (Venda, Cadastro)
- [ ] Verificação de erros e boundary conditions
- [ ] Linting e Type Check sem erros
