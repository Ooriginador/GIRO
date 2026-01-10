# Contributing to GIRO

Obrigado por considerar contribuir com o GIRO! 🎉

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)

## 📜 Código de Conduta

Este projeto adere ao [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, espera-se que você o respeite.

## 🤝 Como Posso Contribuir?

### 🐛 Reportando Bugs

Antes de criar um bug report:
- Verifique se o bug já não foi reportado
- Determine qual repositório/módulo está afetado
- Colete informações sobre o problema

**Template de Bug Report**:
```markdown
**Descrição**
Descrição clara do bug

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer

**Screenshots**
Se aplicável

**Ambiente**
- OS: [e.g. Windows 11]
- Versão: [e.g. 1.0.0]
- Browser/App: [e.g. Chrome, Desktop App]
```

### 💡 Sugerindo Melhorias

**Template de Feature Request**:
```markdown
**Problema**
Descrição do problema que a feature resolve

**Solução Proposta**
Como você imagina que funcione

**Alternativas Consideradas**
Outras abordagens que você pensou

**Contexto Adicional**
Screenshots, exemplos, etc.
```

### 🔧 Contribuindo com Código

1. **Fork** o repositório
2. **Clone** seu fork
3. **Crie** uma branch (`git checkout -b feature/AmazingFeature`)
4. **Commit** suas mudanças (`git commit -m 'feat: Add AmazingFeature'`)
5. **Push** para a branch (`git push origin feature/AmazingFeature`)
6. **Abra** um Pull Request

## ⚙️ Configuração do Ambiente

### Desktop

```bash
# Clone o repositório
git clone git@github.com:jhonslife/GIRO.git
cd GIRO

# Instale dependências
pnpm install

# Configure o banco de dados
cd packages/database
pnpm prisma generate
pnpm prisma db push

# Execute em modo dev
cd ../../apps/desktop
pnpm tauri dev
```

### Mobile

```bash
cd giro-mobile
pnpm install
pnpm expo prebuild
pnpm android # ou pnpm ios
```

## 📐 Padrões de Código

### Conventional Commits

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

**Exemplos**:
```bash
feat(pdv): add product barcode scanner
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
test(products): add unit tests for CRUD operations
```

### TypeScript/JavaScript

```typescript
// ✅ BOM
const getUserById = async (id: string): Promise<User> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return user;
};

// ❌ RUIM
function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}
```

### Rust

```rust
// ✅ BOM
pub async fn get_product_by_id(pool: &SqlitePool, id: i32) -> Result<Product, Error> {
    sqlx::query_as!(Product, "SELECT * FROM products WHERE id = ?", id)
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))
}

// ❌ RUIM
pub async fn get_product(pool: &SqlitePool, id: i32) -> Product {
    sqlx::query_as!(Product, "SELECT * FROM products WHERE id = ?", id)
        .fetch_one(pool)
        .await
        .unwrap()
}
```

### Formatação

- **TypeScript/JavaScript**: Prettier + ESLint
- **Rust**: rustfmt + clippy
- **Indentação**: 2 espaços (TS/JS), 4 espaços (Rust)

```bash
# Format code
pnpm format        # TypeScript/JavaScript
cargo fmt          # Rust

# Lint
pnpm lint          # TypeScript/JavaScript
cargo clippy       # Rust
```

## 🔄 Processo de Pull Request

1. **Atualize** sua branch com a main
2. **Escreva** testes para novas funcionalidades
3. **Execute** todos os testes (`pnpm test`)
4. **Garanta** que o build passa (`pnpm build`)
5. **Atualize** a documentação se necessário
6. **Descreva** claramente suas mudanças no PR

### Checklist do PR

- [ ] Código segue os padrões do projeto
- [ ] Commits seguem Conventional Commits
- [ ] Testes adicionados/atualizados
- [ ] Todos os testes passam
- [ ] Build de produção funciona
- [ ] Documentação atualizada
- [ ] Sem conflitos com a branch main
- [ ] Code review solicitado

### Template de PR

```markdown
## Descrição
Breve descrição das mudanças

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passo 1
2. Passo 2
3. ...

## Screenshots
Se aplicável

## Checklist
- [ ] Código segue padrões
- [ ] Testes passam
- [ ] Documentação atualizada
```

## 🧪 Testes

```bash
# Testes unitários
pnpm test

# Testes E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

**Cobertura mínima**: 80% para código novo

## 📝 Documentação

Sempre atualize a documentação ao:
- Adicionar novas funcionalidades
- Modificar APIs
- Alterar comportamentos
- Adicionar dependências

## 🎨 Design System

Ao contribuir com UI:
- Siga o Figma design (se disponível)
- Use componentes do Radix UI
- Mantenha acessibilidade (WCAG 2.1 AA)
- Teste em mobile e desktop
- Suporte dark mode

## 🐛 Debugging

```bash
# Desktop
RUST_LOG=debug pnpm tauri dev

# Mobile
pnpm expo start --clear
```

## 📞 Dúvidas?

- 💬 Abra uma [Discussion](https://github.com/jhonslife/GIRO/discussions)
- 📧 Email: dev@arkheion.com
- 🐛 [Issues](https://github.com/jhonslife/GIRO/issues)

---

**Obrigado por contribuir com o GIRO!** 🙏✨
