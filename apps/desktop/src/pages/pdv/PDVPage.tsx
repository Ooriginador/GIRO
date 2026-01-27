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
import { useToast } from '@/hooks/use-toast';
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
  Send,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LabeledShortcut, pdvShortcuts } from '@/components/pdv/KeyboardShortcut';
import { HelpCircle } from 'lucide-react';
import { commands } from '@/lib/bindings';
import { usePDVKeyboard } from '@/hooks/use-keyboard';

export const PDVPage: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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
    heldSales,
    holdSale,
    resumeSale,
    removeHeldSale,
    loadHeldSales,
  } = usePDVStore();
  const { currentSession, employee, hasPermission } = useAuthStore();
  const { getCustomerById } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Verificar se é atendente (não pode finalizar pagamento)
  const isAttendant = employee?.role === 'ATTENDANT';

  // Carregar cliente se houver customerId no store
  useEffect(() => {
    if (customerId && !selectedCustomer) {
      getCustomerById(customerId).then(setSelectedCustomer);
    }
    // Carregar vendas em espera ao montar
    loadHeldSales();
  }, [customerId, getCustomerById, selectedCustomer, loadHeldSales]);

  // Debounce para busca de produtos (300ms)
  useEffect(() => {
    // Limpar timeout anterior
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Se a busca estiver vazia, atualizar imediatamente
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      setShowSearch(false);
      return;
    }

    // Configurar novo timeout
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setShowSearch(true);
    }, 300);

    // Cleanup
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setCustomer(customer?.id || null);
  };

  // Enviar pedido para o caixa (atendente) e imprimir
  const handleSendToCashier = async () => {
    if (items.length === 0) return;

    try {
      // 1. Salvar o pedido
      await holdSale();

      // 2. Preparar dados para impressão
      const orderReceipt = {
        companyName: 'GIRO Motopeças',
        companyAddress: '',
        companyPhone: null,
        orderNumber: new Date().getTime().toString().slice(-8),
        dateTime: new Date().toLocaleString('pt-BR'),
        attendantName: employee?.name || 'Atendente',
        customerName: selectedCustomer?.name || null,
        customerPhone: selectedCustomer?.phone || null,
        items: items.map((item) => ({
          code: item.productId.slice(0, 8),
          name: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice - item.discount,
        })),
        subtotal,
        discount,
        total,
        notes: null,
      };

      // 3. Imprimir (se impressora configurada)
      const printResult = await commands.printAttendantOrder(orderReceipt);
      if (printResult.status === 'error') {
        console.warn('Impressora não disponível:', printResult.error);
        // Não bloqueia o fluxo se impressora falhar
      }
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Atalhos de teclado usando o hook centralizado
  usePDVKeyboard({
    onHelp: () => setShowHelpModal(true),
    onSearch: () => {
      searchInputRef.current?.focus();
      setShowSearch(true);
    },
    onQuantity: () => {
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          setSelectedItemId(lastItem.id);
          setQuantityInput(lastItem.quantity.toString());
          setShowQuantityModal(true);
          setTimeout(() => quantityInputRef.current?.select(), 100);
        }
      }
    },
    onDiscount: () => {
      if (items.length > 0) {
        // Check permission before allowing discount
        if (!hasPermission('pdv.discount.basic')) {
          toast.warning(
            'Permissão negada',
            'Você não tem permissão para aplicar descontos. Solicite a um supervisor.'
          );
          return;
        }
        setDiscountInput(discount.toFixed(2));
        setShowDiscountModal(true);
        setTimeout(() => discountInputRef.current?.select(), 100);
      }
    },
    onHold: () => {
      if (items.length > 0) {
        holdSale();
      }
    },
    onResume: () => setShowRecoverModal(true),
    onFinalize: () => {
      if (items.length > 0 && currentSession) {
        setShowPaymentModal(true);
      }
    },
    onDrawer: () => commands.openCashDrawer(),
    onCancelItem: () => {
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          removeItem(lastItem.id);
        }
      }
    },
    onCancel: () => {
      const anyModalOpen =
        showSearch ||
        showPaymentModal ||
        showQuantityModal ||
        showDiscountModal ||
        showHelpModal ||
        showClearConfirm ||
        showRecoverModal;

      if (anyModalOpen) {
        setShowSearch(false);
        setShowPaymentModal(false);
        setShowQuantityModal(false);
        setShowDiscountModal(false);
        setShowHelpModal(false);
        setShowClearConfirm(false);
        setShowRecoverModal(false);
        searchInputRef.current?.focus();
      } else if (items.length > 0) {
        setShowClearConfirm(true);
      }
    },
  });

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
    // O debounce effect cuidará de atualizar debouncedSearchQuery e showSearch
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleProductSelected = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: product.salePrice,
        unit: product.unit,
        isWeighted: product.isWeighted,
      });

      // Limpar busca completamente
      handleCloseSearch();

      if (product.isWeighted) {
        // Como o addItem no store gera seu próprio ID e é síncrono (zustand),
        // precisamos encontrar o item recém adicionado.
        setTimeout(() => {
          const lastItem = usePDVStore.getState().items.slice(-1)[0];
          if (lastItem && lastItem.productId === product.id) {
            setSelectedItemId(lastItem.id);
            setQuantityInput('');
            setShowQuantityModal(true);
            setTimeout(() => quantityInputRef.current?.focus(), 100);
          }
        }, 10);
      } else {
        searchInputRef.current?.focus();
      }
    },
    [addItem, handleCloseSearch]
  );

  if (!currentSession) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" role="alert">
        <AlertCircle className="h-16 w-16 text-warning" aria-hidden="true" />
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
          <Card
            className="relative z-20 p-4 border-none bg-card/50 backdrop-blur-sm shadow-md"
            role="search"
            aria-label="Busca de produtos"
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar produto por nome ou código (F2)"
                aria-label="Buscar produto por nome ou código de barras"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-12 pl-10 text-lg"
                autoFocus
                data-tutorial="product-search"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setShowHelpModal(true)}
                  aria-label="Ajuda e atalhos de teclado (F1)"
                >
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                </Button>
                <span className="kbd text-xs" aria-hidden="true">
                  F2
                </span>
              </div>
            </div>

            {/* Resultados da busca de produtos */}
            {showSearch && debouncedSearchQuery && (
              <ProductSearchResults
                query={debouncedSearchQuery}
                onSelect={handleProductSelected}
                onClose={handleCloseSearch}
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
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Itens da Venda
                  {itemCount > 0 && (
                    <Badge
                      variant="secondary"
                      aria-label={`${itemCount} ${itemCount === 1 ? 'item' : 'itens'} no carrinho`}
                    >
                      {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                    </Badge>
                  )}
                </CardTitle>
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowClearConfirm(true)}
                    aria-label="Limpar carrinho"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)] p-0" data-tutorial="cart-items">
              {items.length === 0 ? (
                <div
                  className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"
                  role="status"
                  aria-label="Carrinho vazio"
                >
                  <ShoppingCart className="h-12 w-12 opacity-50" aria-hidden="true" />
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
          <Card
            className="p-4 border-none bg-card/50 backdrop-blur-sm shadow-md"
            data-tutorial="cart-totals"
          >
            <div className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-money font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {/* Desconto */}
              {discount > 0 && (
                <div
                  className="flex justify-between text-lg text-destructive"
                  role="status"
                  aria-label={`Desconto aplicado: ${formatCurrency(discount)}`}
                >
                  <span className="flex items-center gap-1">
                    <Percent className="h-4 w-4" aria-hidden="true" />
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
              {/* Atendente: Enviar para Caixa */}
              {isAttendant ? (
                <>
                  <h3 className="mb-2 text-lg font-semibold text-cyan-600">📋 Criar Pedido</h3>

                  <Button
                    size="lg"
                    className="h-16 text-lg bg-cyan-600 hover:bg-cyan-700"
                    disabled={items.length === 0}
                    onClick={handleSendToCashier}
                    data-tutorial="send-to-cashier"
                    aria-label="Enviar pedido para o caixa (F10)"
                  >
                    <Send className="mr-2 h-6 w-6" aria-hidden="true" />
                    Enviar para Caixa
                    <span className="kbd ml-auto" aria-hidden="true">
                      F10
                    </span>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    O pedido será enviado para o caixa finalizar o pagamento
                  </p>
                </>
              ) : (
                <>
                  {/* Caixa/Admin: Finalizar Venda */}
                  <h3 className="mb-2 text-lg font-semibold">Finalizar Venda</h3>

                  <Button
                    size="lg"
                    className="h-14 text-lg"
                    disabled={items.length === 0}
                    onClick={() => setShowPaymentModal(true)}
                    data-tutorial="finalize-button"
                    aria-label="Finalizar venda em dinheiro (F10)"
                  >
                    <Banknote className="mr-2 h-5 w-5" aria-hidden="true" />
                    Dinheiro
                    <span className="kbd ml-auto" aria-hidden="true">
                      F10
                    </span>
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 text-lg"
                    disabled={items.length === 0}
                    onClick={() => setShowPaymentModal(true)}
                    aria-label="Finalizar venda via PIX"
                  >
                    <QrCode className="mr-2 h-5 w-5" aria-hidden="true" />
                    PIX
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 text-lg"
                    disabled={items.length === 0}
                    onClick={() => setShowPaymentModal(true)}
                    aria-label="Finalizar venda no cartão"
                  >
                    <CreditCard className="mr-2 h-5 w-5" aria-hidden="true" />
                    Cartão
                  </Button>
                </>
              )}

              <div className="mt-auto">
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={items.length === 0}
                  onClick={() => setShowClearConfirm(true)}
                  aria-label="Cancelar venda atual (Esc)"
                >
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Cancelar Venda (Esc)
                </Button>
              </div>
            </div>
          </Card>

          {/* Atalhos de Teclado */}
          <Card
            className="p-3 border-none bg-card/50 backdrop-blur-sm shadow-md"
            aria-label="Atalhos de teclado disponíveis"
          >
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground" role="list">
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd">F2</kbd>
                <span>Buscar</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd">F4</kbd>
                <span>Quantidade</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F6</kbd>
                <span>Desc.</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F8</kbd>
                <span>Pause</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F9</kbd>
                <span>Recup.</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F10</kbd>
                <span>Fim</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F11</kbd>
                <span>Gaveta</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">F12</kbd>
                <span>Rem.</span>
              </div>
              <div className="flex items-center gap-1" role="listitem">
                <kbd className="kbd text-[10px]">Esc</kbd>
                <span>Canc.</span>
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

      {/* Modal de Ajuda (F1) */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              Atalhos do Teclado
            </DialogTitle>
            <DialogDescription>
              Comandos rápidos para operar o PDV com eficiência.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {pdvShortcuts.map((item) => (
              <LabeledShortcut key={item.shortcut} label={item.label} shortcut={item.shortcut} />
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpModal(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Limpar Carrinho */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar Venda?</DialogTitle>
            <DialogDescription>
              Isso removerá todos os itens do carrinho. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Não, manter
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCart();
                setShowClearConfirm(false);
              }}
            >
              Sim, cancelar (Esc)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recuperar Venda (F9) */}
      <Dialog open={showRecoverModal} onOpenChange={setShowRecoverModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vendas em Espera</DialogTitle>
            <DialogDescription>Selecione uma venda pausada para recuperar.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {heldSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" role="status">
                Nenhuma venda pausada.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2" role="list" aria-label="Lista de vendas pausadas">
                  {heldSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      onClick={() => {
                        if (items.length > 0) {
                          toast.warning(
                            'Carrinho não vazio',
                            'Finalize ou cancele a venda atual antes de recuperar uma venda pausada.'
                          );
                          return;
                        }
                        resumeSale(sale.id);
                        setShowRecoverModal(false);
                        toast.success(
                          'Venda recuperada',
                          'A venda pausada foi carregada no carrinho.'
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (items.length > 0) {
                            toast.warning(
                              'Carrinho não vazio',
                              'Finalize ou cancele a venda atual antes de recuperar uma venda pausada.'
                            );
                            return;
                          }
                          resumeSale(sale.id);
                          setShowRecoverModal(false);
                          toast.success(
                            'Venda recuperada',
                            'A venda pausada foi carregada no carrinho.'
                          );
                        }
                      }}
                      tabIndex={0}
                      role="listitem"
                      aria-label={`Venda pausada com ${
                        sale.items.length
                      } itens, total ${formatCurrency(sale.total)}, criada às ${new Date(
                        sale.createdAt
                      ).toLocaleTimeString()}`}
                    >
                      <div>
                        <p className="font-medium">{sale.items.length} itens</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(sale.total)}</p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive h-6 w-6 mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHeldSale(sale.id);
                          }}
                          aria-label={`Remover venda pausada de ${formatCurrency(sale.total)}`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecoverModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
