# Debug Crash Analysis

Analise o crash/erro e identifique a causa raiz:

## Contexto do Erro

- **Arquivo(s) afetado(s):** {{files}}
- **Mensagem de erro:** {{error_message}}
- **Stack trace:** {{stack_trace}}
- **Reprodução:** {{steps_to_reproduce}}

## Análise Solicitada

1. **Identificar causa raiz** - Analise o código e trace o problema
2. **Propor correção** - Implemente a correção mínima necessária
3. **Prevenir recorrência** - Sugira melhorias para evitar o problema
4. **Criar teste** - Adicione teste que capture o cenário do bug

## Ferramentas

Use os seguintes recursos:

- `sequential-thinking` MCP para raciocínio sistemático
- `Debugger` agent para análise profunda
- Logs disponíveis em `GIRO/logs/`

## Output Esperado

- [ ] Causa raiz identificada
- [ ] Fix implementado
- [ ] Teste de regressão criado
- [ ] Documentação do bug (se crítico)
