/**
 * @file KardexReportPage - Relatório de Movimentação (Compliance)
 * @description Exibe histórico completo de movimentações de um produto
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockLocations } from '@/hooks/enterprise';
import { cn, formatCurrency } from '@/lib/utils';
import type { KardexReport } from '@/lib/tauri';

interface Product {
  id: string;
  name: string;
  internalCode: string;
}

const documentTypeLabels: Record<string, string> = {
  REQUEST: 'Requisição',
  TRANSFER_IN: 'Entrada Transf.',
  TRANSFER_OUT: 'Saída Transf.',
  ADJUSTMENT: 'Ajuste',
  SALE: 'Venda',
  PURCHASE: 'Compra',
};

const documentTypeColors: Record<string, string> = {
  REQUEST: 'bg-orange-100 text-orange-800',
  TRANSFER_IN: 'bg-green-100 text-green-800',
  TRANSFER_OUT: 'bg-blue-100 text-blue-800',
  ADJUSTMENT: 'bg-purple-100 text-purple-800',
  SALE: 'bg-red-100 text-red-800',
  PURCHASE: 'bg-emerald-100 text-emerald-800',
};

export function KardexReportPage() {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [locationId, setLocationId] = useState<string | undefined>();

  const { data: locations } = useStockLocations();

  // Search products
  const { data: searchResults } = useQuery({
    queryKey: ['products', 'search', productSearch],
    queryFn: () => invoke<Product[]>('search_products', { query: productSearch, limit: 10 }),
    enabled: productSearch.length >= 2,
  });

  // Get Kardex report
  const { data: kardex, isLoading: isLoadingKardex } = useQuery({
    queryKey: ['kardex', selectedProduct?.id, startDate, endDate, locationId],
    queryFn: () =>
      invoke<KardexReport>('get_product_kardex', {
        productId: selectedProduct!.id,
        startDate,
        endDate,
        locationId,
      }),
    enabled: !!selectedProduct,
  });

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProductSearch('');
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!kardex) return;

    const headers = [
      'Data',
      'Tipo',
      'Documento',
      'Descrição',
      'Local',
      'Entrada',
      'Saída',
      'Saldo',
      'Custo Unit.',
      'Custo Total',
    ];
    const rows = kardex.entries.map((e) => [
      format(new Date(e.date), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      documentTypeLabels[e.documentType] || e.documentType,
      e.documentCode,
      e.description,
      e.locationName,
      e.qtyIn.toFixed(2),
      e.qtyOut.toFixed(2),
      e.balance.toFixed(2),
      e.unitCost.toFixed(2),
      e.totalCost.toFixed(2),
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kardex_${kardex.productCode}_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [kardex, startDate, endDate]);

  const handleExportPDF = useCallback(() => {
    if (!kardex) return;

    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kardex - ${kardex.productCode}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 2px 0; }
          .summary { display: flex; gap: 30px; margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
          .summary-item { text-align: center; }
          .summary-item .value { font-size: 18px; font-weight: bold; }
          .summary-item .label { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #333; color: white; padding: 8px 4px; text-align: left; }
          td { padding: 6px 4px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .qty-in { color: #16a34a; }
          .qty-out { color: #dc2626; }
          .text-right { text-align: right; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>KARDEX - Relatório de Movimentação</h1>
        <h2>${kardex.productCode} - ${kardex.productName}</h2>
        
        <div class="info">
          <p><strong>Período:</strong> ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(
      new Date(endDate),
      'dd/MM/yyyy'
    )}</p>
          <p><strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', {
            locale: ptBR,
          })}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="value">${kardex.openingBalance.toFixed(2)}</div>
            <div class="label">Saldo Inicial</div>
          </div>
          <div class="summary-item">
            <div class="value qty-in">+${kardex.totalIn.toFixed(2)}</div>
            <div class="label">Total Entradas</div>
          </div>
          <div class="summary-item">
            <div class="value qty-out">-${kardex.totalOut.toFixed(2)}</div>
            <div class="label">Total Saídas</div>
          </div>
          <div class="summary-item">
            <div class="value">${kardex.closingBalance.toFixed(2)}</div>
            <div class="label">Saldo Final</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Documento</th>
              <th>Descrição</th>
              <th>Local</th>
              <th class="text-right">Entrada</th>
              <th class="text-right">Saída</th>
              <th class="text-right">Saldo</th>
              <th class="text-right">Custo</th>
            </tr>
          </thead>
          <tbody>
            ${kardex.entries
              .map(
                (e) => `
              <tr>
                <td>${format(new Date(e.date), 'dd/MM/yy HH:mm')}</td>
                <td>${documentTypeLabels[e.documentType] || e.documentType}</td>
                <td>${e.documentCode}</td>
                <td>${e.description}</td>
                <td>${e.locationName}</td>
                <td class="text-right qty-in">${e.qtyIn > 0 ? `+${e.qtyIn.toFixed(2)}` : '-'}</td>
                <td class="text-right qty-out">${
                  e.qtyOut > 0 ? `-${e.qtyOut.toFixed(2)}` : '-'
                }</td>
                <td class="text-right">${e.balance.toFixed(2)}</td>
                <td class="text-right">${formatCurrency(e.totalCost)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }, [kardex, startDate, endDate]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kardex - Movimentação</h1>
          <p className="text-muted-foreground">
            Relatório de rastreabilidade de movimentações por produto
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Selecione o produto e período para consulta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Product Search */}
            <div className="lg:col-span-2 relative">
              <Label htmlFor="product-search">Produto</Label>
              {selectedProduct ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="py-1.5 px-3">
                    <Package className="h-4 w-4 mr-2" />
                    {selectedProduct.internalCode} - {selectedProduct.name}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="product-search"
                    placeholder="Buscar por nome ou código..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 mt-1.5"
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2"
                          onClick={() => handleProductSelect(product)}
                        >
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{product.internalCode}</span>
                          <span className="text-sm truncate">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div>
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>

            {/* Location Filter */}
            <div>
              <Label htmlFor="location">Local (Opcional)</Label>
              <Select value={locationId || ''} onValueChange={(v) => setLocationId(v || undefined)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Todos os locais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os locais</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {selectedProduct && (
        <>
          {/* Summary Cards */}
          {isLoadingKardex ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : kardex ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                  <p className="text-2xl font-bold">{kardex.openingBalance.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ArrowDown className="h-4 w-4 text-green-600" /> Entradas
                  </p>
                  <p className="text-2xl font-bold text-green-600">+{kardex.totalIn.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ArrowUp className="h-4 w-4 text-red-600" /> Saídas
                  </p>
                  <p className="text-2xl font-bold text-red-600">-{kardex.totalOut.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Saldo Final</p>
                  <p className="text-2xl font-bold">{kardex.closingBalance.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Entries Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Movimentações</CardTitle>
                <CardDescription>
                  {kardex?.entries.length || 0} registros no período
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!kardex}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!kardex}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingKardex ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : kardex && kardex.entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Entrada</TableHead>
                        <TableHead className="text-right">Saída</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kardex.entries.map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(entry.date), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-xs',
                                documentTypeColors[entry.documentType] || 'bg-gray-100'
                              )}
                            >
                              {documentTypeLabels[entry.documentType] || entry.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{entry.documentCode}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={entry.description}>
                            {entry.description}
                          </TableCell>
                          <TableCell>{entry.locationName}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {entry.qtyIn > 0 ? `+${entry.qtyIn.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {entry.qtyOut > 0 ? `-${entry.qtyOut.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.balance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(entry.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma movimentação encontrada no período
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedProduct && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">Selecione um Produto</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use o campo de busca acima para encontrar o produto desejado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
