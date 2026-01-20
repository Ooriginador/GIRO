Notes: IPC contract added as TypeScript Zod schemas under `apps/desktop/src/lib/ipc`.

Rust side module `src-tauri/src/ipc_contract.rs` will expose equivalent Serde types and a helper to wrap responses.

Files added on renderer:

- apps/desktop/src/lib/ipc/contracts.ts
- apps/desktop/src/lib/ipc/client.ts
- apps/desktop/src/lib/ipc/example.tsx
- apps/desktop/src/lib/ipc/index.ts
