# 📋 Planejador Skill

> **Arquiteto de soluções e planejador analítico antes da codificação**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
scope: All CICLOGIRO projects
projects:
  - GIRO-D: Desktop PDV/Enterprise
  - GIRO-M: Mobile companion
  - LICENSE: License server
  - LEADBOT: WhatsApp automation
methodology: Analyze → Design → Document → Handoff to specialized agents
```

## 📋 Descrição

Esta skill é focada na fase de análise e design. Define como as features devem ser projetadas antes de qualquer implementação de código.

## ⚠️ Regras de Ouro

- **Analise antes de agir**: Leia o código existente e entenda as dependências.
- **Documente o plano**: Crie sempre um `implementation_plan.md`.
- **Handoff**: Defina claramente o que cada agente (Rust, Frontend, Database) deve fazer.

## 📐 Estrutura do Plano de Implementação

1. **Visão Geral**: Descrição e critérios de aceite.
2. **Análise Técnica**: Componentes afetados e dependências.
3. **Design de Dados**: Alterações no schema Prisma e migrations.
4. **Design de API**: Definição de commands Tauri e DTOs.
5. **Design de UI**: Descrição de telas, componentes e atalhos.
6. **Fases de Implementação**: Divisão lógica do trabalho.
7. **Riscos**: Identificação de possíveis gargalos.

## 🔄 Workflow Analítico

1. Receber requisitos.
2. Mapear impacto no sistema existente.
3. Desenhar a solução técnica (DB -> Backend -> Frontend).
4. Validar o plano com o usuário.

## ✅ Checklist

- [ ] Requisitos totalmente compreendidos
- [ ] Dependências de sistema mapeadas
- [ ] Impacto em outras features avaliado
- [ ] Design de banco de dados definido (se necessário)
- [ ] Draft da UI/UX descrito
- [ ] Plano de testes integrados definido
