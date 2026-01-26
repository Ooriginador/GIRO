import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Shield, Trash2, FileJson, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface HardDeleteResult {
  success: boolean;
  deleted_records: number;
  anonymized_records: number;
}

interface EmployeeDataExport {
  metadata: {
    export_version: string;
    exported_at: string;
    subject: string;
    total_records: number;
    format: string;
    encoding: string;
  };
  personal_info: Record<string, unknown>;
  cash_sessions: Array<Record<string, unknown>>;
  sales_history: Array<Record<string, unknown>>;
}

export function MyDataPage() {
  const { employee, logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    if (!employee?.id) return;

    setIsExporting(true);
    try {
      const data = await invoke<EmployeeDataExport>('lgpd_export_employee_data', {
        employeeId: employee.id,
      });

      // Solicitar local para salvar
      const filePath = await save({
        defaultPath: `meus-dados-${employee.id}-${new Date().toISOString().split('T')[0]}.json`,
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
          title: 'Dados exportados com sucesso',
          description: `${data.metadata.total_records} registros exportados para ${filePath}`,
        });
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: 'Erro ao exportar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!employee?.id) return;

    setIsDeleting(true);
    try {
      const result = await invoke<HardDeleteResult>('lgpd_hard_delete_employee', {
        employeeId: employee.id,
      });

      toast({
        title: 'Dados deletados permanentemente',
        description: `${result.deleted_records} registros deletados, ${result.anonymized_records} anonimizados`,
      });

      // Fazer logout após exclusão
      await logout();

      // Logout após deletar
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Erro ao deletar dados:', error);
      toast({
        title: 'Erro ao deletar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Meus Dados - LGPD</h1>
      </div>

      <p className="text-muted-foreground mb-8">
        De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito de acessar, corrigir
        e excluir seus dados pessoais. Use as opções abaixo para exercer seus direitos.
      </p>

      <div className="grid gap-6">
        {/* Visualizar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Dados Pessoais Armazenados
            </CardTitle>
            <CardDescription>Informações que coletamos e armazenamos sobre você</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nome:</span>
                <p className="text-muted-foreground">{employee?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p className="text-muted-foreground">{employee?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Cargo:</span>
                <p className="text-muted-foreground">{employee?.role || 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Dados adicionais:</strong> Histórico de vendas, sessões de caixa, logs de
                auditoria.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Exportar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Portabilidade de Dados
            </CardTitle>
            <CardDescription>
              Exporte todos os seus dados em formato JSON (Art. 18, LGPD)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você pode baixar uma cópia completa de todos os dados pessoais que armazenamos sobre
              você, incluindo histórico de vendas e sessões de caixa.
            </p>
            <Button onClick={handleExportData} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar Meus Dados'}
            </Button>
          </CardContent>
        </Card>

        {/* Deletar Dados */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Exclusão de Dados
            </CardTitle>
            <CardDescription>
              Delete permanentemente todos os seus dados (Art. 16, LGPD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Atenção: Ação irreversível</p>
                <p className="text-muted-foreground">
                  Esta ação irá deletar permanentemente todos os seus dados pessoais do sistema.
                  Dados históricos de vendas e caixa serão anonimizados, mas não deletados
                  (obrigação legal contábil).
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Deletando...' : 'Deletar Meus Dados'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Seus dados pessoais serão permanentemente
                    deletados do nosso sistema. Você será deslogado e não poderá mais acessar o
                    sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, deletar meus dados
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Informações Legais */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Direitos (LGPD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>✓ Acesso aos seus dados pessoais</li>
              <li>✓ Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>✓ Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>✓ Portabilidade dos dados em formato estruturado</li>
              <li>✓ Eliminação dos dados tratados com seu consentimento</li>
              <li>✓ Revogação do consentimento</li>
            </ul>

            <p className="text-sm text-muted-foreground mt-4">
              Para dúvidas ou solicitações adicionais, entre em contato com nosso{' '}
              <a href="mailto:privacidade@arkheion.com" className="text-primary hover:underline">
                Encarregado de Dados (DPO)
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
