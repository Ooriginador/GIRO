# Python Service Creation

Create a new async Python service following LeadBot patterns.

## Requirements

- Python 3.12+ with full type hints
- Pydantic v2 for validation
- httpx for async HTTP calls
- Context managers for clients
- pytest-asyncio for tests

## Template

```python
# src/services/{name}.py
from dataclasses import dataclass
from typing import Optional
from src.models.{model} import {Model}

@dataclass
class {Name}Service:
    """Service for {description}."""

    client: {Client}

    async def process(self, data: {Input}) -> {Output}:
        """Process {description}.

        Args:
            data: Input data to process

        Returns:
            Processed output

        Raises:
            {Error}: When processing fails
        """
        pass
```

## Test Template

```python
# tests/test_{name}.py
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def mock_client():
    return AsyncMock()

@pytest.mark.asyncio
async def test_{name}_process(mock_client):
    # Arrange
    service = {Name}Service(client=mock_client)

    # Act
    result = await service.process(data)

    # Assert
    assert result is not None
```
