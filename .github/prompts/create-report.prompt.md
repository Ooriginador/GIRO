---
mode: agent
description: Gera relatório completo com filtros, tabela e exportação
variables:
  - name: reportName
    description: Nome do relatório (ex: Sales Report, Inventory Valuation)
  - name: entity
    description: Entidade principal (Sale, Product, Customer)
  - name: filters
    description: Filtros disponíveis (ex: dateRange, category, status)
agent: Relatorios
---

# Criar Relatório: {{reportName}}

## Entidade: {{entity}}
## Filtros: {{filters}}

---

## 1. Backend - Query Command

```rust
// src/commands/reports.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct {{entity}}ReportFilter {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct {{entity}}ReportRow {
    // Campos do relatório
}

#[derive(Debug, Serialize)]
pub struct {{entity}}ReportSummary {
    pub total_count: i64,
    pub total_value: f64,
    pub average_value: f64,
}

#[derive(Debug, Serialize)]
pub struct {{entity}}ReportResult {
    pub rows: Vec<{{entity}}ReportRow>,
    pub summary: {{entity}}ReportSummary,
}

#[command]
pub async fn get_{{entity | snake_case}}_report(
    filter: {{entity}}ReportFilter,
    state: State<'_, AppState>,
) -> Result<{{entity}}ReportResult, String> {
    let service = ReportService::new(state.pool.clone());
    service.generate_{{entity | snake_case}}_report(filter)
        .await
        .map_err(|e| e.to_string())
}
```

---

## 2. Frontend - Report Page

```tsx
// pages/Reports/{{entity}}Report.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/features/ExportButton';

export default function {{entity}}ReportPage() {
  const [filters, setFilters] = useState<{{entity}}ReportFilter>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const report = useQuery({
    queryKey: ['{{entity | lowercase}}-report', filters],
    queryFn: () => invoke<{{entity}}ReportResult>('get_{{entity | snake_case}}_report', { filter: filters }),
  });

  const columns = [
    { accessorKey: 'date', header: 'Data' },
    { accessorKey: 'description', header: 'Descrição' },
    { accessorKey: 'value', header: 'Valor', cell: (v) => formatCurrency(v) },
    // ... mais colunas
  ];

  return (
    <div className="flex flex-col h-full p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{{reportName}}</h1>
        <ExportButton 
          data={report.data?.rows} 
          filename="{{entity | lowercase}}-report"
        />
      </header>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <DateRangePicker
          value={{ start: filters.startDate, end: filters.endDate }}
          onChange={(range) => setFilters({ ...filters, ...range })}
        />
        {/* Outros filtros */}
      </div>

      {/* Resumo */}
      {report.data?.summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <SummaryCard 
            title="Total" 
            value={report.data.summary.totalCount} 
          />
          <SummaryCard 
            title="Valor Total" 
            value={formatCurrency(report.data.summary.totalValue)} 
          />
          <SummaryCard 
            title="Média" 
            value={formatCurrency(report.data.summary.averageValue)} 
          />
        </div>
      )}

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={report.data?.rows ?? []}
        isLoading={report.isLoading}
      />
    </div>
  );
}
```

---

## 3. Exportação

### CSV
```typescript
// utils/export.ts
export function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${filename}.csv`);
}
```

### PDF (via backend)
```rust
#[command]
pub async fn export_{{entity | snake_case}}_report_pdf(
    filter: {{entity}}ReportFilter,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    let report = get_{{entity | snake_case}}_report(filter, state).await?;
    PdfGenerator::generate_report(&report).map_err(|e| e.to_string())
}
```

---

## 4. Gráficos (Opcional)

```tsx
// components/charts/{{entity}}Chart.tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function {{entity}}Chart({ data }: { data: ChartData[] }) {
  return (
    <AreaChart width={600} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Area 
        type="monotone" 
        dataKey="value" 
        stroke="#2563eb" 
        fill="#93c5fd" 
      />
    </AreaChart>
  );
}
```

---

## Checklist
- [ ] Query command criado
- [ ] Filtros implementados
- [ ] Página de relatório
- [ ] Resumo com totais
- [ ] DataTable com paginação
- [ ] Exportação CSV
- [ ] Exportação PDF (opcional)
- [ ] Gráficos (opcional)
- [ ] Testes
