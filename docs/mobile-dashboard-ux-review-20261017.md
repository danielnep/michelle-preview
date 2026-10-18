# Painel Michelle | Melhorias mobile-first (branch de revisão)
Data: 18-10-2026. Base: railway-power-bi-michelle, interface v5.4.0.

## Mudanças propostas e implementadas nesta branch
- Barra compacta de filtros ativos apenas no celular, sem criar outra navegação inferior.
- Cada filtro ativo pode ser removido individualmente pelos controles existentes; ação Limpar tudo reutiliza o fluxo original.
- Botões acessíveis de exportação por gráfico para evolução, status, setores e ranking, usando os valores efetivamente exibidos, inclusive agrupamentos de datas.
- A exportação contextual gera XLSX com título, filtros e valores agregados. Não substitui a exportação geral dos registros nem modifica os cálculos.
- Componentes têm foco visível e alvos de toque de pelo menos 44px; gráficos sem valores não exibem exportação.
- O relatório Microsoft Power BI incorporado continua com seus próprios filtros; os controles locais não são injetados nele.

## Comparação com auditoria
A auditoria pedia filtros visíveis e removíveis, hierarquia compacta, exportação contextual e acessibilidade. Esta revisão atua apenas nesses pontos e preserva a arquitetura de navegação da v5.4.

## Validação
Conferir testes automatizados da branch e testes visuais autenticados em 320, 360, 390 e 430px antes de aprovar. Nenhum deploy foi solicitado ou executado por esta revisão.
