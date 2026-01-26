/**
 * @file ProductSearchResults - Resultados da busca de produtos
 * @description Dropdown com produtos encontrados na busca
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/use-products';
import { useProductByBarcode } from '@/hooks/use-products';
import { cn, formatCurrency } from '@/lib/utils';
import { type Product } from '@/types';
import { AlertTriangle, Loader2, Package } from 'lucide-react';
import { useEffect, useState, useMemo, type FC } from 'react';

interface ProductSearchResultsProps {
  query: string;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

/**
 * Detecta se a query parece ser um código de barras
 * Códigos de barras típicos: EAN-13 (13 dígitos), UPC (12), EAN-8 (8)
 */
function isLikelyBarcode(query: string): boolean {
  const trimmed = query.trim();
  // Só dígitos e comprimento típico de barcode
  return /^\d+$/.test(trimmed) && [8, 12, 13, 14].includes(trimmed.length);
}

interface ProductSearchResultsProps {
  query: string;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export const ProductSearchResults: FC<ProductSearchResultsProps> = ({
  query,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Detectar se é busca por barcode ou texto
  const searchMode = useMemo(() => (isLikelyBarcode(query) ? 'barcode' : 'text'), [query]);

  // Busca por barcode (se detectado)
  const { data: barcodeProduct, isLoading: isLoadingBarcode } = useProductByBarcode(
    searchMode === 'barcode' ? query.trim() : null
  );

  // Busca por texto (sempre ativa como fallback)
  const { data: textProducts, isLoading: isLoadingText } = useProducts({
    search: query,
    isActive: true,
  });

  // Combinar resultados: barcode tem prioridade
  const products = useMemo(() => {
    if (searchMode === 'barcode' && barcodeProduct) {
      return [barcodeProduct];
    }
    return textProducts || [];
  }, [searchMode, barcodeProduct, textProducts]);

  const isLoading = searchMode === 'barcode' ? isLoadingBarcode : isLoadingText;

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!products || products.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, products.length - 1);
            // Scroll suave para o item selecionado
            scrollToSelected(newIndex);
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            // Scroll suave para o item selecionado
            scrollToSelected(newIndex);
            return newIndex;
          });
          break;
        case 'Enter': {
          e.preventDefault();
          const product = products[selectedIndex];
          if (product) {
            onSelect(product);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    const scrollToSelected = (index: number) => {
      const element = document.querySelector(`[data-product-index="${index}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, selectedIndex, onSelect, onClose]);

  // Reset selected index quando query muda E quando produtos carregam
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, products?.length]);

  if (isLoading) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {searchMode === 'barcode' ? 'Buscando por código de barras...' : 'Buscando...'}
          </span>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>Nenhum produto encontrado</span>
          {searchMode === 'barcode' && (
            <span className="text-xs">
              Código de barras: <code className="px-1 py-0.5 bg-muted rounded">{query}</code>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-card shadow-lg">
      <ScrollArea className="max-h-80">
        <div className="p-2">
          {products.map((product, index) => (
            <button
              key={product.id}
              data-product-index={index}
              type="button"
              onClick={() => onSelect(product)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md p-3 text-left',
                'transition-colors hover:bg-accent focus:bg-accent focus:outline-none',
                index === selectedIndex && 'bg-accent ring-2 ring-primary/20'
              )}
              tabIndex={-1}
            >
              {/* Info do produto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{product.name}</span>
                  {product.isWeighted && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Pesável
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{product.internalCode}</span>
                  {product.barcode && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{product.barcode}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Estoque */}
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    'text-sm font-medium',
                    product.currentStock <= 0 && 'text-destructive',
                    product.currentStock > 0 &&
                      product.currentStock <= product.minStock &&
                      'text-warning'
                  )}
                >
                  {product.currentStock <= 0 ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Sem estoque
                    </span>
                  ) : (
                    `${product.currentStock} em estoque`
                  )}
                </div>
              </div>

              {/* Preço */}
              <div className="text-money text-lg font-bold w-28 text-right shrink-0">
                {formatCurrency(product.salePrice)}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Indicador de resultados */}
      <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          {searchMode === 'barcode' && (
            <Badge variant="outline" className="ml-2 text-xs">
              Busca por código
            </Badge>
          )}
        </span>
        <span>Use ↑↓ para navegar • Enter para selecionar</span>
      </div>
    </div>
  );
};
