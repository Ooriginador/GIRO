import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Download, Trash2, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CustomerDataExport {
  metadata: {
    export_version: string;
    exported_at: string;
    subject: string;
    total_records: number;
    format: string;
    encoding: string;
  };
  personal_info: Record<string, unknown>;
  vehicles: Array<Record<string, unknown>>;
  service_orders: Array<Record<string, unknown>>;
  sales_history: Array<Record<string, unknown>>;
}

interface HardDeleteResult {
  success: boolean;
  deleted_records: number;
  anonymized_records: number;
}

interface LGPDActionsProps {
  customerId: string;
  customerName: string;
  onDeleted?: () => void;
}

export function CustomerLGPDActions({ customerId, customerName, onDeleted }: LGPDActionsProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await invoke<CustomerDataExport>('lgpd_export_customer_data', {
        customerId,
      });

      const filePath = await save({
        defaultPath: `cliente-${customerId}-dados-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(data, null, 2));

        toast({
          title: 'Dados exportados',
          description: `${data.metadata.total_records} registros exportados com sucesso`,
        });

        setShowExportDialog(false);
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    try {
      const result = await invoke<HardDeleteResult>('lgpd_hard_delete_customer', {
        customerId,
      });

      toast({
        title: 'Dados deletados',
        description: `${result.deleted_records} registros deletados, ${result.anonymized_records} anonimizados`,
      });

      setShowDeleteDialog(false);
      onDeleted?.();
    } catch (error) {
      console.error('Erro ao deletar dados:', error);
      toast({
        title: 'Erro ao deletar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportDialog(true)}
          title="Exportar dados (LGPD Art. 18)"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar Dados
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive hover:text-destructive"
          title="Deletar dados permanentemente (LGPD Art. 16)"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Deletar Dados
        </Button>
      </div>

      {/* Dialog Exportar */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Exportar Dados do Cliente
            </DialogTitle>
            <DialogDescription>
              Exportar todos os dados de <strong>{customerName}</strong> em formato JSON
              (Portabilidade de Dados - LGPD Art. 18)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p>Os seguintes dados serão exportados:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Informações pessoais (nome, CPF, telefone, endereço)</li>
              <li>Veículos cadastrados</li>
              <li>Histórico de ordens de serviço</li>
              <li>Histórico de compras</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExportData} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Deletar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar dados do cliente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação irá <strong>deletar permanentemente</strong> todos os dados de{' '}
                <strong>{customerName}</strong>.
              </p>
              <p className="text-destructive font-medium">⚠️ Esta ação não pode ser desfeita.</p>
              <div className="text-sm space-y-1 mt-2">
                <p>O que será deletado:</p>
                <ul className="list-disc list-inside">
                  <li>Dados pessoais (nome, CPF, telefone, endereço)</li>
                  <li>Veículos cadastrados</li>
                </ul>
                <p className="mt-2">O que será anonimizado (obrigação legal):</p>
                <ul className="list-disc list-inside">
                  <li>Histórico de vendas</li>
                  <li>Ordens de serviço</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteData}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deletando...' : 'Sim, deletar permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
