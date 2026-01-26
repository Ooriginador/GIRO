# ✅ Checklist Pré-Commit - LGPD Implementation

## 📋 Antes de Commitar

### 1. Verificação de Compilação

```bash
cd GIRO/apps/desktop

# TypeScript
pnpm run type-check
# Resultado esperado: sem erros

# Rust
cd src-tauri
cargo check
# Resultado esperado: Finished dev [unoptimized + debuginfo]
cd ..
```

**Status**: [ ] Passou

---

### 2. Verificação de Lint

```bash
# Frontend
pnpm run lint
# Resultado esperado: sem erros críticos

# Backend (opcional)
cd src-tauri
cargo clippy
cd ..
```

**Status**: [ ] Passou

---

### 3. Teste de Build

```bash
# Build completo
pnpm tauri build --debug

# Verificar que gera executável
# Windows: src-tauri/target/debug/GIRO.exe
# Linux: src-tauri/target/debug/giro
```

**Status**: [ ] Passou

---

### 4. Teste Manual Básico

```bash
# Iniciar app
pnpm tauri dev
```

**Checklist de Fumaça**:

- [ ] App inicia sem crash
- [ ] Login funciona
- [ ] Sidebar exibe "Meus Dados" (ícone Shield)
- [ ] Clicar em "Meus Dados" → página carrega
- [ ] Página exibe dados do usuário logado
- [ ] Botões "Exportar" e "Excluir" estão visíveis
- [ ] Clientes → Dropdown → "Exportar Dados LGPD" aparece
- [ ] Sem erros no console do navegador

**Status**: [ ] Passou

---

### 5. Verificação de Secrets

```bash
# Instalar gitleaks (se não tiver)
# brew install gitleaks  # macOS
# apt install gitleaks   # Linux

# Rodar scan
gitleaks detect --source=. --verbose

# Resultado esperado: "No leaks found"
```

**Status**: [ ] Passou

---

### 6. Verificação de Arquivos

```bash
# Verificar que todos os arquivos novos estão adicionados
git status

# Arquivos esperados (novos):
# ✅ GIRO/apps/desktop/src-tauri/src/commands/lgpd.rs
# ✅ GIRO/apps/desktop/src-tauri/src/utils/pii.rs
# ✅ GIRO/apps/desktop/src/pages/settings/MyDataPage.tsx
# ✅ GIRO/apps/desktop/src/components/customers/CustomerLGPDActions.tsx
# ✅ GIRO/docs/LGPD-IMPLEMENTATION-COMPLETE.md
# ✅ GIRO/docs/LGPD-TESTING-GUIDE.md
# ✅ GIRO/docs/PII-ENCRYPTION-KEY-SETUP.md
# ✅ GIRO/docs/COMPLIANCE-IMPLEMENTATION-STATUS.md
# ✅ GIRO/LGPD-COMMIT-SUMMARY.md
# ✅ .gitleaks.toml
# ✅ .pre-commit-config.yaml
```

**Status**: [ ] Todos presentes

---

### 7. Verificação de .env (não commitar!)

```bash
# Verificar que .env NÃO está no git
git status | grep ".env"

# Resultado esperado: apenas .env.example
# NUNCA .env (que contém chaves reais)
```

**Status**: [ ] .env não está staged

---

### 8. Revisão de Código

**Padrões Verificados**:

- [ ] Comentários descritivos nas funções principais
- [ ] Tratamento de erros adequado (try/catch, Result)
- [ ] Loading states em componentes async
- [ ] Feedback visual (toasts) para ações do usuário
- [ ] Confirmação dupla para ações destrutivas
- [ ] Nomes de variáveis descritivos
- [ ] Sem código comentado/debug console.log

**Status**: [ ] Revisado

---

### 9. Documentação

**Verificar que existe**:

- [x] LGPD-IMPLEMENTATION-COMPLETE.md
- [x] LGPD-TESTING-GUIDE.md
- [x] PII-ENCRYPTION-KEY-SETUP.md
- [x] COMPLIANCE-IMPLEMENTATION-STATUS.md
- [x] LGPD-COMMIT-SUMMARY.md
- [x] README.md atualizado com seção LGPD

**Status**: [ ] Documentação completa

---

### 10. Teste de Criptografia (Opcional)

```bash
# 1. Gerar chave
openssl rand -hex 32

# 2. Adicionar no .env
echo "GIRO_PII_KEY=<chave>" >> GIRO/apps/desktop/.env

# 3. Iniciar app
pnpm tauri dev

# 4. Criar cliente com CPF
# 5. Verificar no DB que CPF está criptografado
sqlite3 src-tauri/giro.db "SELECT cpf FROM customers ORDER BY created_at DESC LIMIT 1;"
# Resultado esperado: "enc:..." ao invés de "123.456.789-00"
```

**Status**: [ ] (Opcional) Testado

---

## 🎯 Commit Message

Após passar em todos os checks:

```bash
git add .

git commit -m "feat(lgpd): implement complete LGPD/GDPR compliance with UI

- Add hard delete and data portability for employees and customers
- Implement AES-256-GCM encryption for PII (CPF/CNPJ)
- Create self-service 'My Data' page for employees
- Add LGPD actions to customer management
- Integrate navigation and routes
- Migrate license server to HttpOnly cookies
- Add gitleaks and pre-commit secret detection

Closes #<issue-number>
Compliance Score: 87/100 (from ~40/100)"
```

---

## 🚀 Push e PR

```bash
# Criar branch (se não estiver em uma)
git checkout -b feat/lgpd-compliance

# Push
git push origin feat/lgpd-compliance

# Criar PR no GitHub com template:
# - Título: feat(lgpd): implement complete LGPD/GDPR compliance
# - Descrição: Link para LGPD-COMMIT-SUMMARY.md
# - Labels: enhancement, security, compliance
# - Reviewers: @tech-lead
```

---

## ⚠️ Problemas Comuns

### "Cargo check failed"

```bash
# Verificar que aes-gcm foi adicionado
grep "aes-gcm" src-tauri/Cargo.toml

# Se não estiver, adicionar:
cd src-tauri
cargo add aes-gcm@0.10
```

### "TypeScript errors"

```bash
# Limpar cache
rm -rf node_modules/.vite
pnpm run clean

# Reinstalar
pnpm install
```

### "Module not found: Shield"

```bash
# Verificar import em Sidebar.tsx
# Deve ter: import { Shield } from 'lucide-react';
```

### "Route not working"

```bash
# Verificar App.tsx:
# 1. Import: import { MyDataPage } from '@/pages/settings';
# 2. Route: <Route path="/my-data" element={...} />
```

---

## ✅ Critérios de Aceitação Final

Para marcar como **PRONTO PARA MERGE**:

- [ ] Todos os checks acima passaram
- [ ] App compila sem erros
- [ ] App roda sem crashes
- [ ] Funcionalidades LGPD testadas manualmente
- [ ] Documentação completa
- [ ] .env não está no git
- [ ] Commit message segue padrão Conventional Commits
- [ ] PR criado e linkado

**Se todos marcados**: 🎉 **READY TO MERGE!**

---

_Checklist criado em 25 de Janeiro de 2026._
