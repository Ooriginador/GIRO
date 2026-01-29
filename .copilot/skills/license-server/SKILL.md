# 🔑 License Server Skill

> **Especialista em gerenciamento de licenças e autenticação**  
> Versão: 1.0.0 | Última Atualização: 29 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- FastAPI para backend Python
- Sistema de licenciamento GIRO
- Autenticação JWT
- Integração com PostgreSQL via Prisma
- Dashboard de administração

## 🛠️ Stack Técnica

| Componente    | Versão | Uso            |
| ------------- | ------ | -------------- |
| FastAPI       | 0.109+ | Framework API  |
| Python        | 3.12+  | Runtime        |
| Prisma Client | 0.12+  | ORM            |
| PostgreSQL    | 16+    | Database       |
| Railway       | -      | Hosting        |
| JWT           | -      | Authentication |

## 📁 Estrutura do Projeto

```
giro-license-server/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py       # Dependencies
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── routes/
│   │   │       └── endpoints/
│   │   ├── core/
│   │   │   ├── security.py   # JWT, hashing
│   │   │   └── license.py    # License logic
│   │   ├── models/           # Pydantic models
│   │   ├── services/         # Business logic
│   │   └── schemas/          # API schemas
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── dashboard/                # Next.js admin
└── railway.toml
```

## 📐 Padrões de Código

### FastAPI Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_db
from app.schemas.license import LicenseCreate, LicenseResponse
from app.services.license import LicenseService
from prisma import Prisma

router = APIRouter()

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    license_data: LicenseCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cria uma nova licença para um cliente.

    Requer: Admin role
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar licenças",
        )

    service = LicenseService(db)
    return await service.create(license_data)


@router.get("/validate/{license_key}")
async def validate_license(
    license_key: str,
    machine_id: str,
    db: Prisma = Depends(get_db),
):
    """
    Valida uma licença e registra ativação.

    Chamado pelo GIRO Desktop no startup.
    """
    service = LicenseService(db)
    result = await service.validate(license_key, machine_id)

    if not result.valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=result.error,
        )

    return result
```

### Prisma Schema (License)

```prisma
generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
  recursive_type_depth = 5
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model License {
  id            String       @id @default(uuid())
  key           String       @unique
  type          LicenseType
  status        LicenseStatus @default(ACTIVE)

  // Limites
  maxActivations Int         @default(1)
  maxComputers   Int         @default(1)

  // Datas
  createdAt     DateTime     @default(now())
  expiresAt     DateTime?

  // Relações
  customerId    String
  customer      Customer     @relation(fields: [customerId], references: [id])
  activations   Activation[]

  @@index([key])
  @@index([customerId])
}

model Activation {
  id          String   @id @default(uuid())
  machineId   String
  machineName String?
  activatedAt DateTime @default(now())
  lastSeenAt  DateTime @default(now())
  ipAddress   String?

  licenseId   String
  license     License  @relation(fields: [licenseId], references: [id])

  @@unique([licenseId, machineId])
  @@index([machineId])
}

model Customer {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  phone     String?
  document  String?   // CPF/CNPJ

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  licenses  License[]

  @@index([email])
}

enum LicenseType {
  TRIAL
  BASIC
  PROFESSIONAL
  ENTERPRISE
}

enum LicenseStatus {
  ACTIVE
  SUSPENDED
  EXPIRED
  REVOKED
}
```

### JWT Authentication

```python
# app/core/security.py
from datetime import datetime, timedelta
from typing import Any
import jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
    }

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

### License Service

```python
# app/services/license.py
from datetime import datetime
import secrets
from prisma import Prisma
from app.schemas.license import LicenseCreate, LicenseValidation

class LicenseService:
    def __init__(self, db: Prisma):
        self.db = db

    async def create(self, data: LicenseCreate) -> dict:
        # Gerar chave única
        key = self._generate_key(data.type)

        license = await self.db.license.create(
            data={
                "key": key,
                "type": data.type,
                "maxActivations": data.max_activations,
                "maxComputers": data.max_computers,
                "expiresAt": data.expires_at,
                "customerId": data.customer_id,
            }
        )

        return license

    async def validate(
        self,
        license_key: str,
        machine_id: str
    ) -> LicenseValidation:
        license = await self.db.license.find_unique(
            where={"key": license_key},
            include={"activations": True},
        )

        if not license:
            return LicenseValidation(valid=False, error="Licença não encontrada")

        if license.status != "ACTIVE":
            return LicenseValidation(valid=False, error=f"Licença {license.status}")

        if license.expiresAt and license.expiresAt < datetime.utcnow():
            await self._expire_license(license.id)
            return LicenseValidation(valid=False, error="Licença expirada")

        # Verificar ativações
        existing = next(
            (a for a in license.activations if a.machineId == machine_id),
            None
        )

        if existing:
            # Atualizar lastSeenAt
            await self.db.activation.update(
                where={"id": existing.id},
                data={"lastSeenAt": datetime.utcnow()},
            )
        elif len(license.activations) >= license.maxComputers:
            return LicenseValidation(
                valid=False,
                error=f"Limite de {license.maxComputers} computadores atingido"
            )
        else:
            # Nova ativação
            await self.db.activation.create(
                data={
                    "machineId": machine_id,
                    "licenseId": license.id,
                }
            )

        return LicenseValidation(
            valid=True,
            license_type=license.type,
            expires_at=license.expiresAt,
        )

    def _generate_key(self, license_type: str) -> str:
        prefix = {
            "TRIAL": "TRL",
            "BASIC": "BAS",
            "PROFESSIONAL": "PRO",
            "ENTERPRISE": "ENT",
        }.get(license_type, "GEN")

        random_part = secrets.token_hex(8).upper()
        return f"GIRO-{prefix}-{random_part[:4]}-{random_part[4:8]}-{random_part[8:12]}-{random_part[12:]}"

    async def _expire_license(self, license_id: str):
        await self.db.license.update(
            where={"id": license_id},
            data={"status": "EXPIRED"},
        )
```

## 🔌 API Endpoints

| Método | Endpoint                          | Descrição           |
| ------ | --------------------------------- | ------------------- |
| POST   | `/api/v1/auth/login`              | Login admin         |
| POST   | `/api/v1/licenses/`               | Criar licença       |
| GET    | `/api/v1/licenses/validate/{key}` | Validar licença     |
| GET    | `/api/v1/licenses/{id}`           | Detalhes da licença |
| PUT    | `/api/v1/licenses/{id}`           | Atualizar licença   |
| DELETE | `/api/v1/licenses/{id}/revoke`    | Revogar licença     |
| GET    | `/api/v1/customers/`              | Listar clientes     |
| POST   | `/api/v1/customers/`              | Criar cliente       |

## 🔗 Integração com GIRO Desktop

```rust
// GIRO Desktop - license_service.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ValidateRequest {
    machine_id: String,
}

#[derive(Deserialize)]
pub struct LicenseValidation {
    pub valid: bool,
    pub license_type: Option<String>,
    pub expires_at: Option<String>,
    pub error: Option<String>,
}

pub async fn validate_license(
    license_key: &str,
    machine_id: &str,
) -> Result<LicenseValidation, String> {
    let client = Client::new();
    let url = format!(
        "{}/api/v1/licenses/validate/{}?machine_id={}",
        env!("LICENSE_SERVER_URL"),
        license_key,
        machine_id
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        response.json().await.map_err(|e| e.to_string())
    } else {
        let error: LicenseValidation = response.json().await.map_err(|e| e.to_string())?;
        Ok(error)
    }
}
```

## ✅ Checklist

### Backend

- [ ] FastAPI configurado
- [ ] Prisma schema definido
- [ ] JWT authentication
- [ ] License validation endpoint
- [ ] Rate limiting
- [ ] CORS configurado

### Deploy

- [ ] Railway configurado
- [ ] PostgreSQL provisionado
- [ ] Variáveis de ambiente
- [ ] Health check endpoint
- [ ] Logs estruturados

## 🔗 Referências

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Prisma Python](https://prisma-client-py.readthedocs.io/)
- [Railway Docs](https://docs.railway.app/)
