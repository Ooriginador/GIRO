# 🔑 Configuração de Chaves de Assinatura - GIRO

## ⚠️ Importante

Para o sistema de atualização automática funcionar corretamente, você precisa configurar as chaves de assinatura Tauri.

## 📝 Passos para Configuração

### 1. Instalar Tauri CLI (se ainda não tiver)

```bash
cargo install tauri-cli --version "^2.0.0"
```

### 2. Gerar Par de Chaves

```bash
# Criar diretório para chaves
mkdir -p ~/.tauri

# Gerar chaves (será solicitada uma senha)
cargo tauri signer generate -w ~/.tauri/giro.key

# A senha deve ter pelo menos 8 caracteres
# GUARDE ESTA SENHA EM LOCAL SEGURO!
```

Isso irá gerar:
- `~/.tauri/giro.key` - Chave privada (NUNCA COMMITAR!)
- Output no terminal com a chave pública

### 3. Copiar Chave Pública

A saída será algo como:

```
Your keypair was generated successfully!

Private key: ~/.tauri/giro.key (keep it secret!)
Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IERDOUU0RkE1RDk0MjEwNDkKUldUeHAvZlJjSEN0VFM3UUtHNGNEcnFiNEhMQm1wMTFWZEt2RU9LVkxXN1I0eTZxUGFEMW9TcmIK
```

**Copie a chave pública (a string grande depois de "Public key:")**.

### 4. Atualizar tauri.conf.json

Edite `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://jhonslife.github.io/GIRO/updater/{{target}}/{{current_version}}"
      ],
      "dialog": false,
      "pubkey": "COLE_SUA_CHAVE_PÚBLICA_AQUI"
    }
  }
}
```

### 5. Configurar GitHub Secrets

#### Via GitHub Web Interface:

1. Vá para: https://github.com/jhonslife/GIRO/settings/secrets/actions
2. Clique em "New repository secret"
3. Adicione os seguintes secrets:

**Secret 1:**
- Name: `TAURI_SIGNING_PRIVATE_KEY`
- Value: Conteúdo completo do arquivo `~/.tauri/giro.key`

```bash
# Copiar conteúdo da chave privada
cat ~/.tauri/giro.key
# Cole todo o conteúdo no GitHub
```

**Secret 2:**
- Name: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Value: A senha que você usou ao gerar a chave

#### Via GitHub CLI (alternativa):

```bash
# Ler chave privada
PRIVATE_KEY=$(cat ~/.tauri/giro.key)

# Adicionar secret da chave privada
gh secret set TAURI_SIGNING_PRIVATE_KEY --body "$PRIVATE_KEY" --repo jhonslife/GIRO

# Adicionar secret da senha (substitua YOUR_PASSWORD)
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body "YOUR_PASSWORD" --repo jhonslife/GIRO
```

### 6. Fazer Commit e Push

```bash
cd ~/GIRO
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore: update updater public key"
git push origin main
```

### 7. Habilitar GitHub Pages

1. Vá para: https://github.com/jhonslife/GIRO/settings/pages
2. Em "Source", selecione "GitHub Actions"
3. Clique em "Save"

## ✅ Verificação

Após configurar tudo:

1. Faça push do código
2. Aguarde workflow `.github/workflows/pages.yml` completar
3. Acesse: https://jhonslife.github.io/GIRO
4. Você deve ver a landing page!

## 🚀 Criar Primeira Release

```bash
# Incrementar versão em tauri.conf.json e Cargo.toml para 1.0.0
# Criar tag
git tag v1.0.0
git push origin v1.0.0

# Aguardar workflow de release completar
# Verificar em: https://github.com/jhonslife/GIRO/releases
```

## 📋 Checklist Completo

- [ ] Tauri CLI instalado
- [ ] Par de chaves gerado
- [ ] Chave pública copiada e adicionada ao tauri.conf.json
- [ ] `TAURI_SIGNING_PRIVATE_KEY` secret configurado no GitHub
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret configurado no GitHub
- [ ] GitHub Pages habilitado com source "GitHub Actions"
- [ ] Commit e push realizados
- [ ] Landing page acessível em https://jhonslife.github.io/GIRO
- [ ] Tag v1.0.0 criada e push feito
- [ ] Release build completado com sucesso

## 🔒 Segurança

⚠️ **NUNCA:**
- Commite o arquivo `.key`
- Compartilhe a chave privada
- Exponha a senha em logs ou código

✅ **SEMPRE:**
- Mantenha backup seguro da chave e senha
- Use GitHub Secrets para dados sensíveis
- Revogue e regenere chaves se comprometidas

## 🆘 Troubleshooting

### Erro: "Invalid signature"
- Verifique se a public key no tauri.conf.json está correta
- Confirme que os GitHub Secrets estão configurados

### Erro: "Pages deployment failed"
- Verifique se GitHub Pages está habilitado
- Confirme que o source está em "GitHub Actions"

### Workflow não roda
- Verifique se os secrets estão disponíveis para o repositório
- Confirme que as permissões do workflow estão corretas

## 📚 Referências

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Pages with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

---

**Última atualização**: 10 de Janeiro de 2026
