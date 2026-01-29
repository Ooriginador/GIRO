# 🐛 Debugger Skill

> **Diagnóstico e resolução de bugs complexos com análise de causa raiz**  
> Versão: 1.0.0 | Última Atualização: 28 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece metodologias e padrões para diagnosticar problemas, analisar a causa raiz e implementar correções seguras no ecossistema GIRO.

## 🛠️ Metodologia de Debug

### 1. Coleta e Reprodução

- Coletar logs e stack traces (RUST_BACKTRACE=1, browser console)
- Identificar mudanças recentes no Git
- Isolar variáveis de ambiente e dados do usuário

### 2. Análise de Causa Raiz (RCA)

- Formular e testar hipóteses
- Verificar race conditions e vazamentos de memória
- Validar fluxos de dados e null checks

## 🔧 Padrões por Camada

### Frontend (React/TypeScript)

```typescript
// Debugging de estado e renderização
console.table(data);
console.trace('Call stack');

// Breakpoint manual
debugger;

// Profiling de componente
import { Profiler } from 'react';
```

### Backend (Rust/Tauri)

```rust
// Tracing e instrumentação
use tracing::{debug, info, error, instrument};

#[instrument]
pub async fn critical_operation() {
    debug!("Starting...");
}

// Asserções de debug
debug_assert!(condition, "Message");
```

### Database (SQLite)

```sql
-- Análise de plano de execução
EXPLAIN QUERY PLAN SELECT ...;

-- Verificação de integridade
PRAGMA integrity_check;
```

## 📋 Template de Bug Report

- **Descrição**: O que acontece vs o esperado
- **Reprodução**: Passo a passo detalhado
- **Causa Raiz**: Diagnóstico técnico
- **Solução**: Código da correção
- **Prevenção**: Teste de regressão criado

## ✅ Checklist

- [ ] Bug reproduzido consistentemente
- [ ] Logs coletados e analisados
- [ ] Causa raiz identificada
- [ ] Fix implementado e validado
- [ ] Teste de regressão adicionado
- [ ] Documentação de troubleshooting atualizada
