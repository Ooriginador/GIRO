/**
 * 🔍 WarrantyDetails - Detalhes da Garantia
 *
 * Visualização e gestão de uma garantia específica
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useWarranties,
  useWarrantyDetails,
  WarrantyUtils,
  type WarrantyResolutionType,
} from '@/hooks/useWarranties';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface WarrantyDetailsProps {
  warrantyId: string;
  onBack: () => void;
}

export function WarrantyDetails({ warrantyId, onBack }: WarrantyDetailsProps) {
  const { warrantyDetails, isLoading } = useWarrantyDetails(warrantyId);
  const { approveWarranty, denyWarranty, resolveWarranty } = useWarranties();
  const { toast } = useToast();
  const { employee } = useAuthStore();

  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<WarrantyResolutionType>('REPLACEMENT');
  const [resolutionNote, setResolutionNote] = useState('');

  if (isLoading || !warrantyDetails) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { claim, customer_name, product_name, source_number } = warrantyDetails;

  const handleApprove = async () => {
    if (!employee) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para aprovar garantias.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await approveWarranty.mutateAsync({
        id: claim.id,
        employeeId: employee.id,
      });
      toast({
        title: 'Garantia Aprovada',
        description: 'A solicitação foi aprovada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao aprovar garantia:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar a garantia.',
        variant: 'destructive',
      });
    }
  };

  const handleDeny = async () => {
    if (!denyReason) return;
    if (!employee) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para negar garantias.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await denyWarranty.mutateAsync({
        id: claim.id,
        employeeId: employee.id,
        reason: denyReason,
      });
      setIsDenyDialogOpen(false);
      toast({
        title: 'Garantia Negada',
        description: 'A solicitação foi negada.',
      });
    } catch (error) {
      console.error('Erro ao negar garantia:', error);
      toast({
        title: 'Erro ao negar',
        description: 'Não foi possível negar a garantia.',
        variant: 'destructive',
      });
    }
  };

  const handleResolve = async () => {
    if (!employee) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para finalizar garantias.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await resolveWarranty.mutateAsync({
        id: claim.id,
        input: {
          resolution_type: resolutionType,
          resolution: resolutionNote,
          resolved_by_id: employee.id,
        },
      });
      setIsResolveDialogOpen(false);
      toast({
        title: 'Garantia Resolvida',
        description: 'A garantia foi finalizada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao resolver garantia:', error);
      toast({
        title: 'Erro ao resolver',
        description: 'Não foi possível finalizar a garantia.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = () => {
    switch (claim.status) {
      case 'OPEN':
        return <ShieldAlert className="h-6 w-6" />;
      case 'IN_PROGRESS':
        return <ShieldQuestion className="h-6 w-6" />;
      case 'APPROVED':
        return <CheckCircle className="h-6 w-6" />;
      case 'DENIED':
        return <XCircle className="h-6 w-6" />;
      case 'CLOSED':
        return <ShieldCheck className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header e Ações */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex gap-2">
          {WarrantyUtils.canApprove(claim.status) && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsDenyDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Negar
              </Button>
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}

          {WarrantyUtils.canResolve(claim.status) && (
            <Button onClick={() => setIsResolveDialogOpen(true)}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Resolver & Finalizar
            </Button>
          )}
        </div>
      </div>

      {/* Info Principal */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes da Solicitação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Status</span>
              <Badge
                variant="outline"
                className={`gap-1 ${WarrantyUtils.getStatusColor(claim.status)} border-current`}
              >
                {getStatusIcon()}
                {WarrantyUtils.getStatusLabel(claim.status)}
              </Badge>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">Produto</Label>
              <p className="font-medium text-lg">{product_name || 'Produto não identificado'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Origem</Label>
                <p className="font-medium">
                  {WarrantyUtils.getSourceTypeLabel(claim.source_type)} #{source_number}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Data Abertura</Label>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{formatDate(claim.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <Label className="text-muted-foreground">Motivo/Defeito Relatado</Label>
              <div className="p-3 border rounded-md bg-slate-50 text-sm">{claim.reason}</div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">Descrição Detalhada</Label>
              <p className="text-sm text-gray-600">
                {claim.description || 'Sem descrição adicional.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium text-lg">{customer_name}</p>
              </div>
              {/* Adicionar mais dados se disponíveis no futuro */}
            </CardContent>
          </Card>

          {(claim.status === 'CLOSED' || claim.status === 'DENIED') && (
            <Card
              className={
                claim.status === 'DENIED'
                  ? 'border-red-200 bg-red-50'
                  : 'border-green-200 bg-green-50'
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {claim.status === 'DENIED' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  )}
                  Resolução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim.status === 'DENIED' ? (
                  <div className="space-y-1">
                    <Label className="text-red-700">Motivo da Recusa</Label>
                    <p className="text-red-900">{claim.resolution || 'Sem motivo registrado.'}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <Label className="text-green-700">Tipo de Solução</Label>
                      <Badge variant="outline" className="border-green-600 text-green-700">
                        {claim.resolution_type
                          ? WarrantyUtils.getResolutionTypeLabel(claim.resolution_type)
                          : '-'}
                      </Badge>
                    </div>
                    {claim.refund_amount && (
                      <div className="flex justify-between items-center pt-2">
                        <Label className="text-green-700">Valor Reembolsado</Label>
                        <span className="font-bold text-green-800">
                          {formatCurrency(claim.refund_amount)}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1 pt-2">
                      <Label className="text-green-700">Observações</Label>
                      <p className="text-green-900">{claim.resolution}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Negar Garantia */}
      <AlertDialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Negar Solicitação de Garantia</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da recusa. Esta informação ficará registrada e visível
              para consulta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="denyReason">Motivo da Recusa</Label>
            <Textarea
              id="denyReason"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Ex: Mal uso constatado, fora do prazo de garantia..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeny}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!denyReason.trim()}
            >
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Resolver Garantia */}
      <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolver Garantia</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione como a garantia será resolvida e finalize o processo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Resolução</Label>
              <Select
                value={resolutionType}
                onValueChange={(v) => setResolutionType(v as WarrantyResolutionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPLACEMENT">Troca do Produto</SelectItem>
                  <SelectItem value="REFUND">Reembolso</SelectItem>
                  <SelectItem value="REPAIR">Reparo</SelectItem>
                  <SelectItem value="CREDIT">Crédito em Loja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações / Detalhes</Label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ex: Produto trocado por um novo (S/N 12345)..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve}>Finalizar Garantia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
