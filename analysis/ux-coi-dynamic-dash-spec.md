# Especificação de UX/UI: Rota COI de Primeiro Nível, Onboarding Funcional e Dashboards Dinâmicos

## 1. Visão Geral e Contexto Operacional
A rota COI (Centro de Operações Integrado) representa o núcleo analítico e tático do Painel Michelle. Esta especificação define a arquitetura de informação, fluxos de interação, microinterações e representação de dashboards dinâmicos para a tarefa `chat-michelle-sigware-ai-coi-20261018:t7-ux-coi-dynamic-dash` no repositório `danielnep/michelle-preview`.

## 2. Princípios de UI/UX (Redução de Carga Cognitiva)
- **Hierarquia Visual Clara:** O nível superior prioriza alertas críticos do Sigware e métricas agregadas de SLA e CUC, utilizando cartões de status sem elementos decorativos desnecessários.
- **Feedback Contextual Imediato:** Toda ação de filtro, upload ou reprocessamento exibe estados de carregamento em tempo real e toast notifications não obstrutivas.
- **Composição Multi-dispositivo:** Layouts responsivos otimizados para monitores de operação (Desktop 1920x1080+) e visualização tática em tablets.

## 3. Rota COI de Primeiro Nível
- Acesso direto via menu principal com indicador de status de conexão em tempo real.
- Divisão em três painéis lógicos: 
  1. **Tabela Resumo Executivo** (Indicadores de Ordens de Serviço e Deslocamentos).
  2. **Timeline de Eventos Críticos** (Alertas ordenados por severidade e prefixo Sigware).
  3. **Filtros Dinâmicos** por período, equipe e motivo de CUC.

## 4. Empty State com Onboarding Funcional
- Acionado quando nenhuma planilha Sigware foi importada.
- **Componentes:**
  - Ilustração vetorial limpa de alto contraste.
  - Call to Action (CTA) primária e inconfundível: "Importar Planilha Sigware (.xlsx / .csv)".
  - Guia passo a passo em 3 etapas interativas (1. Selecionar arquivo, 2. Validação automática de abas, 3. Visualização COI).

## 5. Atalho na Visão Geral
- Inserção de widget dedicado no dashboard principal (Visão Geral) com atalho de um clique para o COI.
- Mini-gráfico de tendência e contador de pendências operacionais.

## 6. Dashboards Dinâmicos
- Renderização modular baseada no esquema de dados processados pela IA/Parser Sigware.
- Alternância fluida entre visualização analítica (tabelas e filtros avançados) e visualização executiva (cards e gráficos de rosca/barra).
