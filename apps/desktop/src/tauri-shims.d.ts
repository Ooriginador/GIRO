declare module '@tauri-apps/api/tauri' {
  export function invoke<T = any>(cmd: string, args?: unknown): Promise<T>;
}
