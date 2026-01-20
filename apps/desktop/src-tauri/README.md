# src-tauri - Toolchain & Native Dependencies

Este documento descreve requisitos nativos necessários para compilar e executar o backend Rust do aplicativo (módulo `src-tauri`).

Requisitos principais:

- Rust toolchain (stable) com `cargo` e `rustc`.
- `pkg-config` e compiladores nativos (build-essential / clang) para bibliotecas nativas.
- OpenSSL: algumas crates (ex: `reqwest`, `native-tls`) podem requerer `openssl` dev headers. No Linux:

```bash
sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev libdbus-1-dev
```

- `serialport` crate: depende de bibliotecas do sistema para acesso serial; em Linux normalmente não precisa de libs adicionais, mas em ambientes minimalistas verifique `libusb`.

- `libsqlite3` dev headers: para SQLite se usar `libsqlite3-sys` com features nativas.

```bash
sudo apt-get install -y libsqlite3-dev
```

- Cross-compiling / CI: configure targets e instale toolchains necessários (musl, windows-msvc via runners, etc.).

Dicas:

- Em CI (GitHub Actions) incluir etapas para instalar `libssl-dev` e `libsqlite3-dev` antes do `cargo build`.
- Para empacotar o aplicativo, use `pnpm tauri build` conforme `docs/website/README.md`.

Se quiser, adiciono um arquivo `Dockerfile` de build e exemplos de workflow do GitHub Actions para compilar releases multi-plataforma.
