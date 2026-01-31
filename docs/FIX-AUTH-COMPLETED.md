# Auth Migration & Dual Authentication Implementation

**Date:** 2026-01-30
**Status:** Completed

## Changes Implemented

### 1. Backend (Rust/Tauri)

- **New Commands (`src-tauri/src/commands/auth.rs`)**:
  - `login_with_pin`: Optimized for cashier/PDV.
  - `login_with_password`: Admin/Manager access (Argon2id).
  - `change_password`: Enforced security policies.
  - `security` checks: Lockout, expiry, complexity.
- **Crypto Utils**: Implemented Argon2id hashing and PIN security.
- **Registration**: All commands registered in `main.rs`.

### 2. Frontend State (`auth-store.ts`)

- Migrated to use `auth-api.ts` (Typed API Wrapper).
- Added `mustChangePassword` state.
- Added `authMethod` tracking (PIN vs Password).
- Enhanced `requiresPasswordChange` logic.

### 3. UI/UX

- **Login Page**:
  - Dual mode selector (PIN Pad vs Password Form).
  - Visual feedback for lockout and errors.
- **New Pages**:
  - `ForgotPasswordPage`: Request recovery email.
  - `ResetPasswordPage`: Token-based reset.
  - `ChangePasswordPage`: User-initiated or forced change.
- **Navigation**:
  - Added "Meus Dados" and "Alterar Senha" to Header User Menu.
  - Protected routes for new auth flows.

## Verification Steps

1. **Operator Flow**:
   - Use PIN Pad.
   - Verify quick access.
2. **Admin Flow**:
   - Click "Login Administrativo".
   - Use Username/Password.
   - Verify access to privileged routes.
3. **Security**:
   - Attempt 5 invalid logins -> Verify Lockout.
   - Flag user with `requires_new_password` -> Verify redirect to Change Password.
4. **Recovery**:
   - Test "Esqueceu a senha" flow (mock email).

## Next Steps

- Sanity check E2E tests for Login (update selectors if needed).
- Deploy and monitor `auth-service` logs.
