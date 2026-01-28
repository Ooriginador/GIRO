//! Utilitários específicos para Windows
//!
//! Este módulo contém helpers para executar comandos no Windows
//! sem exibir janelas de console piscando na tela.

use std::process::{Command, Output};

/// Flag para esconder janela de console no Windows
/// CREATE_NO_WINDOW = 0x08000000
#[cfg(target_os = "windows")]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Cria um comando configurado para não exibir janela no Windows
///
/// # Example
/// ```rust
/// use crate::utils::windows::silent_command;
///
/// let output = silent_command("powershell")
///     .args(["-NoProfile", "-Command", "Get-Date"])
///     .output();
/// ```
#[cfg(target_os = "windows")]
pub fn silent_command(program: &str) -> Command {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
pub fn silent_command(program: &str) -> Command {
    Command::new(program)
}

/// Executa um comando silenciosamente e retorna o output
///
/// # Arguments
/// * `program` - Nome do programa a executar
/// * `args` - Argumentos do comando
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_silent<I, S>(program: &str, args: I) -> std::io::Result<Output>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    silent_command(program).args(args).output()
}

/// Executa PowerShell silenciosamente com um comando
///
/// # Arguments
/// * `command` - Comando PowerShell a executar
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_powershell(command: &str) -> std::io::Result<Output> {
    run_silent("powershell", ["-NoProfile", "-Command", command])
}

/// Executa WMIC silenciosamente
///
/// # Arguments
/// * `args` - Argumentos do WMIC
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_wmic<I, S>(args: I) -> std::io::Result<Output>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    run_silent("wmic", args)
}

/// Executa comando de registro (reg) silenciosamente
///
/// # Arguments
/// * `args` - Argumentos do reg
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_reg<I, S>(args: I) -> std::io::Result<Output>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    run_silent("reg", args)
}

/// Executa netsh silenciosamente
///
/// # Arguments
/// * `args` - Argumentos do netsh
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_netsh<I, S>(args: I) -> std::io::Result<Output>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    run_silent("netsh", args)
}

/// Executa getmac silenciosamente
///
/// # Arguments
/// * `args` - Argumentos do getmac
///
/// # Returns
/// Result com o Output ou erro de IO
pub fn run_getmac<I, S>(args: I) -> std::io::Result<Output>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    run_silent("getmac", args)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "windows")]
    fn test_silent_command_has_creation_flags() {
        // Este teste apenas verifica que o comando é criado sem erros
        let cmd = silent_command("cmd");
        assert!(cmd.get_program() == "cmd");
    }

    #[test]
    fn test_silent_command_non_windows() {
        // Em não-Windows, deve funcionar normalmente
        let cmd = silent_command("echo");
        assert!(cmd.get_program() == "echo");
    }
}
