# Análise do Fluxo de Licenciamento - GIRO

Este documento detalha o fluxo completo desde a inicialização do app até o redirecionamento pós-ativação, identificando pontos de falha e pendências.

## 1. Fluxo de Inicialização (Boot)

1. **`main.tsx`**: Ponto de entrada. Configura listeners globais de erro.
2. **`App.tsx`**: Renderiza as rotas dentro do `SessionGuard`.
3. **`AdminCheck` (Route: `/`)**: Verifica se existe administrador e redireciona para `/setup` ou `/login`.
4. **`LicenseGuard`**: Envolve as rotas protegidas (incluindo `/login`).
   - Se estiver na rota `/license`, ele **ignora** o bloqueio.
   - Caso contrário, verifica se a licença está hidratada e válida.
   - Se inválida, redireciona para `/license`.

## 2. Fluxo na Página de Ativação (`/license`)

1. **Mount**: Carrega o hardware ID e tenta hidratar do disco.
2. **Auto-Restauração**: Tenta recuperar licença do servidor (`restoreLicense`).
   - Se encontrar, chama `performActivation`.
3. **Ativação Manual**: Usuário digita a chave e clica em Ativar.
4. **`performActivation`**:
   - Chama `activateLicense` no backend.
   - Salva chave e infos no store (`giro-license`).
   - Mostra toast de sucesso.
   - **Ponto Crítico**: `setTimeout` de 1.5s para `navigate('/login', { replace: true })`.

## 3. A Falha: Transição `/license` -> `/login`

O usuário relata "tela branca" após digitar a licença. Isso indica um erro fatal de JS no momento do redirecionamento ou na renderização da página de Login.

### Hipóteses:

- [ ] **Loop Infinito no `LicenseGuard`**: Ao mudar para `/login`, o Guard reassume o controle. Se houver algum atraso na propagação do estado 'valid' no store, o Guard pode redirecionar de volta para `/license`, criando um loop.
- [ ] **Crash no `LoginPage`**: O `LoginPage` depende de `useBusinessProfile`. Se houver algum problema na reidratação desse store simultaneamente com o de licença, pode haver um crash.
- [ ] **State Sync Delay**: O Zustand pode não estar refletindo a mudança de estado rápido o suficiente para o `LicenseGuard` (embora improvável).

## 4. Pendências de Correção

- [ ] **Log de Transição Explicito**: Adicionar logs pesados no `LicenseGuard` para capturar a diferença de estado entre o Store e a Rota.
- [ ] **Remoção do Timeout**: Considerar a remoção do `setTimeout` de 1.5s ou garantir que o estado esteja 100% sincronizado antes do `navigate`.
- [ ] **Bypass do Guard Fix**: Ajustar o `LicenseGuard` para ser mais tolerante durante o mount inicial pós-ativação.

## 5. Próximos Passos

1. Adicionar `useEffect` de monitoramento no `LicenseGuard` especificamente para mudanças de estado `valid`.
2. Verificar se o `tauri-plugin-log` pode ser injetado para ver os logs do backend no terminal do usuário (Linux).
