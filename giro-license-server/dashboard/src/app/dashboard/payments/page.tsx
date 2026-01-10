'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CreditCard, Download, Receipt } from 'lucide-react';
import { useState } from 'react';

// Mock data - will be replaced with real API data when Stripe is integrated
const mockPayments = [
  {
    id: 'pay_1234567890',
    date: '2026-01-10T10:30:00Z',
    amount: 299.9,
    status: 'paid',
    description: 'Plano Profissional - 10 licenças',
    invoice_url: '#',
  },
  {
    id: 'pay_1234567891',
    date: '2025-12-10T10:30:00Z',
    amount: 299.9,
    status: 'paid',
    description: 'Plano Profissional - 10 licenças',
    invoice_url: '#',
  },
  {
    id: 'pay_1234567892',
    date: '2025-11-10T10:30:00Z',
    amount: 299.9,
    status: 'paid',
    description: 'Plano Profissional - 10 licenças',
    invoice_url: '#',
  },
];

const plans = [
  {
    name: 'Básico',
    price: 49.9,
    period: '/mês',
    features: ['1 licença', 'Suporte por email', 'Atualizações básicas'],
    recommended: false,
  },
  {
    name: 'Profissional',
    price: 299.9,
    period: '/mês',
    features: [
      '10 licenças',
      'Suporte prioritário',
      'Atualizações ilimitadas',
      'Dashboard completo',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    features: ['Licenças ilimitadas', 'Suporte 24/7', 'SLA garantido', 'Instalação dedicada'],
    recommended: false,
  },
];

export default function PaymentsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string) => {
    if (typeof amount === 'string') return amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline',
    };
    const labels: Record<string, string> = {
      paid: 'Pago',
      pending: 'Pendente',
      failed: 'Falhou',
      refunded: 'Reembolsado',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const handleSubscribe = (planName: string) => {
    setSelectedPlan(planName);
    // TODO: Integrate with Stripe Checkout
    alert(`Integração com Stripe em breve!\n\nPlano selecionado: ${planName}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pagamentos</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e veja seu histórico de pagamentos
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">Plano Profissional</p>
              <p className="text-muted-foreground">10 licenças • Renova em 10/02/2026</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(299.9)}</p>
              <p className="text-muted-foreground">por mês</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline">Alterar Plano</Button>
            <Button variant="outline" className="text-destructive">
              Cancelar Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Integration Notice */}
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="flex items-center gap-4 pt-6">
          <AlertCircle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="font-semibold">Integração com Stripe em desenvolvimento</p>
            <p className="text-sm text-muted-foreground">
              Os pagamentos reais serão habilitados após a integração com Stripe. Por enquanto, esta
              página mostra dados de exemplo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.recommended ? 'border-primary ring-2 ring-primary/20' : ''}
            >
              <CardHeader>
                {plan.recommended && <Badge className="w-fit mb-2">Recomendado</Badge>}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    {formatCurrency(plan.price)}
                  </span>
                  <span>{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.name)}
                >
                  {plan.name === 'Profissional' ? 'Plano Atual' : 'Escolher'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Seus últimos pagamentos e faturas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Fatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{formatDate(payment.date)}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled>
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {mockPayments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Método de Pagamento</CardTitle>
          <CardDescription>Gerencie seus cartões e métodos de pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expira em 12/28</p>
              </div>
            </div>
            <Badge variant="secondary">Principal</Badge>
          </div>
          <Button variant="outline" className="mt-4" disabled>
            <CreditCard className="h-4 w-4 mr-2" />
            Adicionar Novo Cartão
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Disponível após integração com Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
