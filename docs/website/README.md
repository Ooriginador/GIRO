# GIRO - Website & Auto-Update System

## 📋 Visão Geral

Sistema completo de distribuição e atualização automática do GIRO.

## 🌐 GitHub Pages

Landing page profissional hospedada em:

- **URL**: https://jhonslife.github.io/GIRO

### Funcionalidades

- Download direto da última versão
- Links atualizados automaticamente via GitHub API
- Informações sobre recursos
- Requisitos do sistema
- Design responsivo

## 🔄 Sistema de Atualização Automática

### Como Funciona

1. **Verificação Automática**: Ao iniciar o app, verifica se há novas versões
2. **Notificação**: Dialog mostra o que há de novo
3. **Download**: Download seguro via GitHub Releases
4. **Instalação**: Atualização automática com reinício

### Configuração

#### Tauri Config (`src-tauri/tauri.conf.json`)

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://jhonslife.github.io/GIRO/updater/{{target}}/{{current_version}}"],
      "dialog": false,
      "pubkey": "..."
    }
  }
}
```

#### Dependências

- `tauri-plugin-updater` no Cargo.toml
- `@tauri-apps/plugin-updater` no package.json
- `@tauri-apps/plugin-process` para restart

## 🚀 Processo de Release

### 1. Criar Tag

```bash
git tag v1.0.1
git push origin v1.0.1
```

### 2. GitHub Actions

O workflow `.github/workflows/release.yml` automaticamente:

- Compila para Windows e Linux
- Gera instaladores (.exe, .msi, .deb, .AppImage)
- Cria GitHub Release
- Gera manifest de atualização (`latest.json`)
- Publica artefatos

### 3. Atualização da Landing Page

O workflow `.github/workflows/pages.yml` automaticamente:

- Detecta mudanças em `docs/website/**`
- Faz deploy para GitHub Pages

## 📦 Artefatos Gerados

Cada release gera:

- `GIRO_1.0.0_x64-setup.exe` - Instalador NSIS (Windows)
- `GIRO_1.0.0_x64_en-US.msi` - Instalador MSI (Windows)
- `giro_1.0.0_amd64.deb` - Pacote Debian (Linux)
- `giro_1.0.0_amd64.AppImage` - AppImage Universal (Linux)
- `latest.json` - Manifest de atualização

## 🔐 Assinatura de Código

### Gerar Chave de Assinatura

```bash
# Instalar tauri-cli se não tiver
cargo install tauri-cli

# Gerar par de chaves
tauri signer generate -w ~/.tauri/myapp.key
```

### Configurar GitHub Secrets

1. Vá em Settings → Secrets and variables → Actions
2. Adicione:
   - `TAURI_SIGNING_PRIVATE_KEY`: Conteúdo do arquivo .key
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Senha da chave

### Public Key

A chave pública deve estar em `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."
    }
  }
}
```

## 🧪 Testando Updates Localmente

### 1. Criar Build de Teste

```bash
cd apps/desktop
pnpm tauri build
```

### 2. Simular Release

```bash
# Criar tag local
git tag v1.0.1-test

# Fazer push (trigger workflow)
git push origin v1.0.1-test
```

### 3. Testar App

1. Instale a versão antiga
2. Crie nova release (versão maior)
3. Abra o app
4. Verifique se detecta atualização

## 📊 Estatísticas de Download

GitHub fornece estatísticas de download em:

- Repositório → Releases
- Cada release mostra número de downloads por artefato

## 🛠️ Manutenção

### Atualizar Landing Page

```bash
# Editar
vim docs/website/index.html

# Commit e push (auto-deploy)
git add docs/website/
git commit -m "docs: update landing page"
git push
```

### Criar Hotfix

```bash
# Fix crítico na versão atual
git tag v1.0.1
git push origin v1.0.1

# Users serão notificados automaticamente
```

## 📝 Checklist de Release

- [ ] CHANGELOG atualizado
- [ ] Versão incrementada em `tauri.conf.json` e `Cargo.toml`
- [ ] Testes E2E passando
- [ ] Build local funcionando
- [ ] Tag criada e push feito
- [ ] Aguardar CI/CD concluir
- [ ] Verificar artefatos no GitHub Release
- [ ] Testar instalação em plataforma limpa
- [ ] Testar atualização de versão anterior

## 🔗 Links Úteis

- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater)
- [GitHub Actions for Tauri](https://tauri.app/v1/guides/building/github-actions)
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Semantic Versioning](https://semver.org/)

## 🐛 Troubleshooting

### Update não detectado

- Verifique se `pubkey` está correto
- Confirme que `latest.json` foi gerado
- Verifique logs do console (F12)

### Download falha

- Verifique conexão internet
- Confirme que assets estão públicos no Release
- Tente download manual do GitHub Release

### Instalação falha

- Windows: Execute como administrador
- Linux: Verifique permissões
- Logs em `~/.giro/logs/`

---

**Última atualização**: 10 de Janeiro de 2026
