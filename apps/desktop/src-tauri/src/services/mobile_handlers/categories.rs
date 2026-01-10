//! Handler de categorias
//!
//! Processa ações: category.list

use crate::repositories::CategoryRepository;
use crate::services::mobile_protocol::{MobileErrorCode, MobileResponse};
use sqlx::SqlitePool;

/// Handler de categorias
pub struct CategoriesHandler {
    pool: SqlitePool,
}

impl CategoriesHandler {
    /// Cria novo handler
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Lista todas as categorias
    pub async fn list(&self, id: u64) -> MobileResponse {
        let repo = CategoryRepository::new(&self.pool);

        match repo.list_all().await {
            Ok(categories) => {
                // Transformar em formato hierárquico se necessário
                let formatted: Vec<serde_json::Value> = categories
                    .iter()
                    .map(|cat| {
                        serde_json::json!({
                            "id": cat.id,
                            "name": cat.name,
                            "description": cat.description,
                            "parentId": cat.parent_id,
                            "color": cat.color,
                            "icon": cat.icon,
                            "productCount": cat.product_count,
                            "isActive": cat.is_active
                        })
                    })
                    .collect();

                // Construir árvore de categorias
                let tree = build_category_tree(&formatted);

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "categories": formatted,
                        "tree": tree,
                        "total": formatted.len()
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao listar categorias: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao listar categorias",
                )
            }
        }
    }

    /// Busca categoria por ID
    pub async fn get(&self, id: u64, category_id: &str) -> MobileResponse {
        let repo = CategoryRepository::new(&self.pool);

        match repo.get_by_id(category_id).await {
            Ok(Some(category)) => MobileResponse::success(
                id,
                serde_json::json!({
                    "id": category.id,
                    "name": category.name,
                    "description": category.description,
                    "parentId": category.parent_id,
                    "color": category.color,
                    "icon": category.icon,
                    "productCount": category.product_count,
                    "isActive": category.is_active
                }),
            ),
            Ok(None) => {
                MobileResponse::error(id, MobileErrorCode::NotFound, "Categoria não encontrada")
            }
            Err(e) => {
                tracing::error!("Erro ao buscar categoria: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao buscar categoria",
                )
            }
        }
    }

    /// Lista produtos de uma categoria
    pub async fn products(
        &self,
        id: u64,
        category_id: &str,
        limit: i32,
        offset: i32,
    ) -> MobileResponse {
        let repo = CategoryRepository::new(&self.pool);

        match repo.list_products(category_id, limit, offset).await {
            Ok(products) => {
                let has_more = products.len() as i32 >= limit;

                MobileResponse::success(
                    id,
                    serde_json::json!({
                        "categoryId": category_id,
                        "products": products,
                        "total": products.len(),
                        "limit": limit,
                        "offset": offset,
                        "hasMore": has_more
                    }),
                )
            }
            Err(e) => {
                tracing::error!("Erro ao listar produtos da categoria: {}", e);
                MobileResponse::error(
                    id,
                    MobileErrorCode::InternalError,
                    "Erro ao listar produtos da categoria",
                )
            }
        }
    }
}

/// Constrói árvore de categorias a partir de lista plana
fn build_category_tree(categories: &[serde_json::Value]) -> Vec<serde_json::Value> {
    let mut tree: Vec<serde_json::Value> = Vec::new();

    // Primeiro, encontrar categorias raiz (sem parent)
    for cat in categories {
        if cat["parentId"].is_null() {
            let mut node = cat.clone();

            // Buscar filhos
            let children: Vec<serde_json::Value> = categories
                .iter()
                .filter(|c| c["parentId"] == cat["id"])
                .map(|c| {
                    let mut child = c.clone();
                    // Buscar netos (nível 2)
                    let grandchildren: Vec<serde_json::Value> = categories
                        .iter()
                        .filter(|gc| gc["parentId"] == c["id"])
                        .cloned()
                        .collect();
                    if !grandchildren.is_empty() {
                        child["children"] = serde_json::json!(grandchildren);
                    }
                    child
                })
                .collect();

            if !children.is_empty() {
                node["children"] = serde_json::json!(children);
            }

            tree.push(node);
        }
    }

    tree
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_category_tree() {
        let categories = vec![
            serde_json::json!({
                "id": "1",
                "name": "Bebidas",
                "parentId": null
            }),
            serde_json::json!({
                "id": "2",
                "name": "Refrigerantes",
                "parentId": "1"
            }),
            serde_json::json!({
                "id": "3",
                "name": "Sucos",
                "parentId": "1"
            }),
            serde_json::json!({
                "id": "4",
                "name": "Alimentos",
                "parentId": null
            }),
        ];

        let tree = build_category_tree(&categories);

        assert_eq!(tree.len(), 2);
        assert_eq!(tree[0]["name"], "Bebidas");
        assert_eq!(tree[0]["children"].as_array().unwrap().len(), 2);
    }
}
