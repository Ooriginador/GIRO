# 🐍 Python LeadBot Skill

> **Especialista em automação WhatsApp e integração com N8N**  
> Versão: 1.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
project: giro-leadbot (LEADBOT)
path: giro-leadbot/
stack: Python 3.12 + httpx + Pydantic v2
integrations:
  - Evolution API: WhatsApp messaging
  - N8N: Workflow automation
  - Dominus: CRM integration
purpose: WhatsApp lead capture and automated sales funnel
```

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- Python 3.12+ com tipagem completa
- Integração com Evolution API para WhatsApp
- Workflows N8N para automação
- Pydantic v2 para validação de dados
- Async programming com httpx

## 🛠️ Stack Técnica

| Componente     | Versão | Uso                |
| -------------- | ------ | ------------------ |
| Python         | 3.12+  | Runtime            |
| httpx          | 0.27+  | Async HTTP client  |
| Pydantic       | 2.5+   | Data validation    |
| pytest         | 8.0+   | Testing            |
| pytest-asyncio | 0.23+  | Async test support |
| python-dotenv  | 1.0+   | Environment vars   |

## 📁 Estrutura do Projeto

```
giro-leadbot/
├── src/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── config.py            # Settings (Pydantic BaseSettings)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── evolution.py     # Evolution API client
│   │   └── dominus.py       # Dominus CRM client
│   ├── services/
│   │   ├── __init__.py
│   │   ├── message.py       # Message processing
│   │   └── lead.py          # Lead management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── message.py       # Message models
│   │   └── lead.py          # Lead models
│   └── utils/
│       ├── __init__.py
│       └── templates.py     # Message templates
├── templates/               # WhatsApp message templates
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # pytest fixtures
│   ├── test_evolution.py
│   └── test_services.py
├── n8n_workflows_fixed/     # N8N workflow exports
├── requirements.txt
├── pytest.ini
└── Makefile
```

## 📐 Padrões de Código

### Pydantic Settings

```python
# src/config.py
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Evolution API
    evolution_url: str = Field(..., alias="EVOLUTION_URL")
    evolution_api_key: str = Field(..., alias="EVOLUTION_API_KEY")
    evolution_instance: str = Field(..., alias="EVOLUTION_INSTANCE")

    # Dominus CRM
    dominus_url: str = Field(..., alias="DOMINUS_URL")
    dominus_token: str = Field(..., alias="DOMINUS_TOKEN")

    # App settings
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### Pydantic Models

```python
# src/models/message.py
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"

class IncomingMessage(BaseModel):
    """Message received from WhatsApp via Evolution API."""

    remote_jid: str = Field(..., alias="remoteJid")
    from_me: bool = Field(..., alias="fromMe")
    message_type: MessageType = Field(..., alias="messageType")
    content: str
    timestamp: datetime

    class Config:
        populate_by_name = True

class OutgoingMessage(BaseModel):
    """Message to send via Evolution API."""

    number: str
    text: str
    delay: int = Field(default=1000, ge=0, le=10000)
```

### Async HTTP Client

```python
# src/api/evolution.py
import httpx
from typing import Optional
from src.config import settings
from src.models.message import OutgoingMessage

class EvolutionClient:
    """Async client for Evolution API."""

    def __init__(self):
        self.base_url = settings.evolution_url
        self.api_key = settings.evolution_api_key
        self.instance = settings.evolution_instance
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "apikey": self.api_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()

    async def send_text(self, message: OutgoingMessage) -> dict:
        """Send text message via WhatsApp."""
        response = await self._client.post(
            f"/message/sendText/{self.instance}",
            json={
                "number": message.number,
                "text": message.text,
                "delay": message.delay,
            },
        )
        response.raise_for_status()
        return response.json()

    async def check_number(self, phone: str) -> bool:
        """Check if number is registered on WhatsApp."""
        response = await self._client.post(
            f"/chat/whatsappNumbers/{self.instance}",
            json={"numbers": [phone]},
        )
        response.raise_for_status()
        data = response.json()
        return len(data) > 0 and data[0].get("exists", False)
```

### Service Layer

```python
# src/services/lead.py
from dataclasses import dataclass
from typing import Optional
from src.api.evolution import EvolutionClient
from src.api.dominus import DominusClient
from src.models.lead import Lead, LeadStatus
from src.utils.templates import get_welcome_template

@dataclass
class LeadService:
    """Lead management service."""

    evolution: EvolutionClient
    dominus: DominusClient

    async def process_new_contact(self, phone: str, name: Optional[str] = None) -> Lead:
        """Process a new contact from WhatsApp."""

        # Check if lead exists in CRM
        existing = await self.dominus.find_lead_by_phone(phone)
        if existing:
            return existing

        # Create new lead
        lead = Lead(
            phone=phone,
            name=name or "Novo Contato",
            status=LeadStatus.NEW,
        )

        # Save to CRM
        created = await self.dominus.create_lead(lead)

        # Send welcome message
        welcome_msg = get_welcome_template(lead.name)
        await self.evolution.send_text(
            OutgoingMessage(number=phone, text=welcome_msg)
        )

        return created
```

### Pytest Patterns

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_evolution():
    """Mock Evolution API client."""
    client = AsyncMock()
    client.send_text = AsyncMock(return_value={"status": "sent"})
    client.check_number = AsyncMock(return_value=True)
    return client

@pytest_asyncio.fixture
async def lead_service(mock_evolution):
    """Lead service with mocked dependencies."""
    from src.services.lead import LeadService

    mock_dominus = AsyncMock()
    mock_dominus.find_lead_by_phone = AsyncMock(return_value=None)
    mock_dominus.create_lead = AsyncMock(side_effect=lambda x: x)

    return LeadService(
        evolution=mock_evolution,
        dominus=mock_dominus,
    )

# tests/test_services.py
import pytest
from src.models.lead import LeadStatus

@pytest.mark.asyncio
async def test_process_new_contact_creates_lead(lead_service, mock_evolution):
    """Should create new lead and send welcome message."""
    # Act
    lead = await lead_service.process_new_contact(
        phone="5511999999999",
        name="João Silva",
    )

    # Assert
    assert lead.name == "João Silva"
    assert lead.status == LeadStatus.NEW
    mock_evolution.send_text.assert_called_once()
```

## 🔧 Comandos Úteis

```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
python -m src.main

# Tests
pytest                           # Run all tests
pytest -v                        # Verbose
pytest --cov=src                 # With coverage
pytest -k "test_lead"           # Filter by name
pytest --asyncio-mode=auto       # Auto async mode

# Linting
black src tests                  # Format
ruff check src                   # Lint
mypy src                         # Type check

# Makefile shortcuts
make test                        # Run tests
make lint                        # Run linters
make run                         # Run app
```

## ✅ Checklist

- [ ] Tipagem completa (PEP 484)
- [ ] Pydantic models para validação
- [ ] Async/await para I/O
- [ ] Context managers para clients
- [ ] pytest-asyncio para testes async
- [ ] Fixtures reutilizáveis
- [ ] Mocks para APIs externas
- [ ] Error handling com try/except específico
- [ ] Logging estruturado
- [ ] .env para configuração

## 🔗 Recursos

- [Pydantic v2 Docs](https://docs.pydantic.dev/latest/)
- [httpx](https://www.python-httpx.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Evolution API](https://doc.evolution-api.com/)
