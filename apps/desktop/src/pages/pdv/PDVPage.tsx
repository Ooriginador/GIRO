/**
 * @file PDVPage - Página principal do Ponto de Venda
 * @description Tela de vendas com busca, carrinho e finalização
 */

import { CartItemRow } from '@/components/pdv/CartItemRow';
import { PaymentModal } from '@/components/pdv/PaymentModal';
import { ProductSearchResults } from '@/components/pdv/ProductSearchResults';
import { CustomerSearch } from '@/components/motoparts/CustomerSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore } from '@/stores/pdv-store';
import { type Product } from '@/types';
import { useCustomers, Customer } from '@/hooks/useCustomers';
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
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    discount,
    addItem,
    getSubtotal,
    getTotal,
    clearCart,
    removeItem,
    updateQuantity,
    setDiscount,
    customerId,
    setCustomer,
  } = usePDVStore();
  const { currentSession } = useAuthStore();
  const { getCustomerById } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Carregar cliente se houver customerId no store
  useEffect(() => {
    if (customerId && !selectedCustomer) {
      getCustomerById(customerId).then(setSelectedCustomer);
    }
  }, [customerId, getCustomerById, selectedCustomer]);

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setCustomer(customer?.id || null);
  };

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
      // F4 - Alterar quantidade do último item
      if (e.key === 'F4') {
        e.preventDefault();
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          if (lastItem) {
            setSelectedItemId(lastItem.id);
            setQuantityInput(lastItem.quantity.toString());
            setShowQuantityModal(true);
            setTimeout(() => quantityInputRef.current?.select(), 100);
          }
        }
      }
      // F6 - Aplicar desconto geral
      if (e.key === 'F6') {
        e.preventDefault();
        if (items.length > 0) {
          setDiscountInput(discount.toFixed(2));
          setShowDiscountModal(true);
          setTimeout(() => discountInputRef.current?.select(), 100);
        }
      }
      // F10 - Finalizar venda
      if (e.key === 'F10') {
        e.preventDefault();
        if (items.length > 0 && currentSession) {
          setShowPaymentModal(true);
        }
      }
      // F12 - Remover último item
      if (e.key === 'F12') {
        e.preventDefault();
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          if (lastItem) {
            removeItem(lastItem.id);
          }
        }
      }
      // Escape - Fechar modais
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowPaymentModal(false);
        setShowQuantityModal(false);
        setShowDiscountModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, currentSession, discount, removeItem]);

  const handleQuantityConfirm = () => {
    if (selectedItemId && quantityInput) {
      const qty = parseFloat(quantityInput.replace(',', '.'));
      if (qty > 0) {
        updateQuantity(selectedItemId, qty);
      }
    }
    setShowQuantityModal(false);
    setSelectedItemId(null);
    setQuantityInput('');
    searchInputRef.current?.focus();
  };

  const handleDiscountConfirm = () => {
    const discountValue = parseFloat(discountInput.replace(',', '.')) || 0;
    setDiscount(Math.max(0, discountValue));
    setShowDiscountModal(false);
    setDiscountInput('');
    searchInputRef.current?.focus();
  };

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
    <>
      <main id="pdv" role="main" aria-label="Ponto de Venda" className="flex h-full gap-4">
        {/* Área de Itens (60%) */}
        <section role="region" aria-label="Área de itens" className="flex flex-[3] flex-col gap-4">
          {/* Barra de Busca */}
          <Card className="p-4 border-none bg-card/50 backdrop-blur-sm shadow-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar produto por nome ou código (F2)"
                aria-label="Buscar produto"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-12 pl-10 text-lg"
                autoFocus
              />
              <span className="kbd absolute right-3 top-1/2 -translate-y-1/2">F2</span>
            </div>

            {/* Resultados da busca de produtos */}
            {showSearch && searchQuery && (
              <ProductSearchResults
                query={searchQuery}
                onSelect={handleProductSelected}
                onClose={() => setShowSearch(false)}
              />
            )}
          </Card>

          {/* Seleção de Cliente */}
          <Card className="p-4 border-none bg-card/50 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-2 block text-sm font-medium">Cliente (Opcional)</Label>
                <CustomerSearch
                  selectedCustomer={selectedCustomer}
                  onSelect={handleCustomerSelect}
                  placeholder="Vincular cliente à venda..."
                />
              </div>
            </div>
          </Card>

          {/* Lista de Itens */}
          <Card className="flex-1 overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-md">
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
        </section>

        {/* Painel de Totais (40%) */}
        <aside
          role="region"
          aria-label="Painel de totais e pagamento"
          className="flex w-80 flex-col gap-4"
        >
          {/* Resumo */}
          <Card className="p-4 border-none bg-card/50 backdrop-blur-sm shadow-md">
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
          <Card className="flex-1 p-4 border-none bg-card/50 backdrop-blur-sm shadow-md">
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
          <Card className="p-3 border-none bg-card/50 backdrop-blur-sm shadow-md">
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
        </aside>

        {/* Modal de Pagamento */}
        {showPaymentModal && (
          <PaymentModal
            open={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            total={total}
          />
        )}

        {/* Modal de Quantidade (F4) */}
        <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Quantidade</DialogTitle>
              <DialogDescription>
                Digite a nova quantidade para o item selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="quantity">Nova quantidade</Label>
              <Input
                ref={quantityInputRef}
                id="quantity"
                type="text"
                inputMode="decimal"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleQuantityConfirm();
                  }
                }}
                className="mt-2 h-12 text-xl text-center"
                placeholder="0"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuantityModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleQuantityConfirm}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar Desconto</DialogTitle>
            <DialogDescription>
              Informe o valor do desconto a ser aplicado no total da venda.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="discount">Valor do desconto (R$)</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                R$
              </span>
              <Input
                ref={discountInputRef}
                id="discount"
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDiscountConfirm();
                  }
                }}
                className="h-12 pl-10 text-xl text-center"
                placeholder="0,00"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Subtotal: {formatCurrency(subtotal)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDiscountConfirm}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
