'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import {
  useCashMovements,
  useCashSessionSummary,
  useCloseCashSession,
  useCurrentCashSession,
  useOpenCashSession,
} from '@/hooks/usePDV';
import { useCashMovement } from '@/hooks/useSales';
import { cn, formatCurrency } from '@/lib/utils';

import { useAuthStore } from '@/stores/auth-store';
import type { CashMovement } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  Printer,
  Wallet,
} from 'lucide-react';
import { useState, type FC } from 'react';

export const CashControlPage: FC = () => {
  const { toast } = useToast();
  const { data: sessionData } = useCurrentCashSession();
  const { data: movementsData } = useCashMovements(sessionData?.id);
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();
  const { employee, hasPermission } = useAuthStore();

  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isSupplyOpen, setIsSupplyOpen] = useState(false);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const addMovementMutation = useCashMovement();

  const addMovement = async (type: CashMovement['type']) => {
    const value = parseFloat(movementAmount.replace(',', '.')) || 0;

    if (value <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (!sessionData?.id) {
      toast({ title: 'Nenhuma sessão aberta', variant: 'destructive' });
      return;
    }

    try {
      // Backend expects 'movementType' field with values 'SUPPLY' or 'BLEED'
      await addMovementMutation.mutateAsync({
        sessionId: sessionData.id,
        movementType: type === 'WITHDRAWAL' ? 'BLEED' : 'SUPPLY',
        amount: value,
        description: movementReason || '',
      });

      // Limpar campos e fechar dialogs
      setMovementAmount('');
      setMovementReason('');
      setIsWithdrawOpen(false);
      setIsSupplyOpen(false);
    } catch (error) {
      console.error((error as Error)?.message ?? String(error));
      // Toast de erro já tratado no hook useCashMovement
    }
  };

  const handleOpenSession = async () => {
    const value = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (!employee?.id) {
      toast({ title: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      await openSession.mutateAsync({
        openingBalance: value,
      });

      toast({ title: 'Caixa aberto com sucesso!' });
      setIsOpenDialogOpen(false);
      setOpeningBalance('');
    } catch (error) {
      console.error((error as Error)?.message ?? String(error));
      toast({ title: 'Erro ao abrir caixa', variant: 'destructive' });
    }
  };

  const handleCloseSession = async () => {
    const value = parseFloat(closingBalance.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (!sessionData) {
      toast({ title: 'Nenhum caixa aberto', variant: 'destructive' });
      return;
    }

    try {
      await closeSession.mutateAsync({
        actualBalance: value,
      });
      toast({ title: 'Caixa fechado com sucesso!' });
      setIsCloseDialogOpen(false);
      setClosingBalance('');
    } catch (error) {
      console.error((error as Error)?.message ?? String(error)); // Log error to use it
      toast({ title: 'Erro ao fechar caixa', variant: 'destructive' });
    }
  };

  const { data: summaryData } = useCashSessionSummary(sessionData?.id);

  const session = sessionData;
  const isOpen = session && session.status === 'OPEN';

  // Cálculos de resumo (usando dados reais ou fallback zero)
  const summary = {
    sales: summaryData?.totalSales ?? 0,
    cancellations: summaryData?.totalCanceled ?? 0,
    cash:
      summaryData?.salesByMethod.find(
        (m: { method: string; amount: number }) => m.method === 'CASH'
      )?.amount ?? 0,
    card:
      summaryData?.salesByMethod.find((m: { method: string; amount: number }) =>
        ['CREDIT', 'DEBIT'].includes(m.method)
      )?.amount ?? 0, // Sum both for simple display or refine
    pix:
      summaryData?.salesByMethod.find((m: { method: string; amount: number }) => m.method === 'PIX')
        ?.amount ?? 0,
    expectedBalance: summaryData?.cashInDrawer ?? session?.openingBalance ?? 0,
  };

  // Recalculate card total properly if needed, or just iterate.
  // For the UI cards below:
  const credit =
    summaryData?.salesByMethod.find(
      (m: { method: string; amount: number }) => m.method === 'CREDIT'
    )?.amount ?? 0;
  const debit =
    summaryData?.salesByMethod.find((m: { method: string; amount: number }) => m.method === 'DEBIT')
      ?.amount ?? 0;
  const cardTotal = credit + debit;
  summary.card = cardTotal;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Caixa</h1>
          <p className="text-muted-foreground">
            {isOpen
              ? `Caixa aberto desde ${format(new Date(session!.openedAt), "HH:mm 'de' dd/MM/yyyy", {
                  locale: ptBR,
                })}`
              : 'Nenhum caixa aberto'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isOpen ? (
            <Button data-testid="open-cash" onClick={() => setIsOpenDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Abrir Caixa
            </Button>
          ) : (
            <>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Resumo
              </Button>
              <Button
                data-testid="cash-supply"
                className="ml-2"
                onClick={() => setIsSupplyOpen(true)}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Suprimento
              </Button>
              <Button
                data-testid="cash-withdrawal"
                className="ml-2"
                onClick={() => setIsWithdrawOpen(true)}
              >
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Sangria
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsCloseDialogOpen(true)}
                disabled={!hasPermission('cash.close')}
              >
                <Clock className="mr-2 h-4 w-4" />
                <span data-testid="close-cash">Fechar Caixa</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card
        className={cn(
          isOpen ? 'border-green-500 bg-green-50/50' : 'border-yellow-500 bg-yellow-50/50'
        )}
      >
        <CardContent className="flex items-center gap-4 py-4">
          {isOpen ? (
            <>
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Caixa Aberto</p>
                <p className="text-sm text-green-600">
                  Operador: {session?.employee?.name || 'Não identificado'}
                </p>
                <p className="text-sm text-muted-foreground mt-1" data-testid="cash-balance">
                  {formatCurrency(summary.expectedBalance)}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800">Caixa Fechado</p>
                <p className="text-sm text-yellow-600">Abra o caixa para iniciar as operações</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Movimentações */}
      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription>Entradas e saídas do caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table data-testid="movements-list" className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Descrição</th>
                    <th className="py-2">Operador</th>
                    <th className="py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsData && movementsData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">
                        Nenhuma movimentação registrada
                      </td>
                    </tr>
                  ) : (
                    (movementsData || []).map((m: CashMovement) => (
                      <tr key={m.id} className="align-top border-b border-muted/20">
                        <td className="py-2">
                          {m.type === 'DEPOSIT' ? (
                            <span className="flex items-center text-green-600 gap-1">
                              <ArrowUpRight className="h-3 w-3" /> Suprimento
                            </span>
                          ) : m.type === 'WITHDRAWAL' ? (
                            <span className="flex items-center text-red-600 gap-1">
                              <ArrowDownRight className="h-3 w-3" /> Sangria
                            </span>
                          ) : (
                            <span className="flex items-center text-muted-foreground gap-1">
                              {m.type}
                            </span>
                          )}
                        </td>
                        <td className="py-2 font-medium">{formatCurrency(m.amount)}</td>
                        <td className="py-2 text-muted-foreground">{m.description || '-'}</td>
                        <td className="py-2">{m.employee?.name || 'Operador'}</td>
                        <td className="py-2 text-xs">
                          {format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas */}
      {isOpen && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vendas</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.sales)}</div>
                <p className="text-xs text-muted-foreground">total do período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(summary.cancellations)}
                </div>
                <p className="text-xs text-muted-foreground">estornos/cancelamentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="opening-balance">
                  {formatCurrency(session?.openingBalance || 0)}
                </div>
                <p className="text-xs text-muted-foreground">abertura do caixa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo Esperado</CardTitle>
                <Calculator className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="expected-balance">
                  {formatCurrency(summary.expectedBalance)}
                </div>
                <p className="text-xs text-muted-foreground">em dinheiro no caixa</p>
              </CardContent>
            </Card>
          </div>

          {/* Formas de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Resumo por método de pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dinheiro</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.cash)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cartão</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.card)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PIX</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.pix)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Abrir Caixa */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>Informe o valor inicial em dinheiro no caixa</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="openingBalance">Valor de Abertura (R$)</Label>
            <Input
              id="openingBalance"
              data-testid="opening-balance-input"
              type="text"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0,00"
              className="text-2xl h-14 text-center"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenSession}>Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suprimento */}
      <Dialog open={isSupplyOpen} onOpenChange={setIsSupplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suprimento</DialogTitle>
            <DialogDescription>Informe o valor para suprir o caixa</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="supplyAmount">Valor do Suprimento (R$)</Label>
            <Input
              id="supplyAmount"
              data-testid="supply-amount-input"
              type="text"
              inputMode="decimal"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0,00"
              className="text-2xl h-14 text-center"
              autoFocus
            />
            <Label className="mt-2" htmlFor="supplyReason">
              Motivo (opcional)
            </Label>
            <Input
              id="supplyReason"
              data-testid="movement-reason-input"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplyOpen(false)}>
              Cancelar
            </Button>
            <Button data-testid="confirm-supply" onClick={() => addMovement('DEPOSIT')}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sangria */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sangria</DialogTitle>
            <DialogDescription>Informe o valor a retirar do caixa</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="withdrawAmount">Valor da Sangria (R$)</Label>
            <Input
              id="withdrawAmount"
              data-testid="withdrawal-amount-input"
              type="text"
              inputMode="decimal"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0,00"
              className="text-2xl h-14 text-center"
              autoFocus
            />
            <Label className="mt-2" htmlFor="withdrawReason">
              Motivo
            </Label>
            <Input
              id="withdrawReason"
              data-testid="withdrawal-reason-input"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
              Cancelar
            </Button>
            <Button data-testid="confirm-withdrawal" onClick={() => addMovement('WITHDRAWAL')}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fechar Caixa */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
            <DialogDescription>Conte o dinheiro e informe o valor final</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Saldo inicial</span>
                <span>{formatCurrency(session?.openingBalance || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Vendas em dinheiro</span>
                <span className="text-green-600">+{formatCurrency(summary.cash)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Saldo esperado</span>
                <span>{formatCurrency(summary.expectedBalance)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="closingBalance">Valor Contado (R$)</Label>
              <Input
                id="closingBalance"
                type="text"
                inputMode="decimal"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="0,00"
                className="text-2xl h-14 text-center"
              />
            </div>

            {closingBalance && (
              <div
                className={cn(
                  'rounded-lg p-4 text-center',
                  parseFloat(closingBalance.replace(',', '.')) === summary.expectedBalance
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                )}
              >
                {parseFloat(closingBalance.replace(',', '.')) === summary.expectedBalance ? (
                  <p>✓ Caixa conferido corretamente</p>
                ) : (
                  <p>
                    Diferença:{' '}
                    {formatCurrency(
                      parseFloat(closingBalance.replace(',', '.')) - summary.expectedBalance
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-close-cash"
              onClick={handleCloseSession}
              disabled={!closingBalance}
            >
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
