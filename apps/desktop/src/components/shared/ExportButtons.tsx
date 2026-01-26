/**
 * 📦 ExportButtons - Botões de Exportação Profissional
 *
 * Componente reutilizável para exportar dados em CSV, Excel e PDF
 * com layout profissional incluindo dados da empresa
 * @module components/shared/ExportButtons
 * @version 2.0.0
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportColumn,
  type ExportOptions,
  type ExportSummaryItem,
} from '@/lib/export';
import { useCompany } from '@/stores/settings-store';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface ExportButtonsProps<T> {
  /** Dados a serem exportados */
  data: T[];
  /** Colunas para exportação */
  columns: ExportColumn<T>[];
  /** Nome base do arquivo */
  filename: string;
  /** Título do relatório */
  title?: string;
  /** Subtítulo do relatório */
  subtitle?: string;
  /** Desabilita os botões */
  disabled?: boolean;
  /** Orientação do PDF */
  orientation?: 'portrait' | 'landscape';
  /** Variante visual */
  variant?: 'default' | 'compact' | 'dropdown';
  /** Classe CSS adicional */
  className?: string;
  /** Período do relatório */
  period?: { from?: Date; to?: Date };
  /** Filtros aplicados */
  filters?: Record<string, string>;
  /** Mostrar linha de totais */
  showTotals?: boolean;
  /** Cards de resumo no topo */
  summary?: ExportSummaryItem[];
  /** Cor primária (hex) - padrão verde GIRO */
  primaryColor?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

export function ExportButtons<T>({
  data,
  columns,
  filename,
  title,
  subtitle,
  disabled = false,
  orientation = 'portrait',
  variant = 'default',
  className = '',
  period,
  filters,
  showTotals = false,
  summary,
  primaryColor,
}: ExportButtonsProps<T>) {
  const { company } = useCompany();

  // Monta opções completas para exportação profissional
  const exportOptions: ExportOptions = {
    filename,
    title: title || filename,
    subtitle,
    companyName: company.name || 'GIRO',
    companyCnpj: company.cnpj,
    companyAddress: company.address
      ? `${company.address}${company.city ? `, ${company.city}` : ''}${
          company.state ? ` - ${company.state}` : ''
        }`
      : undefined,
    companyPhone: company.phone,
    logoUrl: company.logo, // Logo em base64 da empresa
    orientation,
    generatedAt: new Date(),
    period,
    filters,
    showTotals,
    summary,
    primaryColor: primaryColor || '#22c55e',
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(data, columns, exportOptions);
      toast.success('CSV exportado com sucesso!', {
        description: `${data.length} registros exportados`,
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar para CSV');
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(data, columns, exportOptions);
      toast.success('Excel exportado com sucesso!', {
        description: `${data.length} registros exportados`,
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar para Excel');
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(data, columns, exportOptions);
      // Não mostra toast pois abre janela de impressão
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const isDisabled = disabled || data.length === 0;
  const recordCount = data.length;
  const recordText = recordCount === 1 ? '1 registro' : `${recordCount} registros`;

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANTE: DROPDOWN (Compacto)
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isDisabled} className={className}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
            {recordCount > 0 && <span className="ml-1 text-muted-foreground">({recordText})</span>}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span>Exportar CSV</span>
              <span className="text-xs text-muted-foreground">
                Dados separados por ponto e vírgula
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span>Exportar Excel</span>
              <span className="text-xs text-muted-foreground">Planilha formatada (.xls)</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
            <Printer className="mr-2 h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span>Gerar PDF</span>
              <span className="text-xs text-muted-foreground">Relatório para impressão</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANTE: COMPACT (Apenas ícones)
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportCSV}
          disabled={isDisabled}
          title="Exportar CSV"
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportExcel}
          disabled={isDisabled}
          title="Exportar Excel"
        >
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportPDF}
          disabled={isDisabled}
          title="Gerar PDF"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANTE: DEFAULT (Botões completos)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button variant="outline" onClick={handleExportCSV} disabled={isDisabled}>
        <FileText className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button variant="outline" onClick={handleExportExcel} disabled={isDisabled}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant="outline" onClick={handleExportPDF} disabled={isDisabled}>
        <Printer className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}

export default ExportButtons;
