# Create Test Suite

Crie uma suite de testes completa para a feature/módulo especificado.

## Contexto

- **Módulo/Feature:** {{module_name}}
- **Arquivos a testar:** {{files}}
- **Cobertura mínima:** 80%

## Tipos de Testes

### 1. Testes Unitários (Vitest/Rust Tests)

- Testar funções isoladamente
- Mock de dependências externas
- Edge cases e error handling
- Naming: `describe('ComponentName')`, `it('should do X when Y')`

### 2. Testes de Integração

- Testar fluxos entre componentes
- Banco de dados real (test database)
- APIs e services

### 3. Testes E2E (Se aplicável)

- Playwright para UI
- Fluxos críticos de usuário
- Screenshots em falhas

## Padrões GIRO

### Frontend (React + TypeScript)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Backend (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_function_name() {
        // Arrange
        // Act
        // Assert
    }
}
```

## Output Esperado

- [ ] Testes unitários criados
- [ ] Testes de integração criados
- [ ] Coverage report gerado
- [ ] CI/CD pipeline atualizado (se necessário)

## Ferramentas

- Use `QA` agent para revisão
- Execute com `runTests` tool
- Verifique coverage com `mode: "coverage"`
