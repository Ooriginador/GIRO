#!/usr/bin/env bash
# Script simples para captura de screenshots

OUTPUT_DIR="/home/jhonslife/giro-website/public/screenshots"

echo "📸 CAPTURA DE SCREENSHOTS - GIRO"
echo ""
echo "Telas para capturar:"
echo "1. pdv - Tela do PDV/Caixa"
echo "2. produtos - Lista de produtos"
echo "3. estoque - Controle de estoque"
echo "4. relatorios - Relatórios e analytics"
echo "5. configuracoes - Configurações do sistema"
echo "6. fiado - Controle de fiado/crediário"
echo ""
echo "Navegue até a tela e pressione ENTER para capturar"
echo ""

capture() {
    local name=$1
    echo "Capturando: $name"
    sleep 2
    gnome-screenshot --window --file="$OUTPUT_DIR/${name}.png" 2>/dev/null || \
    import -window root "$OUTPUT_DIR/${name}.png" 2>/dev/null || \
    scrot -u "$OUTPUT_DIR/${name}.png" 2>/dev/null
    
    if [ -f "$OUTPUT_DIR/${name}.png" ]; then
        echo "✅ $name.png salvo"
        # Converter para WebP
        convert "$OUTPUT_DIR/${name}.png" -quality 90 "$OUTPUT_DIR/${name}.webp" 2>/dev/null
        echo "✅ $name.webp salvo"
    fi
    echo ""
}

# Captura interativa
read -p "Aperte ENTER para capturar PDV..." 
capture "pdv"

read -p "Navegue para PRODUTOS e aperte ENTER..." 
capture "produtos"

read -p "Navegue para ESTOQUE e aperte ENTER..." 
capture "estoque"

read -p "Navegue para RELATÓRIOS e aperte ENTER..." 
capture "relatorios"

read -p "Navegue para CONFIGURAÇÕES e aperte ENTER..." 
capture "configuracoes"

read -p "Navegue para FIADO e aperte ENTER..." 
capture "fiado"

echo ""
echo "✅ Captura concluída!"
echo "📁 Screenshots em: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
