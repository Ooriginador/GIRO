# 🚀 Guia Rápido: Tornar GIRO Público

## ✅ Pré-requisitos (Já Feitos)

- [x] CODEOWNERS criado
- [x] LICENSE proprietária
- [x] SECURITY.md
- [x] .gitignore completo
- [x] Verificação de segurança passou
- [x] URLs atualizadas para Ooriginador

## 📋 Checklist de Configuração no GitHub

### 1. Adicionar Secrets (CRÍTICO - Faça ANTES de tornar público)

Acesse: https://github.com/Ooriginador/GIRO/settings/secrets/actions

Clique em "New repository secret" para cada um:

| Nome                                 | Valor                  | Onde Obter                                                         |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| `GH_TOKEN`                           | Token de acesso GitHub | Settings → Developer → Personal tokens → Classic → Repo + workflow |
| `TAURI_SIGNING_PRIVATE_KEY`          | Chave privada Tauri    | Arquivo local `~/.tauri/giro.key`                                  |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Senha da chave         | Sua senha usada ao gerar a chave                                   |
| `LICENSE_API_KEY`                    | API key do servidor    | Dashboard do license-server                                        |

**Como obter o GH_TOKEN:**

```
1. GitHub → Settings (seu perfil)
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Scopes: ✓ repo, ✓ workflow
5. Copiar o token e salvar no Secret
```

### 2. Configurar Branch Protection

Acesse: https://github.com/Ooriginador/GIRO/settings/branches

Clique em "Add rule":

```
Branch name pattern: main

☑️ Require a pull request before merging
   Approvals: 1
   ☑️ Dismiss stale reviews
   ☑️ Require review from Code Owners

☑️ Require status checks to pass
   (deixar vazio por enquanto, adicionar após primeiro build)

☑️ Require conversation resolution

☑️ Include administrators (você também segue as regras)

☑️ Allow force pushes
   → Specify: Ooriginador

❌ Allow deletions
```

Clique em "Create".

### 3. Ativar Security Features

Acesse: https://github.com/Ooriginador/GIRO/settings/security_analysis

Ative TUDO:

```
☑️ Dependency graph
☑️ Dependabot alerts
☑️ Dependabot security updates
☑️ Secret scanning
☑️ Push protection
```

### 4. Configurar General Settings

Acesse: https://github.com/Ooriginador/GIRO/settings

**General:**

```
☑️ Require contributors to sign off
☑️ Automatically delete head branches
```

**Pull Requests:**

```
☑️ Allow squash merging (padrão)
☑️ Allow merge commits
❌ Allow rebase merging

☑️ Always suggest updating PR branches
☑️ Automatically delete head branches
```

### 5. TORNAR PÚBLICO

Acesse: https://github.com/Ooriginador/GIRO/settings

**Scroll até "Danger Zone"** (final da página):

1. Clique em **"Change visibility"**
2. Selecione **"Make public"**
3. Digite exatamente: `Ooriginador/GIRO`
4. Clique em **"I understand, make this repository public"**

⚠️ **IMPORTANTE:** Não há como desfazer facilmente! Certifique-se que os secrets estão configurados.

### 6. Verificar Após Tornar Público

```bash
# Clone público
git clone https://github.com/Ooriginador/GIRO.git test-public-clone
cd test-public-clone

# Verificar se .env está sendo ignorado
ls -la | grep .env

# Verificar se não há secrets
./scripts/check-security.sh

# Limpar teste
cd ..
rm -rf test-public-clone
```

### 7. Testar GitHub Actions

```bash
# Criar uma tag para disparar release
git tag v2.4.10-test
git push origin v2.4.10-test

# Acompanhar em:
# https://github.com/Ooriginador/GIRO/actions
```

Se o build falhar, verifique:

- Secrets estão configurados corretamente
- Workflow tem permissões de escrita
- Tag foi criada corretamente

### 8. Deletar Tag de Teste

```bash
git tag -d v2.4.10-test
git push origin :refs/tags/v2.4.10-test
```

## 🛡️ O Que Está Protegido Agora

✅ **Código-fonte** - Visível mas LICENSE proprietária impede uso comercial
✅ **Commits** - Apenas via PR aprovado
✅ **Secrets** - Isolados no GitHub Actions
✅ **Branch main** - Protegida contra force push acidental
✅ **Dependências** - Monitoradas por Dependabot
✅ **Vulnerabilidades** - Secret scanning ativo

## ⚠️ O Que NÃO Está Protegido

❌ Código visível - qualquer um pode ler
❌ Issues públicas - cuidado com dados de clientes
❌ Binários compilados - podem ser descompilados

## 💡 Dicas Pós-Publicação

1. **Monitore Issues**: Configure notificações para novos issues
2. **Revise PRs rapidamente**: Contribuidores externos esperam feedback
3. **Mantenha CHANGELOG atualizado**: Transparência com comunidade
4. **Use GitHub Projects**: Organize roadmap publicamente
5. **Configure Discussions**: Para dúvidas gerais (menos formal que Issues)

## 🔙 Como Tornar Privado Novamente (Se Necessário)

Settings → Danger Zone → Change visibility → Make private

⚠️ Você perderá:

- Stars públicas
- Forks
- Watchers
- Alguns recursos de comunidade

## 📞 Suporte

Problemas com a configuração?

- Email: devops@arkheion.com
- Slack: #giro-devops
