# 📊 Relatórios Skill

> **Especialista em relatórios, analytics, visualização de dados e exportação**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
projects:
  GIRO-D:
    path: GIRO/apps/desktop/src/pages/reports/
    backend: GIRO/apps/desktop/src-tauri/src/commands/reports/
    charts: recharts
    export: jsPDF, xlsx
  DASH:
    path: giro-license-server/dashboard/
    charts: recharts
    purpose: License analytics
```

## 📋 Descrição

Esta skill é responsável por transformar dados brutos em insights acionáveis para o usuário, abrangendo queries de agregação e componentes visuais.

## 📈 Áreas de Foco

### Analytics e Agregação

- Queries SQLx otimizadas para agrupamento temporal (Dia, Semana, Mês).
- Cálculos de Ticket Médio, Mark-up e Margem de Contribuição.
- Curva ABC de produtos e movimentação de estoque.

### Visualização (Charts)

- Uso de `recharts` para gráficos de linha, barras e pizza.
- Dashboards responsivos e interativos.
- Filtros dinâmicos de período e categorias.

### Exportação

- **PDF**: Geração de relatórios formatados para impressão (`jsPDF`).
- **Excel**: Exportação de tabelas de dados para auditoria externa (`xlsx`).

## 📐 Padrões de Implementação

- **Performance**: Use índices apropriados no SQLite para queries de grande volume.
- **UX**: Sempre forneça estados de carregamento (Skeleton/Spinner) para queries pesadas.
- **Design**: Cores e tipografia consistentes com o design system do GIRO.

## ✅ Checklist

- [ ] Queries de agregação otimizadas (Rust Side)
- [ ] Gráficos interativos com Tooltips descritivos
- [ ] Filtros de data/período persistentes
- [ ] Função de exportação para PDF/Excel funcional
- [ ] Tratamento de dados vazios ou inconsistentes
- [ ] Layout responsivo para dashboards
