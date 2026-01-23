# GIRO License Server - Load Testing

## Requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado
- API rodando localmente ou em ambiente de staging

## Instalação do k6

### Ubuntu/Debian

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### macOS

```bash
brew install k6
```

### Docker

```bash
docker run -i grafana/k6 run - <k6-script.js
```

## Configuração

As seguintes variáveis de ambiente podem ser configuradas:

| Variável   | Padrão                   | Descrição                 |
| ---------- | ------------------------ | ------------------------- |
| `BASE_URL` | `http://localhost:3000`  | URL base da API           |
| `API_KEY`  | `giro_sk_test_123456789` | API Key para autenticação |

## Cenários de Teste

O script inclui 3 cenários:

### 1. Smoke Test (0-1min)

- 5 VUs constantes
- Verifica se a API está funcionando

### 2. Load Test (1-10min)

- Ramp up para 100 VUs
- Simula carga normal de produção

### 3. Stress Test (10-24min)

- Atinge 1000 requisições/segundo
- Testa limite de capacidade

## Uso

### Executar todos os cenários

```bash
k6 run k6-script.js
```

### Executar com variáveis customizadas

```bash
k6 run -e BASE_URL=https://api.staging.giro.com -e API_KEY=giro_sk_live_xxxx k6-script.js
```

### Executar apenas smoke test

```bash
k6 run --scenario smoke k6-script.js
```

### Executar com output em JSON (para dashboards)

```bash
k6 run --out json=results.json k6-script.js
```

### Executar com Grafana Cloud

```bash
k6 cloud k6-script.js
```

## Thresholds (Critérios de Sucesso)

| Métrica           | Threshold |
| ----------------- | --------- |
| p95 response time | < 500ms   |
| p99 response time | < 1000ms  |
| Error rate        | < 1%      |
| Success rate      | > 99%     |

## Endpoints Testados

1. **GET /health** - Health check
2. **POST /api/v1/licenses/validate** - Validação de licença
3. **POST /api/v1/licenses/activate** - Ativação de licença
4. **POST /api/v1/heartbeat** - Heartbeat de dispositivo

## Resultados Esperados

Para atingir o critério de 1000 req/s:

- Latência p95 < 500ms
- Taxa de erro < 1%
- CPU do servidor < 80%
- Memória estável

## Troubleshooting

### API não responde

```bash
curl http://localhost:3000/health
```

### k6 não instalado

Verifique a instalação:

```bash
k6 version
```

### Erros de conexão

- Verifique se a API está rodando
- Verifique firewall/portas
- Aumente timeout se necessário
