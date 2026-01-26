# 🧪 Guia de Testes - Funcionalidades LGPD

> **Objetivo**: Validar todas as funcionalidades de proteção de dados implementadas  
> **Tempo estimado**: 30-45 minutos  
> **Pré-requisitos**: App compilado com `pnpm tauri dev`

---

## 🔧 Setup Inicial

### 1. Configurar Chave de Criptografia

```bash
# Gerar chave de 32 bytes (AES-256)
openssl rand -hex 32

# Exemplo de output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Adicionar no .env
cd GIRO/apps/desktop
echo "GIRO_PII_KEY=<cole-a-chave-aqui>" >> .env
```

### 2. Verificar Banco de Dados Limpo

```bash
# Backup do DB atual (opcional)
cp src-tauri/giro.db src-tauri/giro.db.backup

# Ou limpar dados de teste antigos
sqlite3 src-tauri/giro.db "DELETE FROM employees WHERE name LIKE '%Teste%';"
sqlite3 src-tauri/giro.db "DELETE FROM customers WHERE name LIKE '%Teste%';"
```

### 3. Iniciar Aplicação

```bash
cd GIRO/apps/desktop
pnpm tauri dev
```

**Aguardar**: App abrir e tela de login aparecer

---

## ✅ Testes Funcionais

### Teste 1: Visualização de Dados Próprios

**Objetivo**: Verificar que funcionário vê seus dados pessoais

**Passos**:

1. Login com credenciais de funcionário
2. Sidebar → Clicar em "Meus Dados" (ícone de escudo 🛡️)
3. Validar que página carrega

**Validações**:

- [ ] Página "Meus Dados" carrega sem erro
- [ ] Exibe nome do funcionário logado
- [ ] Exibe CPF (ou "Não informado")
- [ ] Exibe email
- [ ] Exibe telefone
- [ ] Exibe cargo
- [ ] Exibe datas de criação e atualização
- [ ] Botões "Exportar" e "Excluir" estão visíveis

**Resultado Esperado**: Todos os dados pessoais são exibidos corretamente

---

### Teste 2: Exportação de Dados (Employee)

**Objetivo**: Exportar dados pessoais em formato JSON

**Passos**:

1. Na página "Meus Dados"
2. Clicar em "Exportar Meus Dados"
3. Aguardar download

**Validações**:

- [ ] Toast de sucesso aparece
- [ ] Arquivo `employee_data.json` é baixado
- [ ] Abrir arquivo JSON e verificar estrutura:
  ```json
  {
    "id": "uuid",
    "name": "Nome Completo",
    "cpf": "123.456.789-00",
    "email": "email@example.com",
    "phone": "(11) 98765-4321",
    "role": "Gerente",
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
  ```
- [ ] CPF está descriptografado (se estava criptografado no DB)
- [ ] Todos os campos estão presentes

**Resultado Esperado**: JSON válido com todos os dados do funcionário

---

### Teste 3: Exclusão de Dados (Employee) - **CUIDADO**

**⚠️ AVISO**: Este teste DELETA permanentemente o funcionário do banco de dados!

**Pré-requisito**: Usar conta de teste ou criar funcionário temporário

**Passos**:

1. Na página "Meus Dados"
2. Clicar em "Excluir Meus Dados Permanentemente"
3. Ler dialog de confirmação
4. Marcar checkbox "Entendo que esta ação é irreversível"
5. Clicar em "Confirmar Exclusão"

**Validações**:

- [ ] Dialog de confirmação aparece
- [ ] Checkbox de confirmação está presente
- [ ] Botão "Confirmar" só ativa com checkbox marcada
- [ ] Toast de sucesso aparece
- [ ] App faz logout automático
- [ ] Redireciona para tela de login
- [ ] Não é possível fazer login novamente com as mesmas credenciais
- [ ] Verificar DB: `sqlite3 giro.db "SELECT * FROM employees WHERE id = '<id-do-funcionario>';"` → 0 resultados

**Resultado Esperado**: Funcionário deletado permanentemente e logout forçado

---

### Teste 4: Exportação de Dados de Cliente

**Objetivo**: Gerente exporta dados de um cliente

**Passos**:

1. Login com credenciais de gerente/admin
2. Sidebar → "Clientes"
3. Localizar um cliente na tabela
4. Clicar no dropdown de ações (⋮) na linha do cliente
5. Clicar em "Exportar Dados LGPD"

**Validações**:

- [ ] Toast de sucesso aparece
- [ ] Arquivo `customer_<id>_data.json` é baixado
- [ ] Abrir JSON e verificar estrutura:
  ```json
  {
    "id": "uuid",
    "name": "Cliente Teste",
    "cpf": "987.654.321-00",
    "cnpj": null,
    "email": "cliente@example.com",
    "phone": "(11) 91234-5678",
    "address": {
      "street": "Rua Teste",
      "number": "123",
      "city": "São Paulo",
      "state": "SP",
      "zipcode": "01234-567"
    },
    "created_at": "2026-01-01T10:00:00Z",
    "purchases": [
      // histórico de compras se houver
    ]
  }
  ```
- [ ] CPF/CNPJ estão descriptografados
- [ ] Endereço completo está presente

**Resultado Esperado**: JSON completo com todos os dados do cliente

---

### Teste 5: Exclusão de Cliente - **CUIDADO**

**⚠️ AVISO**: Este teste DELETA permanentemente o cliente e suas vendas relacionadas!

**Pré-requisito**: Usar cliente de teste

**Passos**:

1. Na página "Clientes"
2. Localizar cliente de teste
3. Dropdown de ações (⋮)
4. Clicar em "Excluir Dados LGPD"
5. Ler dialog de confirmação
6. Marcar checkbox de confirmação
7. Clicar em "Confirmar Exclusão"

**Validações**:

- [ ] Dialog de confirmação aparece
- [ ] Checkbox de confirmação obrigatória
- [ ] Toast de sucesso
- [ ] Cliente desaparece da tabela
- [ ] Verificar DB: `sqlite3 giro.db "SELECT * FROM customers WHERE id = '<id>';"` → 0 resultados
- [ ] Verificar que vendas relacionadas também foram deletadas (ou tratadas)

**Resultado Esperado**: Cliente deletado permanentemente

---

## 🔐 Testes de Segurança

### Teste 6: Criptografia de CPF/CNPJ

**Objetivo**: Verificar que dados são criptografados no banco

**Passos**:

1. Criar novo cliente com CPF "123.456.789-00"
2. Abrir terminal e executar:
   ```bash
   sqlite3 GIRO/apps/desktop/src-tauri/giro.db
   SELECT id, name, cpf FROM customers WHERE cpf LIKE '%123%' OR cpf LIKE 'enc:%';
   ```

**Validações**:

- [ ] CPF no DB NÃO está em texto claro "123.456.789-00"
- [ ] CPF está no formato `enc:<base64-string>`
- [ ] Ao abrir cliente no app, CPF é exibido corretamente (descriptografado)

**Resultado Esperado**: CPF criptografado no DB, descriptografado na UI

---

### Teste 7: Busca com Criptografia

**Objetivo**: Verificar que busca funciona mesmo com dados criptografados

**Passos**:

1. Na página "Clientes"
2. Campo de busca → digitar parte do CPF ou nome
3. Validar resultados

**Validações**:

- [ ] Busca por nome funciona normalmente
- [ ] Busca por CPF parcial funciona (ex: "123.456")
- [ ] Busca por CPF completo funciona
- [ ] Performance aceitável (< 2s para 100 registros)

**Resultado Esperado**: Busca funciona com criptografia (in-memory search)

---

### Teste 8: Chave Inválida

**Objetivo**: Verificar comportamento com chave de criptografia incorreta

**Passos**:

1. Parar app
2. Alterar `GIRO_PII_KEY` no `.env` para valor inválido
3. Iniciar app novamente
4. Tentar abrir cliente com CPF criptografado

**Validações**:

- [ ] App não quebra/crash
- [ ] CPF é exibido como "Erro ao descriptografar" ou similar
- [ ] Log de erro é registrado
- [ ] Usuário é notificado (toast ou mensagem)

**Resultado Esperado**: Falha graciosa com chave inválida

---

## 🧹 Testes de Edge Cases

### Teste 9: Exclusão de Funcionário Logado

**Já coberto no Teste 3** ✅

---

### Teste 10: Exportação com Dados Vazios

**Objetivo**: Exportar dados de funcionário/cliente sem CPF ou outros campos opcionais

**Passos**:

1. Criar funcionário sem CPF, telefone, etc.
2. Exportar dados

**Validações**:

- [ ] JSON é gerado corretamente
- [ ] Campos vazios aparecem como `null` ou `"Não informado"`
- [ ] Sem erros ou crashes

**Resultado Esperado**: JSON válido mesmo com campos vazios

---

### Teste 11: Permissões de Acesso

**Objetivo**: Verificar que funcionário comum não pode excluir outros funcionários

**Passos**:

1. Login como funcionário comum (não admin)
2. Tentar acessar dados de outro funcionário
3. Tentar excluir outro funcionário

**Validações**:

- [ ] Funcionário comum só vê seus próprios dados em /my-data
- [ ] Não há interface para excluir outros funcionários
- [ ] Se tentar via API diretamente, recebe erro 403 Forbidden

**Resultado Esperado**: Funcionários só gerenciam seus próprios dados

---

## 📊 Testes de Performance

### Teste 12: Volume de Dados

**Objetivo**: Validar performance com banco grande

**Passos**:

1. Importar 1000 clientes (script de seed)
2. Buscar cliente por CPF
3. Exportar dados de cliente
4. Excluir cliente

**Validações**:

- [ ] Busca retorna em < 2 segundos
- [ ] Exportação gera JSON em < 1 segundo
- [ ] Exclusão completa em < 1 segundo
- [ ] Interface não trava

**Resultado Esperado**: Performance aceitável mesmo com volume

---

## 🔄 Testes de Integração

### Teste 13: Fluxo Completo (Employee)

**Passos**:

1. Criar novo funcionário
2. Login com esse funcionário
3. Acessar "Meus Dados"
4. Exportar dados → validar JSON
5. Editar dados (nome, email)
6. Exportar novamente → validar atualização
7. Excluir dados → validar logout

**Validações**:

- [ ] Todos os passos funcionam sequencialmente
- [ ] Dados atualizados refletem no export
- [ ] Exclusão finaliza com logout

**Resultado Esperado**: Fluxo E2E sem erros

---

### Teste 14: Fluxo Completo (Customer)

**Passos**:

1. Login como gerente
2. Criar novo cliente
3. Fazer venda para esse cliente
4. Exportar dados do cliente → validar venda no JSON
5. Excluir cliente → validar que vendas foram tratadas

**Validações**:

- [ ] Cliente criado com sucesso
- [ ] Venda registrada
- [ ] Export inclui histórico de vendas
- [ ] Exclusão não quebra integridade referencial

**Resultado Esperado**: Fluxo E2E sem erros

---

## 🐛 Testes de Regressão

### Teste 15: Funcionalidades Existentes

**Objetivo**: Garantir que LGPD não quebrou funcionalidades existentes

**Passos**:

1. Criar cliente → Validar que criptografia não quebrou create
2. Editar cliente → Validar que criptografia não quebrou update
3. Listar clientes → Validar que lista carrega normalmente
4. Buscar cliente → Validar que busca funciona
5. Fazer venda → Validar que PDV funciona
6. Visualizar relatórios → Validar que dados aparecem

**Validações**:

- [ ] CRUD de clientes funciona normalmente
- [ ] CRUD de funcionários funciona
- [ ] PDV não foi afetado
- [ ] Relatórios não quebrados

**Resultado Esperado**: Nenhuma regressão

---

## 📝 Checklist de Testes

### Testes Obrigatórios

- [ ] Teste 1: Visualização de Dados Próprios
- [ ] Teste 2: Exportação de Dados (Employee)
- [ ] Teste 4: Exportação de Dados de Cliente
- [ ] Teste 6: Criptografia de CPF/CNPJ
- [ ] Teste 15: Funcionalidades Existentes

### Testes Destrutivos (Opcional - com backup)

- [ ] Teste 3: Exclusão de Dados (Employee)
- [ ] Teste 5: Exclusão de Cliente

### Testes de Segurança (Recomendado)

- [ ] Teste 7: Busca com Criptografia
- [ ] Teste 8: Chave Inválida
- [ ] Teste 11: Permissões de Acesso

### Testes de Performance (Opcional)

- [ ] Teste 12: Volume de Dados

### Testes E2E (Recomendado)

- [ ] Teste 13: Fluxo Completo (Employee)
- [ ] Teste 14: Fluxo Completo (Customer)

---

## 🚨 Problemas Comuns

### 1. Erro "PII key not configured"

**Solução**:

```bash
# Verificar se .env existe
cat GIRO/apps/desktop/.env | grep GIRO_PII_KEY

# Se não existir, adicionar
openssl rand -hex 32
echo "GIRO_PII_KEY=<chave>" >> GIRO/apps/desktop/.env

# Reiniciar app
```

### 2. CPF aparece como "enc:..."

**Causa**: Criptografia ativada mas chave não configurada no .env

**Solução**: Verificar variável de ambiente (problema #1)

### 3. "Failed to decrypt CPF"

**Causa**: Chave mudou após dados serem criptografados

**Soluções**:

- Restaurar chave antiga
- OU limpar dados criptografados
- OU migrar dados com script

### 4. Busca não retorna resultados

**Causa**: Busca in-memory pode ser case-sensitive

**Solução**: Verificar implementação em `customer_repository.rs` linha ~180

### 5. Export não baixa arquivo

**Causa**: Bloqueador de popup no browser

**Solução**: Permitir downloads no Tauri webview

---

## 📊 Relatório de Testes

Após concluir os testes, preencher:

```markdown
# Relatório de Testes LGPD

**Data**: **_/_**/2026  
**Testador**: ****\_\_\_****  
**Versão do App**: **\_\_\_**

## Resumo

- Testes Executados: \_\_\_/15
- Testes Passaram: \_\_\_
- Testes Falharam: \_\_\_
- Bugs Encontrados: \_\_\_

## Bugs/Issues

1. ***
2. ***

## Observações

---

---

## Conclusão

[ ] Aprovado para produção
[ ] Requer correções
[ ] Bloqueado (bug crítico)
```

---

## ✅ Critérios de Aceitação

Para considerar a implementação **aprovada**, todos os seguintes devem passar:

- ✅ Funcionário consegue visualizar seus dados
- ✅ Funcionário consegue exportar dados (JSON válido)
- ✅ Funcionário consegue excluir seus dados (com logout)
- ✅ Gerente consegue exportar dados de cliente
- ✅ Gerente consegue excluir cliente
- ✅ CPF/CNPJ são criptografados no banco de dados
- ✅ Busca funciona com criptografia ativada
- ✅ Nenhuma regressão em funcionalidades existentes

**Se todos passarem**: 🎉 **LGPD implementation APPROVED!**

---

_Guia criado em 25 de Janeiro de 2026._
