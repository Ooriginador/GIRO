import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, Download, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/stores/settings-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BaseReportLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  stats?: ReactNode;
  filters?: ReactNode;
  onPrint?: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  isLoading?: boolean;
}

export const BaseReportLayout: React.FC<BaseReportLayoutProps> = ({
  title,
  subtitle,
  children,
  stats,
  filters,
  onPrint,
  onExportCSV,
  onExportPDF,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { company } = useCompany();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500 print:p-0">
      {/* Header View */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/reports')}
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExportCSV && (
            <Button variant="outline" onClick={onExportCSV} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF} disabled={isLoading}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
          <Button onClick={handlePrint} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Print Header (Only visible on print) */}
      <div className="hidden print:flex flex-col border-b pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {company.tradeName && <p className="text-lg font-medium">{company.tradeName}</p>}
            {company.cnpj && <p className="text-sm">CNPJ: {company.cnpj}</p>}
            <p className="text-sm text-muted-foreground">
              {company.address} {company.city} - {company.state}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wider">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Gerado em: {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {filters && (
        <Card className="print:hidden border-none shadow-sm bg-muted/30">
          <CardContent className="p-4">{filters}</CardContent>
        </Card>
      )}

      {/* Stats Section */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">{stats}</div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-muted-foreground animate-pulse text-sm font-medium">
              Preparando relatório...
            </p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer (Mostly for print) */}
      <div className="hidden print:flex justify-between mt-auto pt-4 border-t text-[10px] text-muted-foreground">
        <span>GIRO - Sistema de Gestão | www.arkheion.com.br</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
};
