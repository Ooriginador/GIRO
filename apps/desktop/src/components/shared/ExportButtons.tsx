/**
 * 📦 ExportButtons - Botões de Exportação
 *
 * Componente reutilizável para exportar dados em CSV, Excel e PDF
 * @module components/shared/ExportButtons
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
}: ExportButtonsProps<T>) {
  const { company } = useCompany();

  const exportOptions: ExportOptions = {
    filename,
    title: title || filename,
    subtitle,
    companyName: company.name || 'GIRO',
    orientation,
    generatedAt: new Date(),
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(data, columns, exportOptions);
      toast.success('Exportado para CSV com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar para CSV');
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(data, columns, exportOptions);
      toast.success('Exportado para Excel com sucesso!');
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
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportPDF}>
            <Printer className="mr-2 h-4 w-4" />
            Gerar PDF
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
