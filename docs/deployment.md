# Guia de Implantação e Release - GIRO

Este documento descreve como gerar novas versões do GIRO e configurar o ambiente de CI/CD no GitHub.

## ⚙️ Configuração Inicial

Para que o GitHub Actions consiga realizar o build e assinar os instaladores, você precisa configurar os seguintes **Secrets** no seu repositório (`Settings > Secrets and variables > Actions > New repository secret`):

### Passo a Passo para GitHub Secrets

1. **TAURI_SIGNING_PRIVATE_KEY**

   - **Nome**: `TAURI_SIGNING_PRIVATE_KEY`
   - **Valor**: `dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5S09kUkFxU09hSlU2R3FwZVo4dWQ3V1hoREVkaXd4T20xZ0pVTERUNVRna0FBQkFBQUFBQUFBQUFBQUlBQUFBQU55SndVaTZNRWZURnRGQ3oxZ29BOUR1WHN3Rm9WUWhWNGxLL2pHaDFhemNnd04ycFlMalk1RzgrQTFWVVBSYzgrT2p2cmJaL0Fnd3pWcVVOdmUzazk2WEpXeTNLRXE2Qml2blp0dXZPWU4yRnpIK0pWLzJXajZ4d1Q3QlkzOUdJcFFnQ3ZkVjUycUE9Cg==`

2. **TAURI_SIGNING_PRIVATE_KEY_PASSWORD**

   - **Nome**: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - **Valor**: `giro_release_2026`

3. **GITHUB_TOKEN**
   - (Geralmente automático, mas verifique se `Settings > Actions > General > Workflow permissions` está com `Read and write permissions` ativado).

## 🚀 Como gerar uma nova Release

O workflow de release é disparado automaticamente quando uma nova **Tag** seguindo o padrão `v*` é enviada para o repositório.

1.  **Atualize a versão** no arquivo `apps/desktop/src-tauri/tauri.conf.json`.
2.  **Crie a tag e envie**:
    ```bash
    git tag -a v1.0.1 -m "Release v1.0.1"
    git push origin v1.0.1
    ```
3.  O GitHub Actions iniciará o build para Windows e Linux.
4.  Após a conclusão, os arquivos serão anexados à página de **Releases** do projeto.

## 📦 Tipos de Instaladores Gerados

### Windows

- **`.exe` (NSIS)**: Recomendado para a maioria dos usuários. Instalador gráfico leve.
- **`.msi`**: Ideal para instalações em rede (GPO) e departamentos de TI corporativos.

### Linux

- **`.deb`**: Para sistemas baseados em Debian/Ubuntu.
- **`.AppImage`**: Executável universal que roda em quase qualquer distribuição.

## 🔄 Sistema de Atualização

O GIRO está configurado para buscar atualizações automaticamente no GitHub Pages deste repositório. O arquivo `latest.json` é atualizado automaticamente pelo workflow sempre que uma nova versão é publicada.
