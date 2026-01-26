/**
 * 📦 Sistema de Exportação Profissional - GIRO
 *
 * Exportação avançada com layouts profissionais para PDF, Excel e CSV
 * @module lib/export
 * @version 2.0.0
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ════════════════════════════════════════════════════════════════════════════

export interface ExportColumn<T = unknown> {
  /** Chave do campo no objeto (suporta dot notation: 'product.name') */
  key: keyof T | string;
  /** Título da coluna */
  header: string;
  /** Largura da coluna em pixels (Excel/PDF) */
  width?: number;
  /** Formatador customizado */
  formatter?: (value: unknown, row: T) => string;
  /** Alinhamento do texto */
  align?: 'left' | 'center' | 'right';
  /** Tipo de dado para formatação automática */
  type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean';
  /** Se deve incluir na soma/totalização */
  totalizable?: boolean;
  /** Função para calcular total customizado */
  totalFormatter?: (total: number, count: number) => string;
}

export interface ExportOptions {
  /** Nome do arquivo (sem extensão) */
  filename: string;
  /** Título do relatório */
  title?: string;
  /** Subtítulo/descrição */
  subtitle?: string;
  /** Nome da empresa */
  companyName?: string;
  /** CNPJ da empresa */
  companyCnpj?: string;
  /** Endereço da empresa */
  companyAddress?: string;
  /** Telefone da empresa */
  companyPhone?: string;
  /** URL do logo (base64 ou URL) */
  logoUrl?: string;
  /** Orientação do PDF */
  orientation?: 'portrait' | 'landscape';
  /** Data de geração */
  generatedAt?: Date;
  /** Período do relatório */
  period?: { from?: Date; to?: Date };
  /** Filtros aplicados (para exibir no cabeçalho) */
  filters?: Record<string, string>;
  /** Mostrar totalizadores no rodapé */
  showTotals?: boolean;
  /** Mostrar resumo executivo */
  showSummary?: boolean;
  /** Dados do resumo */
  summary?: ExportSummaryItem[];
  /** Agrupar por campo */
  groupBy?: string;
  /** Cor primária (hex) */
  primaryColor?: string;
  /** Cor secundária (hex) */
  secondaryColor?: string;
}

export interface ExportSummaryItem {
  label: string;
  value: string | number;
  /** Ícone: nome predefinido ou emoji/string */
  icon?: 'money' | 'chart' | 'users' | 'box' | 'cart' | 'calendar' | string;
  /** Cor: nome predefinido ou hex */
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | string;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtém valor aninhado de um objeto usando dot notation
 */
function getValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Formata valor baseado no tipo
 */
function formatValue(value: unknown, type?: ExportColumn['type']): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'currency':
      return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'date':
      if (!value) return '';
      return format(new Date(String(value)), 'dd/MM/yyyy', { locale: ptBR });
    case 'datetime':
      if (!value) return '';
      return format(new Date(String(value)), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    case 'boolean':
      return value ? 'Sim' : 'Não';
    case 'number':
      return Number(value).toLocaleString('pt-BR');
    default:
      if (value instanceof Date) return format(value, 'dd/MM/yyyy HH:mm', { locale: ptBR });
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      if (typeof value === 'number') {
        if (Number.isInteger(value)) return value.toLocaleString('pt-BR');
        return value.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return String(value);
  }
}

/**
 * Calcula totais das colunas totalizáveis
 */
function calculateTotals<T>(data: T[], columns: ExportColumn<T>[]): Map<string, number> {
  const totals = new Map<string, number>();

  columns.forEach((col) => {
    if (col.totalizable) {
      const sum = data.reduce((acc, row) => {
        const value = Number(getValue(row, String(col.key))) || 0;
        return acc + value;
      }, 0);
      totals.set(String(col.key), sum);
    }
  });

  return totals;
}

/**
 * Escapa caracteres especiais para CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes(',')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * Formata período
 */
function formatPeriod(period?: { from?: Date; to?: Date }): string {
  if (!period?.from && !period?.to) return '';
  const from = period.from ? format(period.from, 'dd/MM/yyyy', { locale: ptBR }) : 'início';
  const to = period.to ? format(period.to, 'dd/MM/yyyy', { locale: ptBR }) : 'hoje';
  return `Período: ${from} a ${to}`;
}

/**
 * Download de arquivo
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO CSV
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para CSV com BOM UTF-8 (compatível Excel BR)
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions | string
): void {
  // Compatibilidade com chamada simples (filename como string)
  const opts: ExportOptions = typeof options === 'string' ? { filename: options } : options;

  const headers = columns.map((col) => escapeCSV(col.header));
  const rows = data.map((row) =>
    columns.map((col) => {
      const rawValue = getValue(row, String(col.key));
      const value = col.formatter ? col.formatter(rawValue, row) : formatValue(rawValue, col.type);
      return escapeCSV(value);
    })
  );

  // Adiciona totais se configurado
  if (opts.showTotals && columns.length > 0) {
    const totals = calculateTotals(data, columns);
    const firstColKey = columns[0]?.key;
    const totalRow = columns.map((col) => {
      if (col.totalizable) {
        const total = totals.get(String(col.key)) || 0;
        if (col.totalFormatter) {
          return escapeCSV(col.totalFormatter(total, data.length));
        }
        return escapeCSV(formatValue(total, col.type));
      }
      return col.key === firstColKey ? 'TOTAL' : '';
    });
    rows.push(totalRow);
  }

  // BOM para UTF-8 no Excel brasileiro
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const filename = `${opts.filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO EXCEL (HTML Table com formatação rica)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para Excel com formatação profissional
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions | string
): void {
  const opts: ExportOptions = typeof options === 'string' ? { filename: options } : options;
  const generatedAt = opts.generatedAt || new Date();
  const formattedDate = format(generatedAt, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  const primaryColor = opts.primaryColor || '#22c55e';
  const totals = opts.showTotals ? calculateTotals(data, columns) : new Map();

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Relatório</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { 
          background-color: ${primaryColor}; 
          color: white; 
          font-weight: bold; 
          padding: 10px 8px;
          text-align: left;
          border: 1px solid ${primaryColor};
        }
        td { 
          border: 1px solid #e5e7eb; 
          padding: 8px; 
          vertical-align: top;
        }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .header-section { margin-bottom: 20px; }
        .company-name { font-size: 18pt; font-weight: bold; color: ${primaryColor}; }
        .report-title { font-size: 14pt; font-weight: bold; margin-top: 5px; }
        .report-subtitle { font-size: 10pt; color: #6b7280; margin-top: 3px; }
        .meta-info { font-size: 9pt; color: #9ca3af; margin-top: 5px; }
        .right { text-align: right; }
        .center { text-align: center; }
        .total-row { background-color: #f3f4f6 !important; font-weight: bold; }
        .total-row td { border-top: 2px solid ${primaryColor}; }
        .currency { mso-number-format: '"R\\$"\\ \\#\\,\\#\\#0\\.00'; }
        .number { mso-number-format: '\\#\\,\\#\\#0'; }
        .percent { mso-number-format: '0\\.0"%"'; }
        .summary-section { margin-bottom: 15px; }
        .summary-card { 
          display: inline-block; 
          padding: 10px 15px; 
          margin-right: 10px; 
          background: #f3f4f6; 
          border-left: 3px solid ${primaryColor};
        }
        .summary-label { font-size: 9pt; color: #6b7280; }
        .summary-value { font-size: 14pt; font-weight: bold; color: #111827; }
      </style>
    </head>
    <body>
  `;

  // Cabeçalho do relatório
  html += '<div class="header-section">';
  if (opts.companyName) {
    html += `<div class="company-name">${escapeHtml(opts.companyName)}</div>`;
  }
  if (opts.companyCnpj) {
    html += `<div class="meta-info">CNPJ: ${escapeHtml(opts.companyCnpj)}</div>`;
  }
  if (opts.title) {
    html += `<div class="report-title">${escapeHtml(opts.title)}</div>`;
  }
  if (opts.subtitle) {
    html += `<div class="report-subtitle">${escapeHtml(opts.subtitle)}</div>`;
  }
  const periodStr = formatPeriod(opts.period);
  if (periodStr) {
    html += `<div class="meta-info">${escapeHtml(periodStr)}</div>`;
  }
  html += `<div class="meta-info">Gerado em: ${formattedDate}</div>`;
  html += '</div>';

  // Cards de resumo
  if (opts.summary && opts.summary.length > 0) {
    html += '<div class="summary-section">';
    opts.summary.forEach((item) => {
      const displayValue =
        typeof item.value === 'number'
          ? item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : item.value;
      html += `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(item.label)}</div>
          <div class="summary-value">${escapeHtml(String(displayValue))}</div>
        </div>
      `;
    });
    html += '</div>';
  }

  // Filtros aplicados
  if (opts.filters && Object.keys(opts.filters).length > 0) {
    html += '<div class="meta-info">Filtros: ';
    html += Object.entries(opts.filters)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    html += '</div><br/>';
  }

  // Tabela de dados
  html += '<table>';
  html += '<thead><tr>';
  columns.forEach((col) => {
    const width = col.width ? ` style="width:${col.width}px"` : '';
    html += `<th${width}>${escapeHtml(col.header)}</th>`;
  });
  html += '</tr></thead>';

  html += '<tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      const rawValue = getValue(row, String(col.key));
      const value = col.formatter ? col.formatter(rawValue, row) : formatValue(rawValue, col.type);
      const classes: string[] = [];
      if (col.align) classes.push(col.align);
      if (col.type === 'currency') classes.push('currency');
      if (col.type === 'number') classes.push('number');
      if (col.type === 'percent') classes.push('percent');
      const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
      html += `<td${classAttr}>${escapeHtml(value)}</td>`;
    });
    html += '</tr>';
  });

  // Linha de totais
  if (opts.showTotals && totals.size > 0) {
    html += '<tr class="total-row">';
    columns.forEach((col, idx) => {
      if (idx === 0) {
        html += `<td><strong>TOTAL (${data.length} registros)</strong></td>`;
      } else if (col.totalizable) {
        const total = totals.get(String(col.key)) || 0;
        const value = col.totalFormatter
          ? col.totalFormatter(total, data.length)
          : formatValue(total, col.type);
        const alignClass = col.align ? ` class="${col.align}"` : '';
        html += `<td${alignClass}><strong>${escapeHtml(value)}</strong></td>`;
      } else {
        html += '<td></td>';
      }
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += '</body></html>';

  const filename = `${opts.filename}-${format(new Date(), 'yyyy-MM-dd')}.xls`;
  downloadFile(html, filename, 'application/vnd.ms-excel;charset=utf-8;');
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO PDF (Layout Profissional)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para PDF com layout profissional via impressão do navegador
 */
export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions | string
): void {
  const opts: ExportOptions = typeof options === 'string' ? { filename: options } : options;
  const generatedAt = opts.generatedAt || new Date();
  const formattedDate = format(generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  const isLandscape = opts.orientation === 'landscape';
  const primaryColor = opts.primaryColor || '#22c55e';
  const secondaryColor = opts.secondaryColor || '#16a34a';
  const totals = opts.showTotals !== false ? calculateTotals(data, columns) : new Map();

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(opts.title || opts.filename)}</title>
      <style>
        @page { 
          size: A4 ${isLandscape ? 'landscape' : 'portrait'}; 
          margin: 12mm 10mm;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; 
          font-size: 9px;
          color: #1f2937;
          line-height: 1.4;
          background: white;
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* CABEÇALHO PROFISSIONAL                                               */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 12px;
          margin-bottom: 15px;
          border-bottom: 3px solid ${primaryColor};
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          float: left;
        }
        
        .company-logo span {
          font-size: 24px;
          font-weight: 900;
          color: white;
          letter-spacing: -1px;
        }
        
        .company-name { 
          font-size: 18px; 
          font-weight: 700; 
          color: ${primaryColor};
          margin-bottom: 2px;
        }
        
        .company-details {
          font-size: 8px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .report-info { 
          text-align: right;
          min-width: 180px;
        }
        
        .report-title { 
          font-size: 14px; 
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .report-meta {
          font-size: 8px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* CARDS DE RESUMO                                                      */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .summary-section {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        
        .summary-card {
          flex: 1;
          min-width: 120px;
          background: #f8fafc;
          border-radius: 6px;
          padding: 10px 12px;
          border-left: 3px solid ${primaryColor};
        }
        
        .summary-card.green { border-left-color: #22c55e; }
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.yellow { border-left-color: #eab308; }
        .summary-card.red { border-left-color: #ef4444; }
        .summary-card.gray { border-left-color: #6b7280; }
        
        .summary-label {
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          margin-bottom: 2px;
        }
        
        .summary-value {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* FILTROS                                                              */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .filters-section {
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 8px;
        }
        
        .filters-title {
          font-weight: 600;
          color: #374151;
          margin-right: 8px;
        }
        
        .filter-item {
          display: inline-block;
          background: white;
          padding: 2px 8px;
          border-radius: 3px;
          margin-right: 6px;
          border: 1px solid #e5e7eb;
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* TABELA PRINCIPAL                                                     */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .table-container {
          margin-top: 10px;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse;
          font-size: 8px;
        }
        
        thead {
          display: table-header-group;
        }
        
        th { 
          background: linear-gradient(180deg, ${primaryColor}, ${secondaryColor});
          color: white; 
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border: none;
        }
        
        th:first-child { border-radius: 4px 0 0 0; }
        th:last-child { border-radius: 0 4px 0 0; }
        
        td { 
          padding: 6px; 
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }
        
        tbody tr:nth-child(even) { 
          background: #f9fafb; 
        }
        
        tbody tr:last-child td {
          border-bottom: none;
        }
        
        .right { text-align: right; }
        .center { text-align: center; }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* LINHA DE TOTAL                                                       */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .total-row {
          background: #f3f4f6 !important;
        }
        
        .total-row td {
          font-weight: 700;
          padding: 10px 6px;
          border-top: 2px solid ${primaryColor};
          border-bottom: none;
          color: #111827;
        }
        
        .total-row td:first-child {
          border-radius: 0 0 0 4px;
        }
        
        .total-row td:last-child {
          border-radius: 0 0 4px 0;
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* RODAPÉ                                                               */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        .footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7px;
          color: #9ca3af;
        }
        
        .footer-left {
          display: flex;
          gap: 20px;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .footer-brand {
          font-weight: 600;
          color: ${primaryColor};
        }
        
        /* ═══════════════════════════════════════════════════════════════════ */
        /* PAGINAÇÃO E IMPRESSÃO                                                */
        /* ═══════════════════════════════════════════════════════════════════ */
        
        @media print {
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
          }
          
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          .no-break { page-break-inside: avoid; }
          
          .page-number:after {
            content: counter(page);
          }
        }
      </style>
    </head>
    <body>
      <!-- CABEÇALHO -->
      <div class="header">
        <div class="company-info">
          <div class="company-logo"><span>G</span></div>
          <div class="company-name">${escapeHtml(opts.companyName || 'GIRO')}</div>
          <div class="company-details">
            ${opts.companyCnpj ? `CNPJ: ${escapeHtml(opts.companyCnpj)}<br/>` : ''}
            ${opts.companyAddress ? `${escapeHtml(opts.companyAddress)}<br/>` : ''}
            ${opts.companyPhone ? `Tel: ${escapeHtml(opts.companyPhone)}` : ''}
          </div>
        </div>
        <div class="report-info">
          <div class="report-title">${escapeHtml(opts.title || 'Relatório')}</div>
          <div class="report-meta">
            ${opts.subtitle ? `${escapeHtml(opts.subtitle)}<br/>` : ''}
            ${formatPeriod(opts.period) ? `${escapeHtml(formatPeriod(opts.period))}<br/>` : ''}
            Gerado em: ${formattedDate}
          </div>
        </div>
      </div>
      
      <!-- RESUMO -->
      ${
        opts.summary && opts.summary.length > 0
          ? `
        <div class="summary-section">
          ${opts.summary
            .map((item) => {
              const displayValue =
                typeof item.value === 'number'
                  ? item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : item.value;
              return `
              <div class="summary-card ${item.color || ''}">
                <div class="summary-label">${escapeHtml(item.label)}</div>
                <div class="summary-value">${escapeHtml(String(displayValue))}</div>
              </div>
            `;
            })
            .join('')}
        </div>
      `
          : ''
      }
      
      <!-- FILTROS -->
      ${
        opts.filters && Object.keys(opts.filters).length > 0
          ? `
        <div class="filters-section">
          <span class="filters-title">Filtros aplicados:</span>
          ${Object.entries(opts.filters)
            .map(([k, v]) => `<span class="filter-item">${escapeHtml(k)}: ${escapeHtml(v)}</span>`)
            .join('')}
        </div>
      `
          : ''
      }
      
      <!-- TABELA -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              ${columns
                .map((col) => `<th class="${col.align || ''}">${escapeHtml(col.header)}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${columns
                  .map((col) => {
                    const rawValue = getValue(row, String(col.key));
                    const value = col.formatter
                      ? col.formatter(rawValue, row)
                      : formatValue(rawValue, col.type);
                    return `<td class="${col.align || ''}">${escapeHtml(value)}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
            ${
              totals.size > 0
                ? `
              <tr class="total-row">
                ${columns
                  .map((col, idx) => {
                    if (idx === 0) {
                      return `<td>TOTAL (${data.length} registros)</td>`;
                    }
                    if (col.totalizable) {
                      const total = totals.get(String(col.key)) || 0;
                      const value = col.totalFormatter
                        ? col.totalFormatter(total, data.length)
                        : formatValue(total, col.type);
                      return `<td class="${col.align || ''}">${escapeHtml(value)}</td>`;
                    }
                    return '<td></td>';
                  })
                  .join('')}
              </tr>
            `
                : ''
            }
          </tbody>
        </table>
      </div>
      
      <!-- RODAPÉ -->
      <div class="footer">
        <div class="footer-left">
          <span>Total de registros: <strong>${data.length}</strong></span>
          <span>Documento gerado eletronicamente</span>
        </div>
        <div class="footer-right">
          <span class="footer-brand">GIRO</span> - Sistema de Gestão Comercial<br/>
          www.giro.com.br
        </div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
          window.onafterprint = function() { 
            window.close(); 
          };
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FORMATADORES COMUNS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formatadores prontos para uso nas colunas
 */
export const exportFormatters = {
  /** Formata como moeda BRL */
  currency: (value: unknown) => {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  /** Formata como porcentagem */
  percent: (value: unknown) => {
    const num = Number(value) || 0;
    return `${num.toFixed(1)}%`;
  },

  /** Formata como data dd/MM/yyyy */
  date: (value: unknown) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  },

  /** Formata como data/hora dd/MM/yyyy HH:mm */
  datetime: (value: unknown) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  },

  /** Formata como número inteiro com separador de milhar */
  integer: (value: unknown) => {
    return Math.round(Number(value) || 0).toLocaleString('pt-BR');
  },

  /** Formata como número decimal */
  decimal: (value: unknown, decimals = 2) => {
    return (Number(value) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /** Formata booleano como Sim/Não */
  yesNo: (value: unknown) => (value ? 'Sim' : 'Não'),

  /** Formata booleano como Ativo/Inativo */
  activeInactive: (value: unknown) => (value ? 'Ativo' : 'Inativo'),

  /** Formata CPF */
  cpf: (value: unknown) => {
    const cpf = String(value || '').replace(/\D/g, '');
    if (cpf.length !== 11) return String(value || '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  /** Formata CNPJ */
  cnpj: (value: unknown) => {
    const cnpj = String(value || '').replace(/\D/g, '');
    if (cnpj.length !== 14) return String(value || '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },

  /** Formata telefone */
  phone: (value: unknown) => {
    const phone = String(value || '').replace(/\D/g, '');
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (phone.length === 10) {
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return String(value || '');
  },

  /** Formata CEP */
  cep: (value: unknown) => {
    const cep = String(value || '').replace(/\D/g, '');
    if (cep.length !== 8) return String(value || '');
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  },
};

// ════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cria um exportador configurado para reutilização
 */
export function createExporter<T>(
  getData: () => T[],
  columns: ExportColumn<T>[],
  baseOptions: Omit<ExportOptions, 'filename'> & { baseFilename: string }
) {
  const buildOptions = (): ExportOptions => ({
    ...baseOptions,
    filename: `${baseOptions.baseFilename}-${format(new Date(), 'yyyy-MM-dd-HHmm')}`,
    generatedAt: new Date(),
  });

  return {
    toCSV: () => exportToCSV(getData(), columns, buildOptions()),
    toExcel: () => exportToExcel(getData(), columns, buildOptions()),
    toPDF: () => exportToPDF(getData(), columns, buildOptions()),
    columns,
    options: baseOptions,
  };
}

/**
 * Hook helper para criar exportador em componentes React
 */
export function useExporter<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'filename'> & { baseFilename: string }
) {
  return createExporter(() => data, columns, options);
}
