//! Tabela de VID/PID para Impressoras Térmicas
//!
//! Este módulo contém uma base de dados de USB Vendor ID e Product ID
//! para identificação precisa de impressoras térmicas/POS.
//!
//! Fontes:
//! - https://usb-ids.gowdy.us/
//! - Documentação dos fabricantes
//! - Testes empíricos

use serde::{Deserialize, Serialize};

// ════════════════════════════════════════════════════════════════════════════
// ESTRUTURAS INTERNAS (para dados estáticos - não exportadas)
// ════════════════════════════════════════════════════════════════════════════

/// Informações de um fabricante de impressoras (dados estáticos)
#[derive(Debug, Clone, Copy)]
struct PrinterVendor {
    /// Nome do fabricante
    name: &'static str,
    /// USB Vendor ID
    vid: u16,
    /// Lista de produtos conhecidos
    products: &'static [PrinterProduct],
}

/// Informações de um produto específico (dados estáticos)
#[derive(Debug, Clone, Copy)]
struct PrinterProduct {
    /// USB Product ID
    pid: u16,
    /// Nome/modelo do produto
    model: &'static str,
    /// Largura do papel em mm (se conhecida)
    paper_width_mm: Option<u8>,
    /// Se tem guilhotina automática
    has_cutter: bool,
    /// Se suporta gaveta de dinheiro
    has_cash_drawer: bool,
}

// ════════════════════════════════════════════════════════════════════════════
// ESTRUTURAS SERIALIZÁVEIS (para IPC)
// ════════════════════════════════════════════════════════════════════════════

/// Resultado de lookup por VID/PID
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VidPidLookupResult {
    /// Nome do fabricante
    pub vendor: String,
    /// Modelo do produto (se encontrado)
    pub model: Option<String>,
    /// Largura do papel em mm
    pub paper_width_mm: Option<u8>,
    /// Se tem guilhotina
    pub has_cutter: bool,
    /// Se tem gaveta
    pub has_cash_drawer: bool,
    /// Confiança da detecção (0-100)
    pub confidence: u8,
}

// ════════════════════════════════════════════════════════════════════════════
// DATABASE DE VID/PID
// ════════════════════════════════════════════════════════════════════════════

/// Lista de fabricantes conhecidos de impressoras térmicas (privado - use lookup_by_vid_pid)
static THERMAL_PRINTER_VENDORS: &[PrinterVendor] = &[
    // ─────────────────────────────────────────────────────────────────────────
    // EPSON (VID: 0x04B8)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Epson",
        vid: 0x04B8,
        products: &[
            PrinterProduct {
                pid: 0x0202,
                model: "TM-T88III",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E03,
                model: "TM-T88IV",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E15,
                model: "TM-T88V",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E28,
                model: "TM-T88VI",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E1F,
                model: "TM-T20II",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E27,
                model: "TM-T20III",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E20,
                model: "TM-T20X",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E30,
                model: "TM-m30",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E32,
                model: "TM-m30II",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E06,
                model: "TM-U220",
                paper_width_mm: Some(76),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E04,
                model: "TM-U295",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0E11,
                model: "TM-L90",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: false,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // STAR MICRONICS (VID: 0x0519)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Star Micronics",
        vid: 0x0519,
        products: &[
            PrinterProduct {
                pid: 0x000A,
                model: "TSP100",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0001,
                model: "TSP650/TSP700",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0007,
                model: "TSP143",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0015,
                model: "TSP654",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0013,
                model: "SP700",
                paper_width_mm: Some(76),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0002,
                model: "SP500",
                paper_width_mm: Some(76),
                has_cutter: false,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // BEMATECH (VID: 0x20D1)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Bematech",
        vid: 0x20D1,
        products: &[
            PrinterProduct {
                pid: 0x7008,
                model: "MP-4200 TH",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x7009,
                model: "MP-4200 TH FI",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x700A,
                model: "MP-2800 TH",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x7000,
                model: "MP-4000 TH",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x7005,
                model: "MP-100S TH",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // ELGIN (VID: 0x0DD4)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Elgin",
        vid: 0x0DD4,
        products: &[
            PrinterProduct {
                pid: 0x0101,
                model: "i7",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0102,
                model: "i9",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0103,
                model: "i9 Full",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0100,
                model: "i8",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0104,
                model: "VOX+",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // DARUMA (VID: 0x0888)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Daruma",
        vid: 0x0888,
        products: &[
            PrinterProduct {
                pid: 0x1000,
                model: "DR800",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x1001,
                model: "DR700",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x1002,
                model: "DR600",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // CITIZEN (VID: 0x2730)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Citizen",
        vid: 0x2730,
        products: &[
            PrinterProduct {
                pid: 0x0201,
                model: "CT-S310II",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0202,
                model: "CT-S801",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0203,
                model: "CT-S601",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0210,
                model: "CT-S251",
                paper_width_mm: Some(58),
                has_cutter: true,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // XPRINTER / STM32 Based (VID: 0x0483)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Xprinter/Generic STM32",
        vid: 0x0483,
        products: &[
            PrinterProduct {
                pid: 0x5740,
                model: "XP-58/80 Series",
                paper_width_mm: None, // Variável
                has_cutter: false,    // Depende do modelo
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x5741,
                model: "XP-80C",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x5742,
                model: "XP-58IIH",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // C3TECH (VID: 0x0456)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "C3Tech",
        vid: 0x0456,
        products: &[
            PrinterProduct {
                pid: 0x0808,
                model: "POS-58",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0810,
                model: "POS-80",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // BIXOLON (VID: 0x1504)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Bixolon",
        vid: 0x1504,
        products: &[
            PrinterProduct {
                pid: 0x0027,
                model: "SRP-350III",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0028,
                model: "SRP-350plusIII",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x0030,
                model: "SRP-330II",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // SEWOO (VID: 0x0DD4 - compartilha com Elgin em alguns modelos)
    // Nota: Sewoo fabrica impressoras OEM para várias marcas
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Sewoo",
        vid: 0x0483, // Alguns modelos usam VID genérico
        products: &[
            PrinterProduct {
                pid: 0x5745,
                model: "LK-T21",
                paper_width_mm: Some(58),
                has_cutter: false,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x5746,
                model: "LK-T41",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // GENERIC CHINESE POS (VID: 0x0416, 0x1A86)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Generic POS",
        vid: 0x0416,
        products: &[PrinterProduct {
            pid: 0x5011,
            model: "POS-58/80 Generic",
            paper_width_mm: None,
            has_cutter: false,
            has_cash_drawer: true,
        }],
    },
    PrinterVendor {
        name: "WinChipHead (CH340 USB-Serial)",
        vid: 0x1A86,
        products: &[PrinterProduct {
            pid: 0x7523,
            model: "CH340 USB-Serial Adapter",
            paper_width_mm: None,
            has_cutter: false,
            has_cash_drawer: true,
        }],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // TANCA (Brasileira)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Tanca",
        vid: 0x0483, // Usa chipset STM32
        products: &[PrinterProduct {
            pid: 0x5750,
            model: "TP-620",
            paper_width_mm: Some(80),
            has_cutter: true,
            has_cash_drawer: true,
        }],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // CONTROL ID (Brasileira)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Control iD",
        vid: 0x0483,
        products: &[
            PrinterProduct {
                pid: 0x5760,
                model: "Print iD Touch",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
            PrinterProduct {
                pid: 0x5761,
                model: "Print iD",
                paper_width_mm: Some(80),
                has_cutter: true,
                has_cash_drawer: true,
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // SWEDA (Brasileira)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Sweda",
        vid: 0x20D1, // Compartilha com Bematech
        products: &[PrinterProduct {
            pid: 0x7020,
            model: "SI-300",
            paper_width_mm: Some(80),
            has_cutter: true,
            has_cash_drawer: true,
        }],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // GERTEC (Brasileira)
    // ─────────────────────────────────────────────────────────────────────────
    PrinterVendor {
        name: "Gertec",
        vid: 0x0483,
        products: &[PrinterProduct {
            pid: 0x5770,
            model: "G250",
            paper_width_mm: Some(80),
            has_cutter: true,
            has_cash_drawer: true,
        }],
    },
];

// ════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE LOOKUP
// ════════════════════════════════════════════════════════════════════════════

/// Busca informações de impressora por VID/PID
///
/// # Arguments
/// * `vid` - USB Vendor ID
/// * `pid` - USB Product ID
///
/// # Returns
/// Informações da impressora se encontrada
pub fn lookup_by_vid_pid(vid: u16, pid: u16) -> Option<VidPidLookupResult> {
    for vendor in THERMAL_PRINTER_VENDORS {
        if vendor.vid == vid {
            // Encontrou o fabricante, busca produto específico
            for product in vendor.products {
                if product.pid == pid {
                    return Some(VidPidLookupResult {
                        vendor: vendor.name.to_string(),
                        model: Some(product.model.to_string()),
                        paper_width_mm: product.paper_width_mm,
                        has_cutter: product.has_cutter,
                        has_cash_drawer: product.has_cash_drawer,
                        confidence: 100, // Match exato
                    });
                }
            }

            // Fabricante encontrado mas produto desconhecido
            return Some(VidPidLookupResult {
                vendor: vendor.name.to_string(),
                model: None,
                paper_width_mm: None,
                has_cutter: false,
                has_cash_drawer: true,
                confidence: 70, // Match parcial
            });
        }
    }

    None
}

/// Busca apenas por VID (fabricante)
pub fn lookup_vendor(vid: u16) -> Option<&'static str> {
    THERMAL_PRINTER_VENDORS
        .iter()
        .find(|v| v.vid == vid)
        .map(|v| v.name)
}

/// Verifica se um VID pertence a um fabricante de impressoras térmicas conhecidas
pub fn is_known_thermal_vendor(vid: u16) -> bool {
    THERMAL_PRINTER_VENDORS.iter().any(|v| v.vid == vid)
}

/// Retorna lista de todos os VIDs conhecidos
pub fn get_all_thermal_vids() -> Vec<u16> {
    THERMAL_PRINTER_VENDORS
        .iter()
        .map(|v| v.vid)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect()
}

/// Retorna lista de todos os VID/PID conhecidos como tuplas
pub fn get_all_vid_pid_pairs() -> Vec<(u16, u16, &'static str, &'static str)> {
    let mut pairs = Vec::new();

    for vendor in THERMAL_PRINTER_VENDORS {
        for product in vendor.products {
            pairs.push((vendor.vid, product.pid, vendor.name, product.model));
        }
    }

    pairs
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lookup_epson_tm_t20x() {
        let result = lookup_by_vid_pid(0x04B8, 0x0E20);
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.vendor, "Epson");
        assert_eq!(info.model, Some("TM-T20X".to_string()));
        assert_eq!(info.paper_width_mm, Some(80));
        assert!(info.has_cutter);
        assert!(info.has_cash_drawer);
        assert_eq!(info.confidence, 100);
    }

    #[test]
    fn test_lookup_elgin_i9() {
        let result = lookup_by_vid_pid(0x0DD4, 0x0102);
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.vendor, "Elgin");
        assert_eq!(info.model, Some("i9".to_string()));
    }

    #[test]
    fn test_lookup_bematech_mp4200() {
        let result = lookup_by_vid_pid(0x20D1, 0x7008);
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.vendor, "Bematech");
        assert_eq!(info.model, Some("MP-4200 TH".to_string()));
    }

    #[test]
    fn test_lookup_unknown_vendor() {
        let result = lookup_by_vid_pid(0xFFFF, 0xFFFF);
        assert!(result.is_none());
    }

    #[test]
    fn test_lookup_known_vendor_unknown_product() {
        let result = lookup_by_vid_pid(0x04B8, 0xFFFF); // Epson, produto desconhecido
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.vendor, "Epson");
        assert!(info.model.is_none());
        assert_eq!(info.confidence, 70);
    }

    #[test]
    fn test_is_known_thermal_vendor() {
        assert!(is_known_thermal_vendor(0x04B8)); // Epson
        assert!(is_known_thermal_vendor(0x0519)); // Star
        assert!(is_known_thermal_vendor(0x20D1)); // Bematech
        assert!(!is_known_thermal_vendor(0x046D)); // Logitech (não é térmica)
    }

    #[test]
    fn test_get_all_thermal_vids() {
        let vids = get_all_thermal_vids();
        assert!(vids.contains(&0x04B8)); // Epson
        assert!(vids.contains(&0x0519)); // Star
        assert!(vids.len() >= 10); // Pelo menos 10 fabricantes
    }
}
