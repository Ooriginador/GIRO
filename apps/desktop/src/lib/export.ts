/**
 * 📦 Utilitários de Exportação - PDF & Excel
 *
 * Funções para exportar dados em diferentes formatos
 * @module lib/export
 * @version 1.0.0
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface ExportColumn<T = unknown> {
  /** Chave do campo no objeto */
  key: keyof T | string;
  /** Título da coluna */
  header: string;
  /** Largura da coluna (para Excel) */
  width?: number;
  /** Formatador customizado */
  formatter?: (value: unknown, row: T) => string;
  /** Alinhamento */
  align?: 'left' | 'center' | 'right';
}

export interface ExportOptions {
  /** Nome do arquivo (sem extensão) */
  filename: string;
  /** Título do relatório */
  title?: string;
  /** Subtítulo */
  subtitle?: string;
  /** Nome da empresa */
  companyName?: string;
  /** Orientação (PDF) */
  orientation?: 'portrait' | 'landscape';
  /** Data de geração */
  generatedAt?: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtém valor aninhado de um objeto usando dot notation
 * Ex: getValue({ a: { b: 1 } }, 'a.b') => 1
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
 * Formata valor para exibição
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return format(value, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') {
    // Detecta se é monetário (2 casas decimais)
    if (Number.isInteger(value)) return value.toString();
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

/**
 * Escapa caracteres especiais para CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO CSV
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para CSV
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const headers = columns.map((col) => escapeCSV(col.header));
  const rows = data.map((row) =>
    columns.map((col) => {
      const rawValue = getValue(row, String(col.key));
      const value = col.formatter ? col.formatter(rawValue, row) : formatValue(rawValue);
      return escapeCSV(value);
    })
  );

  // BOM para UTF-8 no Excel
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

  downloadFile(csvContent, `${options.filename}.csv`, 'text/csv;charset=utf-8;');
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO EXCEL (XLSX via HTML)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para Excel (via HTML table)
 * Não requer dependências externas
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const generatedAt = options.generatedAt || new Date();
  const formattedDate = format(generatedAt, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

  // Criar tabela HTML
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #22c55e; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 5px; }
        .date { font-size: 12px; color: #999; margin-bottom: 20px; }
        .right { text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
  `;

  // Header do relatório
  if (options.companyName) {
    html += `<div class="header">${escapeHtml(options.companyName)}</div>`;
  }
  if (options.title) {
    html += `<div class="subtitle">${escapeHtml(options.title)}</div>`;
  }
  if (options.subtitle) {
    html += `<div class="subtitle">${escapeHtml(options.subtitle)}</div>`;
  }
  html += `<div class="date">Gerado em: ${formattedDate}</div>`;

  // Tabela
  html += '<table>';

  // Cabeçalho
  html += '<thead><tr>';
  columns.forEach((col) => {
    html += `<th>${escapeHtml(col.header)}</th>`;
  });
  html += '</tr></thead>';

  // Dados
  html += '<tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      const rawValue = getValue(row, String(col.key));
      const value = col.formatter ? col.formatter(rawValue, row) : formatValue(rawValue);
      const alignClass = col.align ? ` class="${col.align}"` : '';
      html += `<td${alignClass}>${escapeHtml(value)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';

  html += '</table></body></html>';

  downloadFile(html, `${options.filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Escape HTML entities
 */
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

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO PDF (via Print)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta dados para PDF via impressão do navegador
 * Abre uma nova janela com layout otimizado para impressão
 */
export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const generatedAt = options.generatedAt || new Date();
  const formattedDate = format(generatedAt, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  const isLandscape = options.orientation === 'landscape';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(options.title || options.filename)}</title>
      <style>
        @page { 
          size: A4 ${isLandscape ? 'landscape' : 'portrait'}; 
          margin: 15mm;
        }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 11px;
          color: #333;
          padding: 0;
          margin: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #22c55e;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .company-info h1 { 
          margin: 0; 
          font-size: 20px; 
          color: #22c55e;
        }
        .company-info p { margin: 2px 0; color: #666; font-size: 10px; }
        .report-info { text-align: right; }
        .report-info h2 { 
          margin: 0; 
          font-size: 16px; 
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-info p { margin: 2px 0; color: #666; font-size: 10px; }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px;
        }
        th { 
          background: #22c55e; 
          color: white; 
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td { 
          padding: 6px; 
          border-bottom: 1px solid #eee;
          font-size: 10px;
        }
        tr:nth-child(even) { background: #f8f9fa; }
        tr:hover { background: #e8f5e9; }
        
        .right { text-align: right; }
        .center { text-align: center; }
        
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 9px;
          color: #999;
          display: flex;
          justify-content: space-between;
        }
        
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${escapeHtml(options.companyName || 'GIRO')}</h1>
          <p>${escapeHtml(options.subtitle || '')}</p>
        </div>
        <div class="report-info">
          <h2>${escapeHtml(options.title || 'Relatório')}</h2>
          <p>Gerado em: ${formattedDate}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${columns.map((col) => `<th>${escapeHtml(col.header)}</th>`).join('')}
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
                    : formatValue(rawValue);
                  const alignClass = col.align ? ` class="${col.align}"` : '';
                  return `<td${alignClass}>${escapeHtml(value)}</td>`;
                })
                .join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <span>Total de registros: ${data.length}</span>
        <span>GIRO - Sistema de Gestão Comercial</span>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DOWNLOAD HELPER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Faz download de um arquivo
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
// FORMATADORES COMUNS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formatadores prontos para uso
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

  /** Formata como data */
  date: (value: unknown) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  },

  /** Formata como data/hora */
  datetime: (value: unknown) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  },

  /** Formata como número inteiro */
  integer: (value: unknown) => {
    return Math.round(Number(value) || 0).toLocaleString('pt-BR');
  },

  /** Formata booleano como Sim/Não */
  yesNo: (value: unknown) => (value ? 'Sim' : 'Não'),

  /** Formata booleano como Ativo/Inativo */
  activeInactive: (value: unknown) => (value ? 'Ativo' : 'Inativo'),
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK PARA COMPONENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cria funções de exportação para um conjunto de dados
 */
export function createExporter<T>(
  getData: () => T[],
  columns: ExportColumn<T>[],
  options: Omit<ExportOptions, 'filename'> & { baseFilename: string }
) {
  const filename = `${options.baseFilename}-${format(new Date(), 'yyyy-MM-dd')}`;

  return {
    toCSV: () => exportToCSV(getData(), columns, { ...options, filename }),
    toExcel: () => exportToExcel(getData(), columns, { ...options, filename }),
    toPDF: () => exportToPDF(getData(), columns, { ...options, filename }),
  };
}
