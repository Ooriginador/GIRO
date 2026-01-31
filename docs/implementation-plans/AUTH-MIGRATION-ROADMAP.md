# 🔐 Roadmap: Migração de Autenticação PIN → Login/Senha

> **Projeto**: GIRO Desktop  
> **Versão Alvo**: 3.0.0  
> **Tipo**: Breaking Change - Mudança Estrutural  
> **Última Atualização**: 30 de Janeiro de 2026

---

## 📋 Sumário Executivo

### Situação Atual

O sistema GIRO utiliza **autenticação exclusiva por PIN** (4-6 dígitos) para todos os funcionários, independente do nível de acesso. Este modelo, embora simples e rápido para operações de PDV, apresenta limitações de segurança e rastreabilidade.

**Implementação Atual**:

```rust
// Schema: packages/database/prisma/schema.prisma
model Employee {
  pin      String // PIN de 4-6 dígitos (hash HMAC-SHA256)
  password String? // Campo já existe, mas não implementado
  role     EmployeeRole @default(CASHIER)
}

// Autenticação: src-tauri/src/repositories/employee_repository.rs
pub async fn authenticate_pin(&self, pin: &str) -> AppResult<Option<Employee>>
```

**Fluxo Atual**:

```
Usuario → PIN (4-6 dígitos) → Hash HMAC-SHA256 → DB Lookup → Session Create
```

### Situação Desejada

Implementar **sistema dual de autenticação**:

- **PIN**: Mantido para operadores de caixa (CASHIER, STOCKER)
- **Login/Senha**: Obrigatório para perfis administrativos (ADMIN, MANAGER)

**Benefícios**:

- ✅ Maior segurança para operações críticas
- ✅ Conformidade com LGPD/GDPR (rastreabilidade)
- ✅ Recuperação de senha via email
- ✅ Políticas de senha complexas
- ✅ Auditoria granular por credencial única

---

## 🎯 Escopo do Projeto

### Componentes Afetados

| Camada             | Componentes                                     | Impacto     |
| ------------------ | ----------------------------------------------- | ----------- |
| **Database**       | Schema Prisma, Migrations SQLite                | 🔴 CRÍTICO  |
| **Backend Rust**   | 8 comandos Tauri, 3 repositórios, 2 middlewares | 🔴 CRÍTICO  |
| **Frontend React** | 5 páginas, 12 componentes, 4 stores             | 🟡 MODERADO |
| **Mobile Sync**    | Protocolo WebSocket, autenticação JWT           | 🟡 MODERADO |
| **Testes**         | 15 specs Playwright, 78 testes Rust, 254 Vitest | 🟡 MODERADO |
| **Documentação**   | 6 docs técnicos, tutoriais, onboarding          | 🟢 BAIXO    |

### Módulos Diretamente Impactados

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULOS AFETADOS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐              │
│  │   EMPLOYEES     │◄────────┤      AUTH       │              │
│  │   Management    │         │   System Core   │              │
│  │                 │         │                 │              │
│  │  - CRUD         │         │  - Login        │              │
│  │  - Permissions  │         │  - Session      │              │
│  │  - Roles        │         │  - Tokens       │              │
│  └────────┬────────┘         └────────┬────────┘              │
│           │                           │                        │
│           ▼                           ▼                        │
│  ┌─────────────────┐         ┌─────────────────┐              │
│  │   AUDIT LOG     │         │   SETTINGS      │              │
│  │                 │         │                 │              │
│  │  - Track login  │         │  - Pwd policy   │              │
│  │  - Track changes│         │  - MFA config   │              │
│  └─────────────────┘         └─────────────────┘              │
│           │                           │                        │
│           └───────────┬───────────────┘                        │
│                       ▼                                        │
│           ┌─────────────────────┐                             │
│           │   MOBILE/SYNC       │                             │
│           │                     │                             │
│           │  - WebSocket auth   │                             │
│           │  - JWT generation   │                             │
│           └─────────────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Análise de Impacto Detalhada

### 1. DATABASE LAYER

#### Tabela `employees` (Prisma Schema)

**Estado Atual**:

```prisma
model Employee {
  id       String @id @default(cuid())
  name     String
  cpf      String? @unique
  email    String?
  pin      String // Hash HMAC-SHA256
  password String? // Existe mas não usado
  role     EmployeeRole @default(CASHIER)

  @@index([pin])
}
```

**Mudanças Necessárias**:

```prisma
model Employee {
  id       String @id @default(cuid())
  name     String
  cpf      String? @unique
  email    String? // Agora OBRIGATÓRIO para ADMIN/MANAGER
  username String? @unique // Novo campo
  pin      String? // Opcional - só para CASHIER/STOCKER
  password String? // Obrigatório para ADMIN/MANAGER (Argon2)
  role     EmployeeRole @default(CASHIER)

  // Novos campos de segurança
  passwordChangedAt DateTime?
  passwordResetToken String?
  passwordResetExpires DateTime?
  failedLoginAttempts Int @default(0)
  lockedUntil DateTime?
  lastLoginAt DateTime?
  lastLoginIp String?

  @@index([pin])
  @@index([username])
  @@index([email])
  @@index([passwordResetToken])
}
```

#### Tabela `settings` (Políticas de Senha)

**Novos Registros**:

```sql
INSERT INTO settings (key, value, category) VALUES
  ('auth.password_min_length', '8', 'security'),
  ('auth.password_require_uppercase', 'true', 'security'),
  ('auth.password_require_lowercase', 'true', 'security'),
  ('auth.password_require_numbers', 'true', 'security'),
  ('auth.password_require_special', 'false', 'security'),
  ('auth.password_expiry_days', '90', 'security'),
  ('auth.max_failed_attempts', '5', 'security'),
  ('auth.lockout_duration_minutes', '15', 'security'),
  ('auth.session_timeout_minutes', '480', 'security'),
  ('auth.allow_password_recovery', 'true', 'security');
```

#### Migration Script

**Arquivo**: `packages/database/prisma/migrations/XXX_add_auth_fields/migration.sql`

```sql
-- Step 1: Adicionar novos campos (nullable)
ALTER TABLE employees ADD COLUMN username TEXT;
ALTER TABLE employees ADD COLUMN password_changed_at TEXT;
ALTER TABLE employees ADD COLUMN password_reset_token TEXT;
ALTER TABLE employees ADD COLUMN password_reset_expires TEXT;
ALTER TABLE employees ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN locked_until TEXT;
ALTER TABLE employees ADD COLUMN last_login_at TEXT;
ALTER TABLE employees ADD COLUMN last_login_ip TEXT;

-- Step 2: Criar índices
CREATE UNIQUE INDEX idx_employees_username ON employees(username) WHERE username IS NOT NULL;
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_password_reset_token ON employees(password_reset_token);

-- Step 3: Tornar email obrigatório para ADMIN/MANAGER via trigger
CREATE TRIGGER enforce_admin_email
BEFORE INSERT ON employees
WHEN NEW.role IN ('ADMIN', 'MANAGER') AND NEW.email IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Email obrigatório para ADMIN/MANAGER');
END;

-- Step 4: Migração de dados existentes
-- Gerar username automático para admins sem email
UPDATE employees
SET username = 'admin_' || LOWER(REPLACE(name, ' ', '_'))
WHERE role = 'ADMIN' AND username IS NULL;

-- Step 5: Inserir configurações de segurança
INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
VALUES
  (hex(randomblob(16)), 'auth.password_min_length', '8', 'security', 'Tamanho mínimo da senha', datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'auth.max_failed_attempts', '5', 'security', 'Tentativas de login antes de bloquear', datetime('now'), datetime('now')),
  (hex(randomblob(16)), 'auth.lockout_duration_minutes', '15', 'security', 'Duração do bloqueio em minutos', datetime('now'), datetime('now'));
```

**Rollback**:

```sql
-- Reverter mudanças
DROP TRIGGER IF EXISTS enforce_admin_email;
DROP INDEX IF EXISTS idx_employees_username;
DROP INDEX IF EXISTS idx_employees_email;

ALTER TABLE employees DROP COLUMN username;
ALTER TABLE employees DROP COLUMN password_changed_at;
-- ... (remover todos os novos campos)

DELETE FROM settings WHERE key LIKE 'auth.%';
```

---

### 2. BACKEND RUST LAYER

#### Repositórios Afetados

**`employee_repository.rs`** - **🔴 CRÍTICO**

**Funções Atuais**:

```rust
pub async fn authenticate_pin(&self, pin: &str) -> AppResult<Option<Employee>>
pub async fn create(&self, input: CreateEmployee) -> AppResult<Employee>
pub async fn update(&self, id: &str, input: UpdateEmployee) -> AppResult<Employee>
```

**Novas Funções Necessárias**:

```rust
// ══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO
// ══════════════════════════════════════════════════════════════

/// Autenticação dual: tenta username/senha primeiro, fallback para PIN
pub async fn authenticate(
    &self,
    credentials: LoginCredentials
) -> AppResult<AuthResult>

/// Autenticação por username + senha (ADMIN/MANAGER)
pub async fn authenticate_password(
    &self,
    username: &str,
    password: &str
) -> AppResult<Option<Employee>>

/// Autenticação por PIN (CASHIER/STOCKER) - mantém atual
pub async fn authenticate_pin(&self, pin: &str) -> AppResult<Option<Employee>>

// ══════════════════════════════════════════════════════════════
// GESTÃO DE SENHA
// ══════════════════════════════════════════════════════════════

/// Validar senha conforme política configurada
pub async fn validate_password_policy(&self, password: &str) -> AppResult<()>

/// Alterar senha (self-service ou admin reset)
pub async fn change_password(
    &self,
    employee_id: &str,
    current_password: Option<&str>,
    new_password: &str
) -> AppResult<()>

/// Solicitar reset de senha (gera token)
pub async fn request_password_reset(&self, email: &str) -> AppResult<String>

/// Confirmar reset de senha (valida token)
pub async fn reset_password_with_token(
    &self,
    token: &str,
    new_password: &str
) -> AppResult<()>

// ══════════════════════════════════════════════════════════════
// SEGURANÇA & LOCKOUT
// ══════════════════════════════════════════════════════════════

/// Registrar tentativa de login falhada
pub async fn record_failed_attempt(&self, identifier: &str) -> AppResult<()>

/// Limpar tentativas após login bem-sucedido
pub async fn clear_failed_attempts(&self, employee_id: &str) -> AppResult<()>

/// Verificar se conta está bloqueada
pub async fn is_account_locked(&self, employee_id: &str) -> AppResult<bool>

/// Registrar último login
pub async fn update_last_login(
    &self,
    employee_id: &str,
    ip_address: Option<&str>
) -> AppResult<()>
```

**Implementação de Hashing**:

```rust
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2
};
use argon2::password_hash::rand_core::OsRng;

/// Hash de senha com Argon2id (recomendação OWASP 2024)
pub fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Erro ao gerar hash: {}", e)))?
        .to_string();

    Ok(password_hash)
}

/// Verificar senha contra hash
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Hash inválido: {}", e)))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
}
```

#### Comandos Tauri Novos

**Arquivo**: `src-tauri/src/commands/auth.rs` (NOVO)

```rust
use crate::error::AppResult;
use crate::models::{AuthResult, LoginCredentials};
use crate::repositories::EmployeeRepository;
use crate::AppState;
use tauri::State;

// ══════════════════════════════════════════════════════════════
// LOGIN COMMANDS
// ══════════════════════════════════════════════════════════════

#[tauri::command]
#[specta::specta]
pub async fn login_with_credentials(
    credentials: LoginCredentials,
    state: State<'_, AppState>
) -> AppResult<AuthResult> {
    let repo = EmployeeRepository::new(state.pool());
    let result = repo.authenticate(credentials).await?;

    // Registrar login em audit log
    // Atualizar last_login_at
    // Limpar failed_attempts
    // Criar sessão

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_pin(
    pin: String,
    state: State<'_, AppState>
) -> AppResult<AuthResult> {
    // Mantém compatibilidade com fluxo atual
    let repo = EmployeeRepository::new(state.pool());
    let employee = repo.authenticate_pin(&pin).await?
        .ok_or(AppError::Unauthorized("PIN inválido".to_string()))?;

    Ok(AuthResult {
        employee: SafeEmployee::from(employee),
        token: None,
        expires_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_password(
    username: String,
    password: String,
    state: State<'_, AppState>
) -> AppResult<AuthResult> {
    let repo = EmployeeRepository::new(state.pool());

    // Verificar se conta está bloqueada
    if repo.is_account_locked(&username).await? {
        return Err(AppError::Unauthorized(
            "Conta temporariamente bloqueada. Tente novamente em 15 minutos.".to_string()
        ));
    }

    match repo.authenticate_password(&username, &password).await? {
        Some(employee) => {
            repo.clear_failed_attempts(&employee.id).await?;
            repo.update_last_login(&employee.id, None).await?;

            Ok(AuthResult {
                employee: SafeEmployee::from(employee),
                token: None,
                expires_at: None,
            })
        }
        None => {
            repo.record_failed_attempt(&username).await?;
            Err(AppError::Unauthorized("Credenciais inválidas".to_string()))
        }
    }
}

// ══════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT COMMANDS
// ══════════════════════════════════════════════════════════════

#[tauri::command]
#[specta::specta]
pub async fn change_password(
    employee_id: String,
    current_password: Option<String>,
    new_password: String,
    state: State<'_, AppState>
) -> AppResult<()> {
    let repo = EmployeeRepository::new(state.pool());

    // Validar política de senha
    repo.validate_password_policy(&new_password).await?;

    // Alterar senha
    repo.change_password(
        &employee_id,
        current_password.as_deref(),
        &new_password
    ).await?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn request_password_reset(
    email: String,
    state: State<'_, AppState>
) -> AppResult<String> {
    let repo = EmployeeRepository::new(state.pool());
    let token = repo.request_password_reset(&email).await?;

    // TODO: Enviar email com link de reset
    // Por ora, retorna token para exibir na UI (desenvolvimento)

    Ok(token)
}

#[tauri::command]
#[specta::specta]
pub async fn reset_password_with_token(
    token: String,
    new_password: String,
    state: State<'_, AppState>
) -> AppResult<()> {
    let repo = EmployeeRepository::new(state.pool());

    // Validar política
    repo.validate_password_policy(&new_password).await?;

    // Reset com token
    repo.reset_password_with_token(&token, &new_password).await?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn validate_password(
    password: String,
    state: State<'_, AppState>
) -> AppResult<PasswordStrength> {
    let repo = EmployeeRepository::new(state.pool());

    // Validar e retornar força da senha
    repo.validate_password_policy(&password).await?;

    Ok(calculate_password_strength(&password))
}
```

#### Modelos Rust (Types)

**Arquivo**: `src-tauri/src/models/auth.rs` (NOVO)

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LoginCredentials {
    pub username: Option<String>,
    pub pin: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthResult {
    pub employee: SafeEmployee,
    pub token: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordStrength {
    pub score: u8, // 0-4
    pub feedback: Vec<String>,
    pub is_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResetRequest {
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResetConfirm {
    pub token: String,
    pub new_password: String,
}
```

---

### 3. FRONTEND REACT LAYER

#### Store Zustand (Auth)

**Arquivo**: `src/stores/auth-store.ts`

**Estado Atual**:

```typescript
interface AuthState {
  employee: Employee | null;
  isAuthenticated: boolean;

  login: (user: Employee) => void;
  logout: () => void;
}
```

**Novo Estado**:

```typescript
interface AuthState {
  // Estado atual
  employee: Employee | null;
  isAuthenticated: boolean;
  authMethod: 'pin' | 'password' | null;

  // Novos campos
  isLocked: boolean;
  failedAttempts: number;
  lockoutExpiresAt: Date | null;
  sessionExpiresAt: Date | null;

  // Ações de autenticação
  loginWithPin: (pin: string) => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // Gestão de senha
  changePassword: (currentPwd: string, newPwd: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;

  // Verificações
  checkSession: () => boolean;
  requiresPasswordChange: () => boolean;
}
```

#### Páginas React

**1. LoginPage.tsx** - **🔴 REFACTOR TOTAL**

**Estrutura Nova**:

```tsx
export const LoginPage: FC = () => {
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');

  return (
    <div className="login-container">
      <Tabs value={authMode} onValueChange={setAuthMode}>
        <TabsList>
          <TabsTrigger value="pin">PIN (Caixa)</TabsTrigger>
          <TabsTrigger value="password">Login</TabsTrigger>
        </TabsList>

        <TabsContent value="pin">
          <PinLoginForm />
        </TabsContent>

        <TabsContent value="password">
          <PasswordLoginForm />
        </TabsContent>
      </Tabs>

      <Button variant="link" onClick={() => navigate('/forgot-password')}>
        Esqueci minha senha
      </Button>
    </div>
  );
};
```

**2. PasswordLoginForm.tsx** - **🟢 NOVO**

```tsx
export const PasswordLoginForm: FC = () => {
  const { loginWithPassword, isLocked, lockoutExpiresAt } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (isLocked) {
    return <AccountLockedMessage expiresAt={lockoutExpiresAt} />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await loginWithPassword(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Usuário ou Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />

      <PasswordInput
        label="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        show={showPassword}
        onToggle={() => setShowPassword(!showPassword)}
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" fullWidth>
        Entrar
      </Button>
    </form>
  );
};
```

**3. ForgotPasswordPage.tsx** - **🟢 NOVO**

```tsx
export const ForgotPasswordPage: FC = () => {
  const { requestPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const handleRequest = async () => {
    const resetToken = await requestPasswordReset(email);
    setToken(resetToken);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar Senha</CardTitle>
        <CardDescription>Digite seu email cadastrado para receber instruções</CardDescription>
      </CardHeader>

      <CardContent>
        {!token ? (
          <RequestResetForm email={email} setEmail={setEmail} onSubmit={handleRequest} />
        ) : (
          <ResetTokenDisplay token={token} />
        )}
      </CardContent>
    </Card>
  );
};
```

**4. ResetPasswordPage.tsx** - **🟢 NOVO**

```tsx
export const ResetPasswordPage: FC = () => {
  const { resetPassword } = useAuthStore();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Senhas não conferem');
      return;
    }

    await resetPassword(token!, newPassword);
    toast.success('Senha alterada com sucesso!');
    navigate('/login');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir Senha</CardTitle>
      </CardHeader>

      <CardContent>
        <PasswordInput
          label="Nova Senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <PasswordStrengthIndicator password={newPassword} />

        <PasswordInput
          label="Confirmar Senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button onClick={handleReset}>Redefinir Senha</Button>
      </CardContent>
    </Card>
  );
};
```

**5. ChangePasswordPage.tsx** - **🟢 NOVO**

```tsx
export const ChangePasswordPage: FC = () => {
  const { employee, changePassword } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Senhas não conferem');
      return;
    }

    await changePassword(currentPassword, newPassword);
    toast.success('Senha alterada com sucesso!');
    navigate('/settings');
  };

  return (
    <PageContainer title="Alterar Senha">
      <Card>
        <CardContent className="space-y-4">
          <PasswordInput
            label="Senha Atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <PasswordInput
            label="Nova Senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <PasswordStrengthIndicator password={newPassword} />

          <PasswordInput
            label="Confirmar Nova Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Requisitos de Senha</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                <li>Mínimo 8 caracteres</li>
                <li>Pelo menos uma letra maiúscula</li>
                <li>Pelo menos uma letra minúscula</li>
                <li>Pelo menos um número</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button onClick={handleChange}>Salvar Nova Senha</Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
```

#### Componentes Reutilizáveis

**PasswordInput.tsx** - **🟢 NOVO**

```tsx
interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  show?: boolean;
  onToggle?: () => void;
}

export const PasswordInput: FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  show = false,
  onToggle,
}) => {
  return (
    <div className="relative">
      <Label>{label}</Label>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete="current-password"
      />
      {onToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-6"
          onClick={onToggle}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      )}
    </div>
  );
};
```

**PasswordStrengthIndicator.tsx** - **🟢 NOVO**

```tsx
export const PasswordStrengthIndicator: FC<{ password: string }> = ({ password }) => {
  const strength = useMemo(() => calculateStrength(password), [password]);

  const colors = {
    0: 'bg-red-500',
    1: 'bg-orange-500',
    2: 'bg-yellow-500',
    3: 'bg-lime-500',
    4: 'bg-green-500',
  };

  const labels = {
    0: 'Muito fraca',
    1: 'Fraca',
    2: 'Razoável',
    3: 'Forte',
    4: 'Muito forte',
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-2 flex-1 rounded',
              level <= strength.score ? colors[strength.score] : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{labels[strength.score]}</p>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((msg, i) => (
            <li key={i}>• {msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### Hooks Customizados

**usePasswordValidation.ts** - **🟢 NOVO**

```typescript
export function usePasswordValidation() {
  const { data: settings } = useQuery({
    queryKey: ['password-settings'],
    queryFn: () => invoke<PasswordPolicy>('get_password_policy'),
  });

  const validate = useCallback(
    (password: string): ValidationResult => {
      if (!settings) return { valid: true, errors: [] };

      const errors: string[] = [];

      if (password.length < settings.minLength) {
        errors.push(`Mínimo ${settings.minLength} caracteres`);
      }

      if (settings.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Deve conter letra maiúscula');
      }

      if (settings.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Deve conter letra minúscula');
      }

      if (settings.requireNumbers && !/\d/.test(password)) {
        errors.push('Deve conter número');
      }

      if (settings.requireSpecial && !/[!@#$%^&*]/.test(password)) {
        errors.push('Deve conter caractere especial');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
    [settings]
  );

  return { validate, settings };
}
```

---

### 4. MOBILE SYNC LAYER

#### Protocolo WebSocket

**Arquivo**: `src-tauri/src/services/mobile_protocol.rs`

**Mudanças**:

```rust
// Payload de login - ANTES
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthLoginPayload {
    pub pin: String,
    pub device_id: String,
}

// Payload de login - DEPOIS
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthLoginPayload {
    pub pin: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub device_id: String,
}
```

**Handler de Autenticação**:

```rust
// src-tauri/src/services/mobile_handlers/auth.rs
impl AuthHandler {
    pub async fn login(&self, id: u64, payload: AuthLoginPayload) -> MobileResponse {
        let repo = EmployeeRepository::new(&self.pool);

        // Determinar método de autenticação
        let employee = if let Some(pin) = payload.pin {
            // Autenticação por PIN
            repo.authenticate_pin(&pin).await?
        } else if let (Some(username), Some(password)) = (payload.username, payload.password) {
            // Autenticação por senha
            repo.authenticate_password(&username, &password).await?
        } else {
            return MobileResponse::error(
                id,
                MobileErrorCode::ValidationError,
                "Credenciais inválidas"
            );
        };

        // Resto do fluxo permanece igual
        // ...
    }
}
```

---

### 5. PERMISSÕES & RBAC

#### Middleware de Permissões

**Arquivo**: `src-tauri/src/middleware/permissions.rs`

**Nenhuma mudança estrutural necessária** - O sistema RBAC já está implementado corretamente e é independente do método de autenticação.

**Validação**:

```rust
// Sistema atual (mantém)
pub enum Permission {
    ViewProducts,
    CreateProducts,
    UpdateEmployees,
    ManageSystem,
    // ...
}

impl Permission {
    pub fn for_role(role: EmployeeRole) -> Vec<Permission> {
        match role {
            EmployeeRole::Admin => vec![/* todas */],
            EmployeeRole::Manager => vec![/* exceto configs críticas */],
            EmployeeRole::Cashier => vec![/* apenas PDV */],
            // ...
        }
    }
}
```

**Única mudança**: Adicionar verificação de senha expirada

```rust
pub async fn check_permission(
    pool: &Pool<Sqlite>,
    employee_id: &str,
    permission: Permission,
) -> AppResult<Employee> {
    let employee = /* buscar funcionário */;

    // NOVO: Verificar se senha expirou (ADMIN/MANAGER)
    if matches!(employee.role, EmployeeRole::Admin | EmployeeRole::Manager) {
        if let Some(changed_at) = employee.password_changed_at {
            let days_since = (Utc::now() - changed_at).num_days();
            if days_since > 90 {
                return Err(AppError::PasswordExpired(
                    "Senha expirada. Altere sua senha para continuar.".to_string()
                ));
            }
        }
    }

    // Continua verificação normal de permissões
    // ...
}
```

---

### 6. AUDITORIA

#### Tabela `audit_logs`

**Novos Eventos**:

```sql
-- Adicionar novos tipos de ação
INSERT INTO audit_logs (action, employee_id, ...) VALUES
  ('PASSWORD_CHANGED', ...),
  ('PASSWORD_RESET_REQUESTED', ...),
  ('PASSWORD_RESET_COMPLETED', ...),
  ('ACCOUNT_LOCKED', ...),
  ('ACCOUNT_UNLOCKED', ...),
  ('FAILED_LOGIN_ATTEMPT', ...);
```

**Rust Enum**:

```rust
// src-tauri/src/middleware/audit.rs
pub enum AuditAction {
    // Existentes
    Login,
    Logout,

    // Novos
    PasswordChanged,
    PasswordResetRequested,
    PasswordResetCompleted,
    AccountLocked,
    AccountUnlocked,
    FailedLoginAttempt,
}
```

---

## 🗓️ Roadmap de Implementação

### FASE 0: Preparação (1 semana)

**Objetivo**: Setup do ambiente e análise final

| Tarefa                                | Responsável | Status     | Duração |
| ------------------------------------- | ----------- | ---------- | ------- |
| Criar branch `feature/auth-migration` | Dev Lead    | ⏳ Pending | 1h      |
| Documentar estado atual completo      | Backend Dev | ⏳ Pending | 1 dia   |
| Definir políticas de senha padrão     | Security    | ⏳ Pending | 2 dias  |
| Escrever testes de aceitação          | QA          | ⏳ Pending | 2 dias  |
| Review arquitetural com time          | All         | ⏳ Pending | 1 dia   |

**Entregáveis**:

- ✅ Documento de requisitos aprovado
- ✅ Políticas de segurança definidas
- ✅ Ambiente de teste configurado
- ✅ Critérios de aceitação documentados

---

### FASE 1: Database Schema (1 semana)

**Objetivo**: Atualizar schema e criar migration segura

| Tarefa                          | Arquivo                   | Duração | Risco    |
| ------------------------------- | ------------------------- | ------- | -------- |
| Criar migration schema          | `XXX_add_auth_fields.sql` | 1 dia   | 🔴 Alto  |
| Adicionar triggers de validação | `XXX_add_auth_fields.sql` | 1 dia   | 🟡 Médio |
| Script de rollback              | `down.sql`                | 4h      | 🟡 Médio |
| Testar migration em DB de teste | N/A                       | 1 dia   | 🔴 Alto  |
| Seed de dados de teste          | `seed_auth.sql`           | 4h      | 🟢 Baixo |

**Comandos**:

```bash
# Gerar migration
cd packages/database
pnpm prisma migrate dev --name add_auth_fields --create-only

# Editar SQL manualmente
nano prisma/migrations/XXX_add_auth_fields/migration.sql

# Aplicar em ambiente de teste
pnpm prisma migrate deploy

# Rollback de teste
sqlite3 test.db < down.sql
```

**Critérios de Sucesso**:

- [ ] Migration roda sem erros em DB vazio
- [ ] Migration roda sem erros em DB com dados existentes
- [ ] Rollback funciona corretamente
- [ ] Índices criados corretamente
- [ ] Triggers validam corretamente

**Riscos**:

- ⚠️ Perda de dados se migration falhar
- ⚠️ Incompatibilidade com versões antigas
- ⚠️ Performance degradada por novos índices

**Mitigação**:

- Backup completo antes de migration
- Testar em cópia da DB de produção
- Monitorar query performance pós-deploy

---

### FASE 2: Backend Rust Core (2 semanas)

**Objetivo**: Implementar lógica de autenticação e segurança

#### Week 1: Repositório & Hashing

| Tarefa                             | Arquivo                       | Duração | Dependências  |
| ---------------------------------- | ----------------------------- | ------- | ------------- |
| Implementar `hash_password()`      | `utils/crypto.rs`             | 4h      | -             |
| Implementar `verify_password()`    | `utils/crypto.rs`             | 4h      | -             |
| Criar `authenticate_password()`    | `employee_repository.rs`      | 1 dia   | hash_password |
| Criar `validate_password_policy()` | `employee_repository.rs`      | 1 dia   | settings      |
| Criar `change_password()`          | `employee_repository.rs`      | 1 dia   | hash_password |
| Testes unitários de hashing        | `crypto_test.rs`              | 4h      | -             |
| Testes de autenticação             | `employee_repository_test.rs` | 1 dia   | DB test       |

#### Week 2: Segurança & Lockout

| Tarefa                                | Arquivo                  | Duração | Dependências |
| ------------------------------------- | ------------------------ | ------- | ------------ |
| Implementar `record_failed_attempt()` | `employee_repository.rs` | 4h      | DB           |
| Implementar `is_account_locked()`     | `employee_repository.rs` | 4h      | settings     |
| Implementar `clear_failed_attempts()` | `employee_repository.rs` | 2h      | DB           |
| Implementar reset de senha (token)    | `employee_repository.rs` | 1 dia   | crypto       |
| Criar comandos Tauri                  | `commands/auth.rs`       | 1 dia   | repository   |
| Testes de lockout                     | `auth_test.rs`           | 1 dia   | -            |
| Testes de reset de senha              | `auth_test.rs`           | 1 dia   | -            |

**Arquivos Criados**:

```
src-tauri/src/
├── commands/
│   └── auth.rs (NOVO)
├── models/
│   └── auth.rs (NOVO)
├── repositories/
│   └── employee_repository.rs (MODIFICADO)
└── utils/
    └── crypto.rs (NOVO)
```

**Testes**:

```bash
# Rodar testes unitários
cd apps/desktop/src-tauri
cargo test --lib

# Rodar testes de integração
cargo test --test '*'

# Coverage
cargo tarpaulin --out Html
```

**Critérios de Sucesso**:

- [ ] 100% dos testes unitários passando
- [ ] Coverage > 80% em novos arquivos
- [ ] Nenhum panic! no código de produção
- [ ] Benchmarks de performance aceitáveis (hash < 100ms)

---

### FASE 3: Frontend React (2 semanas)

**Objetivo**: Criar interfaces de usuário e fluxos de autenticação

#### Week 1: Páginas Core

| Tarefa                          | Arquivo                  | Duração | Dependências  |
| ------------------------------- | ------------------------ | ------- | ------------- |
| Refatorar LoginPage (dual mode) | `LoginPage.tsx`          | 1 dia   | -             |
| Criar PasswordLoginForm         | `PasswordLoginForm.tsx`  | 1 dia   | -             |
| Criar ForgotPasswordPage        | `ForgotPasswordPage.tsx` | 1 dia   | auth commands |
| Criar ResetPasswordPage         | `ResetPasswordPage.tsx`  | 1 dia   | auth commands |
| Criar ChangePasswordPage        | `ChangePasswordPage.tsx` | 1 dia   | auth commands |

#### Week 2: Componentes & Hooks

| Tarefa                          | Arquivo                         | Duração | Dependências   |
| ------------------------------- | ------------------------------- | ------- | -------------- |
| Criar PasswordInput component   | `PasswordInput.tsx`             | 4h      | -              |
| Criar PasswordStrengthIndicator | `PasswordStrengthIndicator.tsx` | 4h      | -              |
| Criar AccountLockedMessage      | `AccountLockedMessage.tsx`      | 2h      | -              |
| Hook usePasswordValidation      | `usePasswordValidation.ts`      | 1 dia   | TanStack Query |
| Atualizar auth-store (Zustand)  | `auth-store.ts`                 | 1 dia   | -              |
| Testes unitários (Vitest)       | `*.test.tsx`                    | 2 dias  | -              |

**Arquivos Criados**:

```
src/
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx (MODIFICADO)
│   │   ├── ForgotPasswordPage.tsx (NOVO)
│   │   ├── ResetPasswordPage.tsx (NOVO)
│   │   └── ChangePasswordPage.tsx (NOVO)
├── components/
│   ├── auth/
│   │   ├── PasswordInput.tsx (NOVO)
│   │   ├── PasswordStrengthIndicator.tsx (NOVO)
│   │   ├── PasswordLoginForm.tsx (NOVO)
│   │   └── AccountLockedMessage.tsx (NOVO)
├── hooks/
│   └── usePasswordValidation.ts (NOVO)
└── stores/
    └── auth-store.ts (MODIFICADO)
```

**Testes**:

```bash
# Testes unitários
pnpm test

# Coverage
pnpm test:coverage

# Testes E2E (smoke test)
pnpm test:e2e
```

---

### FASE 4: Integração Mobile/Sync (1 semana)

**Objetivo**: Atualizar protocolo WebSocket para suportar dual auth

| Tarefa                        | Arquivo                      | Duração | Dependências |
| ----------------------------- | ---------------------------- | ------- | ------------ |
| Atualizar AuthLoginPayload    | `mobile_protocol.rs`         | 2h      | -            |
| Atualizar AuthHandler.login() | `mobile_handlers/auth.rs`    | 1 dia   | repository   |
| Testar autenticação mobile    | N/A                          | 1 dia   | mobile app   |
| Atualizar docs de protocolo   | `MOBILE-PROTOCOL.md`         | 4h      | -            |
| Testes de integração          | `mobile_integration_test.rs` | 1 dia   | -            |

**Compatibilidade**:

- ✅ Mobile app continua usando PIN (backward compatible)
- ✅ Desktop pode usar PIN ou senha
- ✅ Protocolo suporta ambos os métodos

---

### FASE 5: Migração de Dados (1 semana)

**Objetivo**: Migrar funcionários existentes sem perda de dados

#### Script de Migração

**Arquivo**: `scripts/migrate_employees_auth.sql`

```sql
-- Fase 1: Backup completo
CREATE TABLE employees_backup AS SELECT * FROM employees;

-- Fase 2: Gerar username para admins existentes
UPDATE employees
SET username = 'admin_' || LOWER(REPLACE(name, ' ', '_'))
WHERE role IN ('ADMIN', 'MANAGER')
  AND username IS NULL;

-- Fase 3: Marcar contas que precisam definir senha
INSERT INTO settings (key, value, category)
SELECT
  'employee.' || id || '.needs_password_setup',
  'true',
  'auth'
FROM employees
WHERE role IN ('ADMIN', 'MANAGER');

-- Fase 4: Criar senha temporária para admins (força troca no primeiro login)
UPDATE employees
SET
  password = '$argon2id$...', -- Hash de senha temporária "TrocaSenha123!"
  password_changed_at = datetime('now', '-91 days') -- Força expiração
WHERE role IN ('ADMIN', 'MANAGER');

-- Fase 5: Validar integridade
SELECT
  COUNT(*) as total_admins,
  SUM(CASE WHEN username IS NOT NULL THEN 1 ELSE 0 END) as com_username,
  SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END) as com_senha
FROM employees
WHERE role IN ('ADMIN', 'MANAGER');
```

#### Fluxo de Primeira Configuração

```tsx
// FirstLoginSetupPage.tsx
export const FirstLoginSetupPage: FC = () => {
  const { employee } = useAuthStore();

  // Detecta se precisa configurar senha
  useEffect(() => {
    if (employee?.needsPasswordSetup) {
      // Força setup
    }
  }, [employee]);

  return (
    <Dialog open={true} modal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Senha de Acesso</DialogTitle>
          <DialogDescription>
            Como administrador, você precisa configurar uma senha segura. A partir de agora, o login
            será feito com usuário e senha.
          </DialogDescription>
        </DialogHeader>

        <SetupPasswordForm />
      </DialogContent>
    </Dialog>
  );
};
```

**Tarefas**:
| Tarefa | Duração | Risco |
|--------|---------|-------|
| Escrever script de migração | 1 dia | 🟡 Médio |
| Testar em DB de staging | 1 dia | 🔴 Alto |
| Criar tela de primeiro acesso | 1 dia | 🟢 Baixo |
| Documentar processo para usuários | 1 dia | 🟢 Baixo |
| Executar migration em produção | 2h | 🔴 Alto |

---

### FASE 6: Testes & QA (2 semanas)

**Objetivo**: Garantir qualidade e estabilidade do sistema

#### Week 1: Testes Automatizados

| Tipo            | Framework           | Tarefas         | Duração |
| --------------- | ------------------- | --------------- | ------- |
| **Unit**        | Vitest + Cargo Test | 50 novos testes | 2 dias  |
| **Integration** | Playwright          | 10 specs E2E    | 2 dias  |
| **Security**    | Manual + OWASP ZAP  | Pentest básico  | 1 dia   |

**Checklist de Testes**:

**Backend (Rust)**:

- [ ] Hash de senha usa Argon2id corretamente
- [ ] Verificação de senha funciona
- [ ] Lockout após 5 tentativas
- [ ] Desbloqueio automático após 15min
- [ ] Token de reset expira em 1h
- [ ] Política de senha é validada
- [ ] Senha antiga não pode ser reutilizada
- [ ] Sessão expira após inatividade

**Frontend (React)**:

- [ ] Login com PIN funciona (CASHIER)
- [ ] Login com senha funciona (ADMIN)
- [ ] Troca de modo PIN ↔ Senha
- [ ] Forgot password envia token
- [ ] Reset password valida token
- [ ] Indicador de força de senha funciona
- [ ] Mensagem de conta bloqueada exibe countdown
- [ ] Primeiro login força setup de senha

**E2E (Playwright)**:

```typescript
// tests/e2e/auth.spec.ts
test.describe('Authentication System', () => {
  test('should login with PIN as CASHIER', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="pin-mode"]');
    await page.fill('[data-testid="pin-input"]', '8899');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/pdv');
  });

  test('should login with password as ADMIN', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="password-mode"]');
    await page.fill('[data-testid="username"]', 'admin');
    await page.fill('[data-testid="password"]', 'Admin123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should lock account after 5 failed attempts', async ({ page }) => {
    await page.goto('/login');

    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username"]', 'admin');
      await page.fill('[data-testid="password"]', 'wrong');
      await page.click('[data-testid="login-button"]');
    }

    await expect(page.locator('[data-testid="account-locked"]')).toBeVisible();
  });
});
```

#### Week 2: Testes Manuais & UAT

| Cenário                               | Executor | Status |
| ------------------------------------- | -------- | ------ |
| Admin cria novo funcionário com senha | QA       | ⏳     |
| Operador faz login com PIN            | QA       | ⏳     |
| Admin esquece senha e reseta          | QA       | ⏳     |
| Tentativa de brute force é bloqueada  | Security | ⏳     |
| Migração de dados preserva acessos    | Dev      | ⏳     |

**UAT (User Acceptance Testing)**:

- Envolver 3-5 usuários reais
- Testar fluxos completos
- Coletar feedback
- Ajustar UX conforme necessário

---

### FASE 7: Documentação (1 semana)

**Objetivo**: Documentar sistema e treinar usuários

| Documento               | Público  | Duração |
| ----------------------- | -------- | ------- |
| Guia de Migração        | Devs     | 1 dia   |
| Manual do Administrador | Admins   | 1 dia   |
| FAQ de Segurança        | Todos    | 1 dia   |
| Tutorial In-App         | Usuários | 1 dia   |
| Release Notes           | Todos    | 1 dia   |

**Arquivos a Criar**:

```
docs/
├── AUTH-MIGRATION-GUIDE.md
├── ADMIN-PASSWORD-MANAGEMENT.md
├── SECURITY-FAQ.md
└── tutorials/
    ├── first-login-setup.md
    └── password-recovery.md
```

---

### FASE 8: Deploy & Rollout (1 semana)

**Objetivo**: Deploy gradual e monitorado

#### Estratégia de Rollout

**Opção 1: Canary Release** (Recomendado)

```
Week 1: 10% dos usuários (early adopters)
Week 2: 30% dos usuários
Week 3: 60% dos usuários
Week 4: 100% (todos)
```

**Opção 2: Blue-Green Deploy**

```
Blue: Versão antiga (PIN only)
Green: Versão nova (Dual auth)
Switch: Instantâneo após validação
```

#### Checklist de Deploy

**Pré-Deploy**:

- [ ] Backup completo do banco de dados
- [ ] Backup de configurações
- [ ] Testes de rollback validados
- [ ] Monitoramento configurado
- [ ] Equipe de suporte alertada

**Deploy**:

- [ ] Aplicar migration em produção
- [ ] Deploy da nova versão (backend + frontend)
- [ ] Verificar health checks
- [ ] Executar smoke tests
- [ ] Notificar usuários

**Pós-Deploy**:

- [ ] Monitorar logs de erro (24h)
- [ ] Monitorar métricas de login
- [ ] Coletar feedback inicial
- [ ] Ajustar alertas se necessário

**Rollback Plan**:

```bash
# Se deploy falhar, executar:
1. Reverter para versão anterior (git checkout)
2. Rebuild e redeploy
3. Executar rollback SQL
4. Validar funcionamento
5. Comunicar incidente
```

---

## 📈 Cronograma Consolidado

```
┌──────────────────────────────────────────────────────────────────┐
│                    TIMELINE - 10 SEMANAS                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SEMANA 1  │ ████████████ Preparação                            │
│  SEMANA 2  │ ████████████ Database Schema                       │
│  SEMANA 3  │ ████████████ Backend Rust (Repo & Hash)            │
│  SEMANA 4  │ ████████████ Backend Rust (Security)               │
│  SEMANA 5  │ ████████████ Frontend React (Páginas)              │
│  SEMANA 6  │ ████████████ Frontend React (Componentes)          │
│  SEMANA 7  │ ████████████ Mobile/Sync Integration               │
│  SEMANA 8  │ ████████████ Migração de Dados                     │
│  SEMANA 9  │ ████████████ Testes Automatizados                  │
│  SEMANA 10 │ ████████████ Testes Manuais + UAT                  │
│  SEMANA 11 │ ████████████ Documentação                          │
│  SEMANA 12 │ ████████████ Deploy & Rollout                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Duração Total: 12 semanas (3 meses)
Esforço Estimado: 2 devs full-time + 1 QA part-time
```

---

## ⚠️ Riscos & Mitigações

### Riscos Técnicos

| Risco                                | Probabilidade | Impacto    | Mitigação                           |
| ------------------------------------ | ------------- | ---------- | ----------------------------------- |
| **Perda de dados durante migration** | Baixa         | 🔴 Crítico | Backup completo + rollback testado  |
| **Incompatibilidade backward**       | Média         | 🟡 Alto    | Manter PIN funcional para CASHIER   |
| **Performance degradada (hash)**     | Baixa         | 🟡 Médio   | Benchmark + otimização Argon2       |
| **Lockout de admins legítimos**      | Alta          | 🟡 Médio   | Comando de reset de emergência      |
| **Token de reset vazado**            | Baixa         | 🔴 Crítico | Expiração curta (1h) + one-time use |

### Riscos de Negócio

| Risco                       | Probabilidade | Impacto  | Mitigação                        |
| --------------------------- | ------------- | -------- | -------------------------------- |
| **Resistência de usuários** | Alta          | 🟡 Médio | Comunicação clara + onboarding   |
| **Downtime durante deploy** | Média         | 🟡 Médio | Deploy fora de horário comercial |
| **Suporte sobrecarregado**  | Alta          | 🟢 Baixo | FAQ + tutoriais in-app           |

### Plano de Contingência

**Se migration falhar**:

1. Executar rollback SQL
2. Reverter para versão anterior
3. Investigar causa raiz
4. Corrigir e reagendar

**Se lockout em massa**:

1. Ativar comando de emergência `force_unlock_all()`
2. Enviar email de reset para todos admins
3. Aumentar tempo de lockout

**Se performance degradar**:

1. Ajustar parâmetros Argon2 (time_cost, memory_cost)
2. Adicionar cache de sessões
3. Otimizar queries de autenticação

---

## ✅ Critérios de Sucesso

### Métricas Técnicas

- [ ] **Coverage**: > 80% em novos arquivos
- [ ] **Performance**: Login < 500ms (p95)
- [ ] **Uptime**: > 99.9% durante rollout
- [ ] **Erros**: < 0.1% de falhas de autenticação

### Métricas de Negócio

- [ ] **Adoção**: 90% dos admins configuraram senha em 2 semanas
- [ ] **Satisfação**: NPS > 7 em pesquisa pós-deploy
- [ ] **Suporte**: < 5 tickets críticos de auth/semana

### Compliance

- [ ] **LGPD**: Logs de acesso implementados
- [ ] **OWASP**: Top 10 vulnerabilidades mitigadas
- [ ] **Auditoria**: Rastreabilidade de 100% das ações

---

## 📚 Referências

### Documentação Técnica

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 Specification (RFC 9106)](https://www.rfc-editor.org/rfc/rfc9106.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

### Arquivos do Projeto

- `packages/database/prisma/schema.prisma` - Schema atual
- `apps/desktop/src-tauri/src/repositories/employee_repository.rs` - Repositório
- `apps/desktop/src/pages/auth/LoginPage.tsx` - Interface de login
- `apps/desktop/src/stores/auth-store.ts` - State management

### Código Existente (Referência)

```rust
// Hash de PIN atual (HMAC-SHA256)
fn hash_pin_with_current_key(pin: &str) -> String {
    type HmacSha256 = Hmac<Sha256>;
    let key = get_or_create_hmac_key();
    let mut mac = HmacSha256::new_from_slice(key.as_bytes()).unwrap();
    mac.update(pin.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}
```

---

## 🎯 Conclusão

Este roadmap fornece um plano detalhado e estruturado para migração do sistema de autenticação do GIRO de PIN exclusivo para um sistema dual (PIN + Login/Senha).

**Próximos Passos Imediatos**:

1. ✅ Aprovar roadmap com stakeholders
2. ✅ Criar branch `feature/auth-migration`
3. ✅ Configurar ambiente de teste
4. ✅ Iniciar FASE 0 (Preparação)

**Pontos de Atenção**:

- Manter compatibilidade com PIN para operadores de caixa
- Priorizar segurança sem comprometer UX
- Comunicação clara com usuários durante migração
- Monitoramento rigoroso pós-deploy

**Benefícios Esperados**:

- 🔐 Segurança aumentada para perfis administrativos
- 📊 Rastreabilidade completa de ações sensíveis
- ✅ Conformidade com LGPD/GDPR
- 🚀 Base sólida para futuras features (2FA, SSO, etc.)

---

**Versão**: 1.0.0  
**Data**: 30/01/2026  
**Autor**: GitHub Copilot + Arkheion Corp  
**Status**: 📋 Aguardando Aprovação
