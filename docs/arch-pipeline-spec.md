# Arquitetura Técnica e Contratos de Interface - Michelle COI Sigware AI

## 1. Visão Geral da Arquitetura
A arquitetura do painel Michelle COI é estruturada em camadas desacopladas e resilientes para suportar:
1. **Upload Flexível e Parser Resiliente**: Tolerante a planilhas heterogêneas do Sigware, com autodetecção de abas e colunas por heurísticas determinísticas.
2. **Inferência Semântica por IA Validada**: Camada intermediária que padroniza os dados estruturados e aplica validações cruzadas para evitar alucinações (ex: validação de coordenadas vs geocodificação ou consistência de horários em ordens de serviço).
3. **Persistência Railway / Local Storage**: Estrutura dual-mode (Cloud via Railway e Fallback/Offline com IndexedDB/LocalStorage criptografado) garantindo continuidade de operação.
4. **Renderizador Dinâmico de Dashboards**: Componentes web nativos e dinâmicos que renderizam KPIs operacionais, mapas COI, gráficos e tabelas auditáveis em tempo real.

## 2. Contratos de Interface (API Contracts)

### 2.1. Upload & Parser (`POST /api/v1/sigware/parse`)
- **Request**: `multipart/form-data` com arquivo `.xlsx`, `.csv` ou `.json`.
- **Response (200 OK)**:
```json
{
  "status": "success",
  "file_id": "uuid-v4",
  "detected_profile": "sigware_os_v2",
  "summary": {
    "total_rows": 1250,
    "valid_rows": 1245,
    "error_rows": 5
  },
  "data": [
    {
      "id": "OS-98124",
      "timestamp": "2026-10-18T08:30:00Z",
      "account": "CONTA-4451",
      "status": "EM_ANDAMENTO",
      "latitude": -23.5505,
      "longitude": -46.6333
    }
  ],
  "errors": [
    {"row": 12, "reason": "Timestamp inválido ou ausente"}
  ]
}
```

### 2.2. Inferência Semântica IA (`POST /api/v1/ai/semantic-enrichment`)
- **Request**:
```json
{
  "file_id": "uuid-v4",
  "context": "analise_coi_diaria",
  "payload": [/* dados estruturados do parser */]
}
```
- **Response (200 OK)**:
```json
{
  "status": "analyzed",
  "insights": [
    {
      "type": "anomaly_detection",
      "severity": "high",
      "description": "Concentração atípica de ordens de serviço pendentes na Região Sul.",
      "suggested_action": "Redistribuir equipes de campo."
    }
  ],
  "confidence_score": 0.94
}
```

## 3. Decisões Arquiteturais e Tradeoffs
- **Decisão**: Utilizar parser baseado em heurísticas locais antes de enviar para a IA.
  - **Tradeoff**: Maior uso de processamento no cliente/servidor inicial, mas garante economia de tokens e imunidade a instabilidades da API de IA para dados estruturados.
- **Decisão**: Isolamento estrito entre dados de clientes e ambiente público.
  - **Tradeoff**: Requer persistência separada e validação rigorosa de ACLs.
