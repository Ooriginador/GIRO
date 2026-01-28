# 🔐 Configuração de Proteção do Repositório

## ⚠️ IMPORTANTE - Antes de Tornar Público

### 1. Verificar Secrets no GitHub

Acesse: `https://github.com/Ooriginador/GIRO/settings/secrets/actions`

**Secrets Obrigatórios:**

- ✅ `GH_TOKEN` - Token para releases
- ✅ `TAURI_SIGNING_PRIVATE_KEY` - Chave privada de assinatura
- ✅ `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Senha da chave
- ✅ `LICENSE_API_KEY` - API key do servidor de licenças

**NUNCA** commite essas informações no código!

### 2. Ativar Branch Protection

Acesse: `https://github.com/Ooriginador/GIRO/settings/branches`

**Criar regra para `main`:**

```
Branch name pattern: main

☑️ Require a pull request before merging
   ☑️ Require approvals: 1
   ☑️ Dismiss stale pull request approvals when new commits are pushed
   ☑️ Require review from Code Owners

☑️ Require status checks to pass before merging
   ☑️ Require branches to be up to date before merging
   Status checks: (adicionar após primeiro build)
   - Build & Release / Build Desktop App

☑️ Require conversation resolution before merging

☑️ Do not allow bypassing the above settings
   ⚠️ Incluir administrators (você)

☑️ Allow force pushes
   - Specify who can force push: Ooriginador (apenas você)

☑️ Allow deletions: ❌ (desabilitado)
```

### 3. Configurar Security & Analysis

Acesse: `https://github.com/Ooriginador/GIRO/settings/security_analysis`

```
☑️ Dependency graph
☑️ Dependabot alerts
☑️ Dependabot security updates
☑️ Secret scanning
☑️ Push protection (bloqueia push de secrets)
```

### 4. Configurar Repositório

Acesse: `https://github.com/Ooriginador/GIRO/settings`

**General:**

```
☑️ Require contributors to sign off on web-based commits
☑️ Automatically delete head branches (após merge de PR)
```

**Features:**

```
☑️ Issues
☑️ Sponsorships (opcional)
☑️ Discussions (opcional)
❌ Wikis (use /docs no repo)
❌ Projects (use GitHub Projects separado)
```

**Pull Requests:**

```
☑️ Allow squash merging (padrão)
   Default message: Pull request title
☑️ Allow merge commits
❌ Allow rebase merging (evita conflitos)

☑️ Always suggest updating pull request branches
☑️ Automatically delete head branches
```

### 5. Adicionar Badges ao README

```markdown
[![Release](https://img.shields.io/github/v/release/Ooriginador/GIRO?style=for-the-badge)](https://github.com/Ooriginador/GIRO/releases)
[![License](https://img.shields.io/badge/license-Proprietary-red?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/Ooriginador/GIRO/release.yml?style=for-the-badge)](https://github.com/Ooriginador/GIRO/actions)
```

### 6. Verificar .gitignore

```bash
# Verificar se está ignorando arquivos sensíveis
grep -E "\.env|\.key|\.pem|secret|password" .gitignore
```

### 7. Scan de Secrets Antes de Tornar Público

```bash
# Instalar gitleaks (se não tiver)
# brew install gitleaks (macOS)
# ou baixar de https://github.com/gitleaks/gitleaks

# Escanear todo o histórico
gitleaks detect --source . --verbose

# Se encontrar secrets, use:
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch PATH/TO/SECRET' \
  --prune-empty --tag-name-filter cat -- --all
```

### 8. Checklist Final

Antes de tornar público, confirme:

- [ ] Todos os secrets estão no GitHub Secrets (não no código)
- [ ] Branch protection configurada
- [ ] CODEOWNERS criado
- [ ] .gitignore completo
- [ ] Sem arquivos `.env*` commitados
- [ ] Sem chaves privadas no histórico
- [ ] LICENSE presente (Proprietary)
- [ ] SECURITY.md presente
- [ ] README atualizado com badges
- [ ] Gitleaks executado sem alertas

### 9. Tornar Público

Acesse: `https://github.com/Ooriginador/GIRO/settings`

**Scroll até "Danger Zone":**

1. Click em "Change visibility"
2. Selecione "Make public"
3. Digite `Ooriginador/GIRO` para confirmar
4. Click em "I understand, make this repository public"

### 10. Pós-Publicação

- [ ] Verificar se GitHub Actions roda corretamente
- [ ] Testar criação de PR e proteção de branch
- [ ] Monitorar Dependabot alerts
- [ ] Verificar Secret scanning alerts

## 🛡️ Proteções Ativas

Com essas configurações, o projeto estará protegido por:

1. **Código Público** - qualquer um pode ver (open source)
2. **Commits Protegidos** - apenas via PR aprovado
3. **Secrets Isolados** - nunca expostos no código
4. **License Proprietária** - uso comercial controlado
5. **Assinatura de Binários** - releases verificáveis
6. **Scan Automático** - detecção de vulnerabilidades
7. **Controle de Merge** - CODEOWNERS + branch protection

## ⚠️ O Que NÃO Protege

- **Código fonte visível** - qualquer um pode clonar e ler
- **Issues públicas** - podem conter informações de clientes (cuidado)
- **Engenharia reversa** - binários podem ser descompilados

## 💡 Dica

Se quiser manter 100% privado mas ainda usar GitHub Actions:

- Mantenha o repo privado
- Use GitHub Pro (grátis para contas pessoais)
- 3000 minutos/mês de Actions gratuitos
