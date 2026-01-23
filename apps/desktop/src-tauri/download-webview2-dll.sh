#!/usr/bin/env bash
# Script: Download WebView2Loader.dll
# Descrição: Baixa a DLL oficial da Microsoft necessária para o target x86_64-pc-windows-gnu

set -e

VERSION="1.0.2903.40" # Versão estável recente
PACKAGE_URL="https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$VERSION"
TEMP_DIR="tmp_webview2"
OUTPUT_DIR="libs/x64"

echo "📥 Baixando Microsoft.Web.WebView2 version $VERSION..."

# Criar diretórios
mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

# Baixar o pacote NuGet (.nupkg é um .zip)
curl -L "$PACKAGE_URL" -o "$TEMP_DIR/package.zip"

# Extrair apenas a DLL necessária para x64
echo "📦 Extraindo WebView2Loader.dll para x64..."
unzip -o "$TEMP_DIR/package.zip" "build/native/x64/WebView2Loader.dll" -d "$TEMP_DIR"

# Mover para o diretório final
mv "$TEMP_DIR/build/native/x64/WebView2Loader.dll" "$OUTPUT_DIR/"

# Limpar temporários
rm -rf "$TEMP_DIR"

echo "✅ WebView2Loader.dll salva em: $OUTPUT_DIR/WebView2Loader.dll"
