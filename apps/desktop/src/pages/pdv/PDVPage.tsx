/**
 * @file PDVPage - Página principal do Ponto de Venda
 * @description Tela de vendas com busca, carrinho e finalização
 */

import { CartItemRow } from '@/components/pdv/CartItemRow';
import { PaymentModal } from '@/components/pdv/PaymentModal';
import { ProductSearchResults } from '@/components/pdv/ProductSearchResults';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore } from '@/stores/pdv-store';
import { type Product } from '@/types';
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Percent,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const PDVPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { items, discount, addItem, getSubtotal, getTotal, clearCart } = usePDVStore();
  const { currentSession } = useAuthStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Buscar produto
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearch(true);
      }
      // F10 - Finalizar venda
      if (e.key === 'F10') {
        e.preventDefault();
        if (items.length > 0 && currentSession) {
          setShowPaymentModal(true);
        }
      }
      // Escape - Fechar modais
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowPaymentModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, currentSession]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 1) {
      setShowSearch(true);
    } else {
      setShowSearch(false);
    }
  }, []);

  const handleProductSelected = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        quantity: product.isWeighted ? 1 : 1,
        unitPrice: product.salePrice,
        unit: product.unit,
        isWeighted: product.isWeighted,
      });
      setSearchQuery('');
      setShowSearch(false);
      searchInputRef.current?.focus();
    },
    [addItem]
  );

  if (!currentSession) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-16 w-16 text-warning" />
        <h2 className="text-2xl font-bold">Caixa Fechado</h2>
        <p className="text-muted-foreground">Abra o caixa para iniciar as vendas</p>
        <Button size="lg" className="mt-4" onClick={() => navigate('/cash')}>
          Abrir Caixa
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Área de Itens (60%) */}
      <div className="flex flex-[3] flex-col gap-4">
        {/* Barra de Busca */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar produto por nome ou código (F2)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-12 pl-10 text-lg"
              autoFocus
            />
            <span className="kbd absolute right-3 top-1/2 -translate-y-1/2">F2</span>
          </div>

          {/* Resultados da busca */}
          {showSearch && searchQuery && (
            <ProductSearchResults
              query={searchQuery}
              onSelect={handleProductSelected}
              onClose={() => setShowSearch(false)}
            />
          )}
        </Card>

        {/* Lista de Itens */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Itens da Venda
                {itemCount > 0 && (
                  <Badge variant="secondary">
                    {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                  </Badge>
                )}
              </CardTitle>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-60px)] p-0">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 opacity-50" />
                <p>Nenhum produto adicionado</p>
                <p className="text-sm">Use a busca ou leia um código de barras</p>
              </div>
            ) : (
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <CartItemRow key={item.id} item={item} index={index + 1} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Painel de Totais (40%) */}
      <div className="flex w-80 flex-col gap-4">
        {/* Resumo */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-money font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Desconto */}
            {discount > 0 && (
              <div className="flex justify-between text-lg text-destructive">
                <span className="flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Desconto
                </span>
                <span className="text-money">-{formatCurrency(discount)}</span>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between">
              <span className="text-2xl font-bold">Total</span>
              <span className="text-money text-3xl font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </Card>

        {/* Ações de Pagamento */}
        <Card className="flex-1 p-4">
          <div className="flex h-full flex-col gap-3">
            <h3 className="mb-2 text-lg font-semibold">Finalizar Venda</h3>

            <Button
              size="lg"
              className="h-14 text-lg"
              disabled={items.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              <Banknote className="mr-2 h-5 w-5" />
              Dinheiro
              <span className="kbd ml-auto">F10</span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-14 text-lg"
              disabled={items.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              <QrCode className="mr-2 h-5 w-5" />
              PIX
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-14 text-lg"
              disabled={items.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Cartão
            </Button>

            <div className="mt-auto">
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                disabled={items.length === 0}
                onClick={clearCart}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar Venda (Esc)
              </Button>
            </div>
          </div>
        </Card>

        {/* Atalhos de Teclado */}
        <Card className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="kbd">F2</span>
              <span>Buscar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="kbd">F4</span>
              <span>Quantidade</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="kbd">F6</span>
              <span>Desconto</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="kbd">F10</span>
              <span>Finalizar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="kbd">F12</span>
              <span>Remover</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="kbd">Esc</span>
              <span>Cancelar</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          total={total}
        />
      )}
    </div>
  );
};
