use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_sales_today: f64,
    pub total_sales_yesterday: f64,
    pub count_sales_today: i32,
    pub open_service_orders: i32,
    pub active_warranties: i32,
    pub low_stock_products: i32,
    pub active_alerts: i32,
    pub revenue_weekly: Vec<DailyRevenue>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DailyRevenue {
    pub date: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ServiceOrderStats {
    pub total_orders: i32,
    pub by_status: Vec<StatusCount>,
    pub revenue_labor: f64,
    pub revenue_parts: f64,
    pub average_ticket: f64,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct StatusCount {
    pub status: String,
    pub count: i32,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TopItem {
    pub id: String,
    pub name: String,
    pub quantity: f64,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MotopartsReport {
    pub period_start: String,
    pub period_end: String,
    pub sales_total: f64,
    pub service_labour_total: f64,
    pub parts_total: f64,
    pub warranties_count: i32,
    pub warranties_cost: f64,
}
