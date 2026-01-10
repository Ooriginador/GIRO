# 🚀 Guia de Configuração Completa

## 📋 Checklist de Setup

### 1️⃣ Gerar Chaves de Assinatura

Execute o script fornecido:

```bash
./scripts/generate-signing-keys.sh
```

Ou manualmente:

```bash
# Instalar tauri-cli se necessário
cargo install tauri-cli --version "^2.0.0"

# Gerar chaves
tauri signer generate -w ~/.tauri/giro-signing.key
```

**Importante**: Guarde a senha com segurança!

### 2️⃣ Configurar GitHub Secrets

Acesse: https://github.com/jhonslife/GIRO/settings/secrets/actions

Adicione os seguintes secrets:

| Secret Name                          | Valor                               | Onde Encontrar                  |
| ------------------------------------ | ----------------------------------- | ------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Conteúdo completo do arquivo `.key` | `cat ~/.tauri/giro-signing.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Senha que você definiu              | A senha da geração              |

### 3️⃣ Atualizar Chave Pública

Copie a chave pública gerada e atualize em `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "COLE_AQUI_A_CHAVE_PUBLICA_GERADA"
    }
  }
}
```

### 4️⃣ Habilitar GitHub Pages

1. Vá em: https://github.com/jhonslife/GIRO/settings/pages
2. Source: **GitHub Actions**
3. Salvar

O workflow já está configurado para fazer deploy automaticamente!

### 5️⃣ Testar Release

```bash
# Fazer commit se houver mudanças pendentes
git add .
git commit -m "chore: configure release system"
git push

# Criar tag de teste
git tag v1.0.0
git push origin v1.0.0
```

Aguarde o workflow completar em: https://github.com/jhonslife/GIRO/actions

## 📦 Verificar Release

1. Vá em: https://github.com/jhonslife/GIRO/releases
2. Verifique se todos os artefatos foram gerados:
   - ✅ `.exe` (Windows Installer)
   - ✅ `.msi` (Windows MSI)
   - ✅ `.deb` (Linux Debian/Ubuntu)
   - ✅ `.AppImage` (Linux Universal)
   - ✅ `latest.json` (Update Manifest)

## 🌐 Verificar Website

Acesse: https://jhonslife.github.io/GIRO

Deve mostrar:

- ✅ Landing page profissional
- ✅ Botões de download funcionando
- ✅ Links atualizados automaticamente

## 🔄 Testar Auto-Update

1. Instale a versão `v1.0.0`
2. Crie nova versão `v1.0.1`:

   ```bash
   # Atualizar versão em:
   # - apps/desktop/src-tauri/tauri.conf.json
   # - apps/desktop/src-tauri/Cargo.toml

   git add .
   git commit -m "chore: bump version to 1.0.1"
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. Abra o app v1.0.0
4. Deve aparecer notificação de update!

## 🐛 Troubleshooting

### Erro: "tauri-cli not found"

```bash
cargo install tauri-cli --version "^2.0.0"
```

### Erro: "Invalid signature"

- Verifique se a chave pública em `tauri.conf.json` está correta
- Confirme que os secrets no GitHub estão corretos

### Website não aparece

- Aguarde alguns minutos após o primeiro deploy
- Verifique se GitHub Pages está habilitado nas configurações
- Veja logs do workflow em Actions

### Download links quebrados

- Aguarde a release completar
- Verifique se os assets foram gerados corretamente
- JavaScript do site atualiza os links automaticamente

## 📊 Monitoramento

### Ver Downloads

https://github.com/jhonslife/GIRO/releases

Cada release mostra número de downloads por arquivo.

### Ver Deploys

https://github.com/jhonslife/GIRO/deployments

Histórico de deploys do GitHub Pages.

### Ver Workflows

https://github.com/jhonslife/GIRO/actions

Status de todas as execuções de CI/CD.

## ✅ Sistema Completo

Após configurar tudo, você terá:

- ✅ **Auto-Update**: Usuários recebem atualizações automaticamente
- ✅ **Website Profissional**: Landing page com downloads
- ✅ **CI/CD Automatizado**: Build e release automáticos
- ✅ **Assinatura de Código**: Updates verificados e seguros
- ✅ **Multi-Plataforma**: Windows e Linux suportados
- ✅ **Distribuição Fácil**: GitHub Releases + GitHub Pages

---

**Última atualização**: 10 de Janeiro de 2026
