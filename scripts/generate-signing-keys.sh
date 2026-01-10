#!/bin/bash
# Script para gerar chaves de assinatura do Tauri

echo "🔐 Gerando chaves de assinatura para Tauri Updater"
echo "=================================================="
echo ""

# Verificar se tauri-cli está instalado
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo não encontrado. Instale primeiro:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Criar diretório para chaves se não existir
mkdir -p ~/.tauri

# Gerar chaves
echo "📝 Gerando par de chaves..."
echo "⚠️  IMPORTANTE: Guarde a senha com segurança!"
echo ""

# Usar cargo para gerar via tauri CLI
if ! command -v tauri &> /dev/null; then
    echo "📦 Instalando tauri-cli..."
    cargo install tauri-cli --version "^2.0.0"
fi

# Gerar chave
KEY_FILE="$HOME/.tauri/giro-signing.key"
echo ""
echo "🔑 Gerando chave em: $KEY_FILE"
echo ""

tauri signer generate -w "$KEY_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Chaves geradas com sucesso!"
    echo ""
    echo "📋 PRÓXIMOS PASSOS:"
    echo "=================="
    echo ""
    echo "1️⃣  Copiar a CHAVE PRIVADA para GitHub Secrets:"
    echo "   Secret Name: TAURI_SIGNING_PRIVATE_KEY"
    echo "   Valor: (copie todo o conteúdo de $KEY_FILE)"
    echo ""
    cat "$KEY_FILE"
    echo ""
    echo ""
    echo "2️⃣  Copiar a SENHA da chave para GitHub Secrets:"
    echo "   Secret Name: TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
    echo "   Valor: (a senha que você definiu acima)"
    echo ""
    echo "3️⃣  Copiar a CHAVE PÚBLICA para tauri.conf.json:"
    echo "   Campo: plugins.updater.pubkey"
    echo "   Valor: (mostrado acima durante a geração)"
    echo ""
    echo "4️⃣  Adicionar os secrets em:"
    echo "   https://github.com/jhonslife/GIRO/settings/secrets/actions"
    echo ""
    echo "🎉 Configuração completa! Agora você pode fazer releases seguras."
else
    echo "❌ Erro ao gerar chaves. Tente novamente."
    exit 1
fi
