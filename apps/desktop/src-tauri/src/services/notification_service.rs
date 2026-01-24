use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

pub struct NotificationService;

impl NotificationService {
    pub fn notify(app: &AppHandle, title: &str, body: &str) {
        let _ = app.notification()
            .builder()
            .title(title)
            .body(body)
            .show();
    }

    pub fn alert(app: &AppHandle, body: &str) {
        Self::notify(app, "GIRO - Alerta do Sistema", body);
    }
}
