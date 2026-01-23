# GIRO License Server

> Servidor central de licenciamento e autenticação para o ecossistema de produtos GIRO.

## 🚀 Visão Geral

O **GIRO License Server** é uma API robusta desenvolvida em **Rust (Axum)** responsável por gerenciar o ciclo de vida das licenças de software, autenticação de usuários administrativos e validação de hardware para aplicações desktop.

## 🛠️ Tech Stack

- **Linguagem**: Rust 1.85+
- **Framework Web**: Axum 0.7
- **Banco de Dados**: PostgreSQL 16 (via SQLx)
- **Containerização**: Docker (Multi-stage build)
- **Infraestrutura**: Railway
- **Autenticação**: JWT (Admin) & Hardware Fingerprinting (Desktop)

## 📚 Documentação

A documentação detalhada do projeto encontra-se no diretório `docs/`:

- [00-OVERVIEW.md](docs/00-OVERVIEW.md) - Visão geral e propósito
- [01-ARQUITETURA.md](docs/01-ARQUITETURA.md) - Decisões técnicas e arquiteturais
- [02-DATABASE-SCHEMA.md](docs/02-DATABASE-SCHEMA.md) - Modelagem de dados
- [03-API-REFERENCE.md](docs/03-API-REFERENCE.md) - Documentação completa dos Endpoints

## 📦 Estrutura do Projeto

```
.
├── backend/            # Código fonte da API Rust
├── dashboard/          # Frontend Next.js (Admin Dashboard)
├── docs/               # Documentação técnica
├── railway.toml        # Configuração de Deployment (Railway)
└── docker-compose.yml  # Configuração para desenvolvimento local
```

## 🔧 Desenvolvimento Local

Para rodar o ambiente de desenvolvimento localmente:

```bash
# Iniciar Banco de Dados e Redis
docker-compose up -d

# Rodar a API (necessário Rust instalado)
cd backend
cargo run
```

## 🔒 Licença

Proprietário: **Arkheion Corp**  
Este repositório é **privado** e de uso exclusivo.
