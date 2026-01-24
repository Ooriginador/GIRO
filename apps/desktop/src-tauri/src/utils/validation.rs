//! Validation Utils

/// Verifica se um código de barras é tecnicamente válido (numérico)
///
/// O sistema permite códigos alfanuméricos internos, então use essa função
/// apenas quando precisar validar estritamente formatos EAN/UPC.
pub fn is_strict_barcode(barcode: &str) -> bool {
    let len = barcode.len();
    // EAN-8, EAN-13, UPC-A, UPC-E
    if len != 8 && len != 12 && len != 13 && len != 14 {
        return false;
    }
    barcode.chars().all(|c| c.is_ascii_digit())
}

/// Valida consistência de preços
pub fn validate_prices(sale_price: f64, cost_price: f64) -> bool {
    // Retorna true se ok (venda >= custo), false se warning (custo > venda)
    // Isso é apenas um warning, não impede a operação
    sale_price >= cost_price
}
