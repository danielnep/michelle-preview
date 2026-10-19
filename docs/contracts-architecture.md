# Contratos de Interface e Arquitetura Técnica — Painel Michelle

Este documento define a arquitetura técnica e os contratos de interface entre os componentes centrais do ecossistema Michelle COI.

## 1. Visão Geral da Pipeline

```
[ Upload / Drag-and-Drop ] 
        │
        ▼
[ Parser Resiliente Sigware (XLSX / CSV) ]
        │
        ▼
[ Inferência Semântica por IA & Profiler ]
        │
        ▼
[ Persistência Local / Railway (Outbox & SQLite) ]
        │
        ▼
[ Renderizador Dinâmico de Dashboards COI ]
```

## 2. Contratos de Interface

### 2.1. Upload & Parser Resiliente (`analysis/parser.js`)
- **Entrada**: Arquivos `.xlsx`, `.xls` ou `.csv` contendo planilhas de Ligações, Ordens de Serviço, Deslocamentos por Conta e Motivos de CUC.
- **Saída**: Objeto JSON normalizado contendo metadados de colunas, contagem de linhas e amostras validadas.

### 2.2. Inferência Semântica por IA (`server/ai-inference.js`)
- **Entrada**: Amostras de dados limpas e dicionário de domínios Sigware.
- **Saída**: Classificação semântica de colunas, detecção de anomalias e sugestões de KPIs para o painel.

### 2.3. Persistência (`server/db.js`)
- **Garantias**: Uso de transações atômicas (`BEGIN IMMEDIATE`), padrão Outbox para eventos de telemetria e isolamento estrito de dados.

### 2.4. Renderizador Dinâmico (`dashboard.js`)
- **Entrada**: Dados persistidos e estruturados.
- **Saída**: Renderização de widgets dinâmicos de COI com navegação nativa e suporte a exportação.
