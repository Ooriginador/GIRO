/**
 * @file ConsumptionReportPage - Relatório de Consumo por Contrato
 * @description Relatório detalhado de apropriação de materiais por obra
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Building2, Download, FileText, Loader2, Package } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContracts } from '@/hooks/enterprise';
import { formatCurrency } from '@/lib/utils';
import type { ConsumptionReport } from '@/lib/bindings';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export function ConsumptionReportPage() {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: contracts, isLoading: isLoadingContracts } = useContracts();

  // Get consumption report
  const {
    data: report,
    isLoading: isLoadingReport,
    error,
  } = useQuery({
    queryKey: ['consumption-report', selectedContractId, startDate, endDate],
    queryFn: async () => {
      const result = await invoke<ConsumptionReport>('report_consumption_by_contract', {
        contractId: selectedContractId,
        dateFrom: startDate || null,
        dateTo: endDate || null,
      });
      return result;
    },
    enabled: !!selectedContractId,
  });

  const selectedContract = useMemo(
    () => contracts?.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );

  const handleExportCSV = useCallback(() => {
    if (!report || !selectedContract) return;

    const lines = [
      `Relatório de Consumo - ${selectedContract.code} - ${selectedContract.name}`,
      `Período: ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(
        new Date(endDate),
        'dd/MM/yyyy'
      )}`,
      '',
      'POR CATEGORIA',
      'Categoria;Valor Total;Qtd Itens',
      ...report.byCategory.map(
        (c) => `${c.categoryName};${c.totalValue.toFixed(2)};${c.itemsCount}`
      ),
      '',
      'POR ATIVIDADE',
      'Código;Atividade;Valor Total;Qtd Itens',
      ...report.byActivity.map(
        (a) => `${a.activityCode};${a.activityName};${a.totalValue.toFixed(2)};${a.itemsCount}`
      ),
      '',
      `TOTAL GERAL;${report.totalValue.toFixed(2)};${report.itemsCount}`,
    ];

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consumo_${selectedContract.code}_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [report, selectedContract, startDate, endDate]);

  const handleExportPDF = useCallback(() => {
    if (!report || !selectedContract) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consumo - ${selectedContract.code}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 15px; }
          h3 { font-size: 13px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 2px 0; }
          .total-box { background: #2563eb; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .total-box .value { font-size: 28px; font-weight: bold; }
          .total-box .label { font-size: 12px; opacity: 0.9; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          th { background: #333; color: white; padding: 8px 4px; text-align: left; }
          td { padding: 6px 4px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Consumo de Materiais</h1>
        <h2>${selectedContract.code} - ${selectedContract.name}</h2>
        
        <div class="info">
          <p><strong>Período:</strong> ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(
      new Date(endDate),
      'dd/MM/yyyy'
    )}</p>
          <p><strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', {
            locale: ptBR,
          })}</p>
        </div>

        <div class="total-box">
          <div class="value">${formatCurrency(report.totalValue)}</div>
          <div class="label">Total Consumido (${report.itemsCount} apropriações)</div>
        </div>

        <h3>Consumo por Categoria</h3>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th class="text-right">Valor</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            ${report.byCategory
              .map(
                (c) => `
              <tr>
                <td>${c.categoryName}</td>
                <td class="text-right">${formatCurrency(c.totalValue)}</td>
                <td class="text-right">${c.itemsCount}</td>
                <td class="text-right">${((c.totalValue / report.totalValue) * 100).toFixed(
                  1
                )}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h3>Consumo por Atividade</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Atividade</th>
              <th class="text-right">Valor</th>
              <th class="text-right">Qtd</th>
            </tr>
          </thead>
          <tbody>
            ${report.byActivity
              .map(
                (a) => `
              <tr>
                <td>${a.activityCode}</td>
                <td>${a.activityName}</td>
                <td class="text-right">${formatCurrency(a.totalValue)}</td>
                <td class="text-right">${a.itemsCount}</td>
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
  }, [report, selectedContract, startDate, endDate]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumo por Contrato</h1>
          <p className="text-muted-foreground">
            Relatório de apropriação de materiais por obra/contrato
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Selecione o contrato e período para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Contract Select */}
            <div>
              <Label htmlFor="contract">Contrato</Label>
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione um contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingContracts ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : (
                    contracts?.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {contract.code} - {contract.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {selectedContractId && (
        <>
          {isLoadingReport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando relatório...</span>
            </div>
          ) : report ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <p className="text-sm opacity-90">Valor Total Consumido</p>
                    <p className="text-3xl font-bold">{formatCurrency(report.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">Total de Apropriações</p>
                    <p className="text-3xl font-bold">{report.itemsCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">Categorias</p>
                    <p className="text-3xl font-bold">{report.byCategory.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Tables */}
              <Tabs defaultValue="category" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="category">Por Categoria</TabsTrigger>
                    <TabsTrigger value="activity">Por Atividade</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>

                {/* By Category */}
                <TabsContent value="category" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {report.byCategory.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={report.byCategory}
                                dataKey="totalValue"
                                nameKey="categoryName"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, percent }) =>
                                  `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {report.byCategory.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            Sem dados
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Detalhamento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Categoria</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.byCategory.map((cat, idx) => (
                              <TableRow key={cat.categoryId || idx}>
                                <TableCell className="font-medium">{cat.categoryName}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(cat.totalValue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {((cat.totalValue / report.totalValue) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* By Activity */}
                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Consumo por Atividade</CardTitle>
                      <CardDescription>
                        {report.byActivity.length} atividades com consumo no período
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {report.byActivity.length > 0 ? (
                        <>
                          {/* Bar Chart */}
                          <div className="h-[300px] mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={report.byActivity.slice(0, 10)}
                                layout="vertical"
                                margin={{ left: 80 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  type="number"
                                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                                />
                                <YAxis
                                  dataKey="activityCode"
                                  type="category"
                                  width={70}
                                  tick={{ fontSize: 11 }}
                                />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="totalValue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Full Table */}
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Atividade</TableHead>
                                <TableHead className="text-right">Apropriações</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {report.byActivity.map((act) => (
                                <TableRow key={act.activityId}>
                                  <TableCell className="font-mono text-sm">
                                    {act.activityCode}
                                  </TableCell>
                                  <TableCell>{act.activityName}</TableCell>
                                  <TableCell className="text-right">{act.itemsCount}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(act.totalValue)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Nenhuma atividade com consumo no período
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">Erro ao carregar relatório</p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Empty State */}
      {!selectedContractId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">Selecione um Contrato</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use o filtro acima para selecionar o contrato que deseja analisar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
