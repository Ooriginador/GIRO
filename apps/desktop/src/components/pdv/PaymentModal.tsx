/**
 * @file PaymentModal - Modal de finalização de venda
 * @description Permite selecionar forma de pagamento e informar valor
 */

import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { useCreateSale } from '@/hooks/useSales';
import { emitNfce, printReceipt, type EmitNfceRequest, type NfceItem } from '@/lib/tauri';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore, type PaymentMethod } from '@/stores/pdv-store';
import { useSettingsStore } from '@/stores/settings-store';
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Plus,
  QrCode,
  Split,
  Ticket,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';

export interface SplitPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onFinalize?: (data: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    splitPayments?: SplitPayment[];
  }) => Promise<void>;
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: string }[] = [
  { method: 'CASH', label: 'Dinheiro', icon: 'banknote' },
  { method: 'PIX', label: 'PIX', icon: 'qr' },
  { method: 'CREDIT', label: 'Crédito', icon: 'card' },
  { method: 'DEBIT', label: 'Débito', icon: 'card' },
  { method: 'VOUCHER', label: 'Vale', icon: 'ticket' },
];

export const PaymentModal: FC<PaymentModalProps> = ({ open, onClose, total, onFinalize }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [splitMethod, setSplitMethod] = useState<PaymentMethod | null>(null);
  const [splitAmount, setSplitAmount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const splitInputRef = useRef<HTMLInputElement>(null);

  const pdvStore = usePDVStore();
  const { employee, currentSession } = useAuthStore();
  const { fiscal, company } = useSettingsStore();
  const createSale = useCreateSale();

  const amountPaidNum = parseFloat(amountPaid.replace(',', '.')) || 0;
  const change = amountPaidNum - total;
  const canFinalize =
    paymentMethod !== null && (paymentMethod !== 'CASH' || amountPaidNum >= total);

  // Split mode calculations
  const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const splitRemaining = total - splitTotal;
  const canFinalizeSplit = splitTotal >= total;

  useEffect(() => {
    if (open && paymentMethod === 'CASH') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, paymentMethod]);

  useEffect(() => {
    if (splitMethod) {
      setTimeout(() => splitInputRef.current?.focus(), 100);
    }
  }, [splitMethod]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPaymentMethod(null);
      setAmountPaid('');
      setIsSplitMode(false);
      setSplitPayments([]);
      setSplitMethod(null);
      setSplitAmount('');
    }
  }, [open]);

  const handleQuickAmount = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  const handleExactAmount = () => {
    setAmountPaid(total.toFixed(2));
  };

  const handleAddSplitPayment = () => {
    if (!splitMethod || !splitAmount) return;
    const amount = parseFloat(splitAmount.replace(',', '.')) || 0;
    if (amount <= 0) return;

    setSplitPayments([...splitPayments, { id: crypto.randomUUID(), method: splitMethod, amount }]);
    setSplitMethod(null);
    setSplitAmount('');
  };

  const handleRemoveSplitPayment = (id: string) => {
    setSplitPayments(splitPayments.filter((p) => p.id !== id));
  };

  const handleFinalize = async () => {
    if (!employee || !currentSession) return;

    setIsProcessing(true);

    try {
      const { items, customerId } = pdvStore;
      let saleResult;

      if (isSplitMode) {
        if (!canFinalizeSplit) return;
        const payments = splitPayments.map((p) => ({
          method: p.method,
          amount: p.amount,
        }));

        if (onFinalize) {
          await onFinalize({
            paymentMethod: splitPayments[0]?.method || 'CASH',
            amountPaid: splitTotal,
            splitPayments,
          });
        } else {
          saleResult = await createSale.mutateAsync({
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
            })),
            payments,
            amountPaid: splitTotal,
            discountValue: pdvStore.discount,
            discountType: 'FIXED',
            discountReason: pdvStore.discountReason,
            employeeId: employee.id,
            cashSessionId: currentSession.id,
            customerId: customerId || undefined,
          });
        }
      } else {
        if (!canFinalize || !paymentMethod) return;
        const payments = [
          {
            method: paymentMethod,
            amount: amountPaidNum || total,
          },
        ];

        if (onFinalize) {
          await onFinalize({
            paymentMethod,
            amountPaid: amountPaidNum || total,
          });
        } else {
          saleResult = await createSale.mutateAsync({
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
            })),
            payments,
            amountPaid: amountPaidNum || total,
            discountValue: pdvStore.discount,
            discountType: 'FIXED',
            discountReason: pdvStore.discountReason,
            employeeId: employee.id,
            cashSessionId: currentSession.id,
            customerId: customerId || undefined,
          });
        }
      }

      // Auto-print receipt
      if (saleResult?.id) {
        printReceipt(saleResult.id).catch((err) => {
          console.error('Falha na impressão automática:', err);
        });
      }

      // NFC-e Integration
      if (fiscal.enabled && saleResult) {
        try {
          const nfceItems: NfceItem[] = items.map((item) => ({
            code: item.productId.substring(0, 10),
            description: item.productName,
            ncm: '00000000',
            cfop: '5102',
            unit: item.unit || 'UN',
            quantity: item.quantity,
            unitValue: item.unitPrice,
            totalValue: item.quantity * item.unitPrice,
            ean: item.barcode,
            icmsOrigin: 0,
            icmsCst: '102',
            pisCst: '07',
            cofinsCst: '07',
          }));

          const request: EmitNfceRequest = {
            saleId: saleResult.id,
            items: nfceItems,
            total: saleResult.total,
            discount: saleResult.discountValue,
            paymentMethod: saleResult.paymentMethod,
            paymentValue: saleResult.amountPaid,
            emitterCnpj: company.cnpj || '',
            emitterName: company.name,
            emitterIe: 'ISENTO',
            emitterAddress: company.address || '',
            emitterCity: company.city || '',
            emitterCityCode: fiscal.cityCode,
            emitterState: company.state || '',
            emitterUf: fiscal.uf,
            emitterCep: fiscal.cep,
            serie: fiscal.serie,
            numero: fiscal.nextNumber,
            environment: fiscal.environment,
            cscId: fiscal.cscId,
            csc: fiscal.csc,
            certPath: fiscal.certPath,
            certPassword: fiscal.certPassword,
          };

          const emission = await emitNfce(request);
          if (emission.success) {
            useSettingsStore.getState().setFiscalConfig({ nextNumber: fiscal.nextNumber + 1 });
          }
        } catch (e) {
          console.error('Falha NFC-e', (e as Error)?.message ?? String(e));
        }
      }

      onClose();
    } catch (error) {
      console.error('Erro ao finalizar:', (error as Error)?.message ?? String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentSelection = () => (
    <div className="grid gap-4">
      <Button
        variant="outline"
        className="h-20 text-lg justify-start gap-4"
        onClick={() => setPaymentMethod('CASH')}
      >
        <Banknote className="h-8 w-8 text-success" />
        <div className="text-left">
          <div className="font-semibold">Dinheiro</div>
          <div className="text-sm text-muted-foreground">Informe o valor recebido</div>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-20 text-lg justify-start gap-4"
        onClick={() => {
          setPaymentMethod('PIX');
          setAmountPaid(total.toFixed(2));
        }}
      >
        <QrCode className="h-8 w-8 text-info" />
        <div className="text-left">
          <div className="font-semibold">PIX</div>
          <div className="text-sm text-muted-foreground">Pagamento instantâneo</div>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-20 text-lg justify-start gap-4"
        onClick={() => {
          setPaymentMethod('CREDIT');
          setAmountPaid(total.toFixed(2));
        }}
      >
        <CreditCard className="h-8 w-8 text-primary" />
        <div className="text-left">
          <div className="font-semibold">Cartão de Crédito</div>
          <div className="text-sm text-muted-foreground">Parcelado ou à vista</div>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-20 text-lg justify-start gap-4"
        onClick={() => {
          setPaymentMethod('DEBIT');
          setAmountPaid(total.toFixed(2));
        }}
      >
        <CreditCard className="h-8 w-8 text-secondary-foreground" />
        <div className="text-left">
          <div className="font-semibold">Cartão de Débito</div>
          <div className="text-sm text-muted-foreground">Débito na hora</div>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-20 text-lg justify-start gap-4"
        onClick={() => {
          setPaymentMethod('VOUCHER');
          setAmountPaid(total.toFixed(2));
        }}
      >
        <Ticket className="h-8 w-8 text-warning" />
        <div className="text-left">
          <div className="font-semibold">Vale Alimentação/Refeição</div>
          <div className="text-sm text-muted-foreground">VR, VA, Ticket, Sodexo, etc.</div>
        </div>
      </Button>

      <Separator />

      <Button
        variant="outline"
        className="h-16 text-lg justify-start gap-4 border-dashed"
        onClick={() => setIsSplitMode(true)}
      >
        <Split className="h-6 w-6 text-muted-foreground" />
        <div className="text-left">
          <div className="font-semibold">Pagamento Múltiplo</div>
          <div className="text-sm text-muted-foreground">Dividir entre diferentes formas</div>
        </div>
      </Button>
    </div>
  );

  const renderCashPayment = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setPaymentMethod(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-success" />
          <span className="font-semibold">Pagamento em Dinheiro</span>
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="amount">Valor Recebido</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
              R$
            </span>
            <Input
              ref={inputRef}
              id="amount"
              type="text"
              inputMode="decimal"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="h-14 pl-10 text-2xl text-money font-bold"
              placeholder="0,00"
              data-tutorial="cash-amount-input"
            />
          </div>
        </div>

        {/* Botões de valor rápido */}
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" onClick={() => handleQuickAmount(10)}>
            R$ 10
          </Button>
          <Button variant="outline" onClick={() => handleQuickAmount(20)}>
            R$ 20
          </Button>
          <Button variant="outline" onClick={() => handleQuickAmount(50)}>
            R$ 50
          </Button>
          <Button variant="outline" onClick={() => handleQuickAmount(100)}>
            R$ 100
          </Button>
        </div>

        <Button variant="secondary" className="w-full" onClick={handleExactAmount}>
          Valor Exato ({formatCurrency(total)})
        </Button>
      </div>

      <Separator />

      {/* Resumo */}
      <div className="space-y-2 rounded-lg bg-muted p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-money font-medium">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recebido</span>
          <span className="text-money font-medium">{formatCurrency(amountPaidNum)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg">
          <span className="font-semibold">Troco</span>
          <span
            className={cn(
              'text-money font-bold',
              change >= 0 ? 'text-success' : 'text-destructive'
            )}
            data-testid="change-amount"
          >
            {formatCurrency(amountPaidNum - total)}
          </span>
        </div>
      </div>
    </div>
  );

  const renderOtherPayment = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setPaymentMethod(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {paymentMethod === 'PIX' && <QrCode className="h-5 w-5 text-info" />}
          {paymentMethod === 'CREDIT' && <CreditCard className="h-5 w-5 text-primary" />}
          {paymentMethod === 'DEBIT' && <CreditCard className="h-5 w-5" />}
          {paymentMethod === 'VOUCHER' && <Ticket className="h-5 w-5 text-warning" />}
          <span className="font-semibold">
            {paymentMethod === 'PIX' && 'Pagamento via PIX'}
            {paymentMethod === 'CREDIT' && 'Cartão de Crédito'}
            {paymentMethod === 'DEBIT' && 'Cartão de Débito'}
            {paymentMethod === 'VOUCHER' && 'Vale Alimentação/Refeição'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="text-4xl font-bold text-money text-primary">{formatCurrency(total)}</div>
        <p className="text-center text-muted-foreground">
          {paymentMethod === 'PIX' && 'Aguarde o cliente escanear o QR Code ou digitar a chave PIX'}
          {(paymentMethod === 'CREDIT' || paymentMethod === 'DEBIT') &&
            'Processe o pagamento na maquininha'}
          {paymentMethod === 'VOUCHER' && 'Processe o pagamento na maquininha (VR, VA, etc.)'}
        </p>
      </div>
    </div>
  );

  const getMethodLabel = (method: PaymentMethod) => {
    const found = PAYMENT_METHODS.find((m) => m.method === method);
    return found?.label || method;
  };

  const renderSplitPayment = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsSplitMode(false)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Split className="h-5 w-5" />
          <span className="font-semibold">Pagamento Múltiplo</span>
        </div>
      </div>

      {/* Lista de pagamentos adicionados */}
      {splitPayments.length > 0 && (
        <div className="space-y-2">
          {splitPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{getMethodLabel(payment.method)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-money font-semibold">{formatCurrency(payment.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveSplitPayment(payment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar novo pagamento */}
      {!splitMethod ? (
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map(({ method, label }) => (
            <Button
              key={method}
              variant="outline"
              size="sm"
              className="h-12 text-xs"
              onClick={() => {
                setSplitMethod(method);
                setSplitAmount(splitRemaining > 0 ? splitRemaining.toFixed(2) : '');
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{getMethodLabel(splitMethod)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSplitMethod(null);
                setSplitAmount('');
              }}
            >
              Cancelar
            </Button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              ref={splitInputRef}
              type="text"
              inputMode="decimal"
              value={splitAmount}
              onChange={(e) => setSplitAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSplitPayment();
              }}
              className="h-10 pl-10 text-lg"
              placeholder="0,00"
            />
          </div>
          <Button className="w-full" onClick={handleAddSplitPayment}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}

      <Separator />

      {/* Resumo */}
      <div className="space-y-2 rounded-lg bg-muted p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total da Venda</span>
          <span className="text-money font-medium">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Pago</span>
          <span className="text-money font-medium" data-testid="total-paid">
            {formatCurrency(splitTotal)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg">
          <span className="font-semibold">Restante</span>
          <span
            className={cn(
              'text-money font-bold',
              splitRemaining <= 0 ? 'text-success' : 'text-destructive'
            )}
            data-testid="remaining-amount"
          >
            {formatCurrency(Math.max(0, splitRemaining))}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-tutorial="payment-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">Finalizar Venda</DialogTitle>
          <DialogDescription>
            Selecione a forma de pagamento e informe o valor para concluir a venda.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!paymentMethod && !isSplitMode && renderPaymentSelection()}
          {paymentMethod === 'CASH' && !isSplitMode && renderCashPayment()}
          {paymentMethod && paymentMethod !== 'CASH' && !isSplitMode && renderOtherPayment()}
          {isSplitMode && renderSplitPayment()}
        </div>

        {(paymentMethod || isSplitMode) && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={
                isSplitMode ? !canFinalizeSplit || isProcessing : !canFinalize || isProcessing
              }
              className="gap-2"
              data-tutorial="confirm-sale-button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
