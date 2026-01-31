# Novo Sistema de Autenticação - Guia Técnico

## Visão Geral

O sistema GIRO agora suporta **Autenticação Dual**, permitindo maior segurança para perfis administrativos e mantendo a agilidade para operadores de caixa.

## Perfis e Métodos

| Perfil                | Método Recomendado    | Descrição                                           |
| :-------------------- | :-------------------- | :-------------------------------------------------- |
| **Operador de Caixa** | **PIN** (4-6 dígitos) | Login rápido para PDV. Apenas acesso a vendas.      |
| **Estoquista**        | **PIN** (4-6 dígitos) | Acesso a contagem e consulta de estoque.            |
| **Gerente**           | **Senha** (Forte)     | Acesso completo. Exige senha complexa.              |
| **Administrador**     | **Senha** (Forte)     | Acesso total e configurações. Exige senha complexa. |

## Fluxos Implementados

### 1. Login

- A tela de login detecta automaticamente se o input é PIN ou inicia fluxo de senha.
- Se o usuário for ADMIN/MANAGER, o sistema pode exigir troca de senha no primeiro acesso (se configurado).

### 2. Recuperação de Senha

- **Esqueci minha senha**: Envia token para email cadastrado.
- **Redefinição**: Link com token permite definir nova senha na tela `ResetPasswordPage`.

### 3. Troca de Senha

- Usuários autenticados podem trocar senha em `Configurações > Segurança`.
- O sistema força troca de senha a cada X dias (configurável, padrão 90).

## Configuração Técnica

### Variáveis de Ambiente

Nenhuma variável nova obrigatória. As políticas são definidas no banco de dados (`Setting` table).

### Banco de Dados

Novos campos adicionados na tabela `Employee`:

- `username`
- `password` (Argon2id hash)
- `failedLoginAttempts`, `lockedUntil`
- `lastLoginAt`, `lastLoginIp`

### Logs e Auditoria

Todas as tentativas de login (sucesso/falha/bloqueio) são registradas.

## Migração de Usuários Antigos

1. **Admins**: Recebem username automático (`admin_nome_sobrenome`).
2. **Senha**: Devem usar "Recuperar Senha" ou login com PIN antigo (se ativo) seguido de setup de senha obrigatório.
