use std::env;

/// Return true when application should read/write *_decimal columns
pub fn use_decimal_columns() -> bool {
    match env::var("USE_DECIMAL_COLUMNS") {
        Ok(v) => v == "1" || v.eq_ignore_ascii_case("true"),
        Err(_) => false,
    }
}

/// Helper to choose column name (snake_case) or decimal alias
pub fn col(name: &str) -> String {
    if use_decimal_columns() {
        format!("{}_decimal AS {}", name, name)
    } else {
        name.to_string()
    }
}
