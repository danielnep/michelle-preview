# Plano técnico de implementação | Painel Michelle 4.0

Data: 11/10/2026
Produto: **Power BI | Painel Completo / Michelle Cândido**
Repositório: `danielnep/michelle-preview`
Objetivo: elevar a compreensão semântica, a inteligência gerencial, a ergonomia móvel, a instalação PWA e a identidade visual MC sem comprometer a integridade dos dados.
Status: **planejamento aprovado para detalhamento; nenhuma funcionalidade deste plano está sendo declarada como implementada**.

## 0. Diagnóstico do estado existente

- `data-core.js` (`MCData`): mapeamento de colunas, identificação por cabeçalho/filename/aba, normalização, parsing, indicadores, filtros, histórico IndexedDB e insights determinísticos.
- `data-intelligence.js` (`MCIntelligence`): semântica para fontes conhecidas, cruzamento OS × deslocamentos por empresa + conta e período, leituras/insights locais.
- `app.js`: seleção, prévia e confirmação de planilhas, exclusão/restauração, assistência local, navegação e setores.
- `dashboard.js`: indicadores, fontes/cálculos, cruzamentos, gráficos, filtros, relatórios e personalização.
- `manifest.webmanifest`: já traz `display: standalone`, `start_url`, `scope` e PNG 192/512. `index.html` já referencia manifest/favicon/apple-touch-icon.
- Não foi encontrado `service-worker.js` ou `sw.js`. Não existe backend no projeto atual; os arquivos e dados ficam no IndexedDB do dispositivo/navegador de origem; não há sincronização entre dispositivos.
- O assistente de conversa livre **não** é IA generativa; a versão atual fornece análises determinísticas locais. Não confundir a inteligência planejada com integração externa já entregue.
- Identidade exigida: **MC**; visual alinhado à linguagem tecnológica branco/azul celeste/azul-prateado da Horizon, mas **sem nome/logo/crédito Horizon na UI da cliente**. Preservar a personalização escura já solicitada.
- Itens planejados para PWA não devem ser confundidos com garantia de que todos os navegadores exibem a mesma barra/status.

## Regras inegociáveis

1. Nunca inventar datas, metas, status, SLA, relações, causalidades, bases estatísticas ou indicadores.
2. Nunca somar unidades incompatíveis nem linhas de relatório a quantidades agregadas; diferenciar data do evento, competência da fonte e data de importação.
3. Preservar metadados de proveniência: arquivo, aba, linha, colunas originais, intervalo, regras e versão da interpretação.
4. Cada inferência deve ser transparente: evidência, premissas, cálculo e confiança calibrada.
5. Confirmação humana quando identificação for incerta ou alteração puder mudar métricas.
6. Manter cópia fiel do arquivo original, exclusão/restauração, relatórios, apresentação/TV, acessibilidade e resposta no desktop.
7. Proteção de dados: análise local por padrão; nenhuma planilha enviada a IA externa sem fluxo de consentimento e infraestrutura seguros. Não expor tokens API no JavaScript cliente.
8. Realizar migrações de esquema não destrutivas; preservar dados já importados, com reversão e testes.
9. Não chamar de Microsoft Power BI nativo um dashboard web customizado; disponibilizar integração opcional quando existir.

## Fase 1 | Inteligência de compreensão e validação dos arquivos

### 1.0 Regra obrigatória: nome do arquivo orienta o tipo e a nomenclatura

**A primeira pista deve ser o nome real do arquivo** (incluindo variações ortográficas, abreviações e plural/singular), antes da análise detalhada. O sistema extrai uma classificação provável, nomes humanos e candidatos a indicadores; em seguida confere com o nome da aba e o conteúdo. O nome **não é prova suficiente** para desconsiderar um conflito.

- `Relatório de ligações.xlsx` → **Ligações**, registros de telefonia, datas/horários/duração/status se existirem. Nome do card: `Ligações registradas` (e `Duração das ligações` somente se disponível).
- `relatorio ordem de serviços.xlsx` → **Ordens de serviço**, `Ordens de serviço registradas`, status e prazos somente com colunas válidas.
- `CONTAS COM MAIOR NUMEROS DE DESLOCAMENTOS.xlsx` → **Deslocamentos por conta**, unidade `deslocamentos`, agregado pela coluna quantitativa, não contar linhas como deslocamentos.
- `motivos de cuc.xlsx` → **Motivos de CUC**, unidade `eventos CUC`, somar a coluna de número de eventos quando presente, não confundir quantidade de motivos/linhas com eventos.
- Nome desconhecido + conteúdo claro → nomear conforme a **coluna semântica confirmada**. Nome genérico + conteúdo incerto → apresentar `Dados não classificados · <arquivo/aba>` e pedir confirmação.
- Usar `label` e `unit` consistentes no card, gráfico, legenda, tabela, insight e exportação. Nunca imprimir `indicador`, `valor` ou `quantidade` isoladamente quando uma denominação específica for disponível.
- Mostrar a trilha de decisão: `Arquivo X → Aba Y → Coluna Z → Unidade U → Indicador T`. Se divergirem, marcar `Verificar identificação` e **não** aceitar automaticamente.
- Preservar o nome original (arquivo/aba) e o nome interpretado separadamente. Se usuária renomear a interpretação, persistir sem modificar o nome do arquivo; manter histórico e opção de rever.
- Testar pontuação, acentos, siglas, espaços duplos, `(1)`, `cópia`, `v2`, extensão XLS/XLSX/CSV e nomes sem indicação semântica.

**Aceite específico:** carregar as quatro planilhas de referência produz corretamente o tipo e o texto dos cards/legendas, com unidades corretas e origem navegável. Teste de conflito entre `Relatório de ligações.xlsx` e colunas de ordens de serviço **não** exibe ligações incorretamente.

### 1.1 Definir contrato interno de análise
Criar módulo `analysis/schema.js` ou compatível com carregamento simples dos scripts existentes; definir `ImportBatch`, `SourceFile`, `Sheet`, `ColumnProfile`, `SemanticField`, `MetricDefinition`, `QualityWarning`, `Provenance`, `InterpretationDecision`.
Campos relevantes: nome/aba/linha, tipo, unidade, agregação, fórmula, período, `nullReasons`, versão do esquema e confiança/justificativa. Não salvar dados pessoais em logs.
Arquivos-base a integrar: `data-core.js`, `data-intelligence.js`, `app.js`, `dashboard.js`.

### 1.2 Criar profiler de arquivo e abas
Criar `analysis/profiler.js`. Antes de classificar, inspecionar todas as abas e primeiras linhas com limite adaptativo; detectar tabelas repetidas, cabeçalho deslocado, rodapés, somatórios, colunas vazias/duplicadas, células mescladas quando a biblioteca disponibilizar metadados.
Perfil por coluna: tipo, nulos, cardinalidade, valores típicos, formatos de data PT-BR, duração, moeda, porcentagens, números com separadores locais, identificadores e valores agregados.
Garantir limites de memória/tempo e importação progressiva para arquivos extensos. Não usar primeiro registro como única fonte.

### 1.3 Classificador semântico com evidências
Criar `analysis/classifier.js` e `analysis/ontology.js`; combinar evidências: arquivo, aba, cabeçalhos, distribuição das células, coocorrência de campos, setor proposto e histórico de confirmação **daquela usuária**.
Definir tipos existentes (OS, ligações, CUC, deslocamentos, indicadores) e expandir só quando houver documentação/testes para o novo tipo.
Retorno padronizado: `candidates`, `predictedType`, `columnRoles`, `unit`, `periodMode`, `evidence[]`, `ambiguityReasons[]`, `confidenceLevel`; confiança por evidência, não porcentagem inventada.
Mostrar conflito entre cabeçalhos e nome, sem sobrescrever decisão anterior silenciosamente.

### 1.4 Validação de qualidade e duplicatas
Criar `analysis/quality.js`: detecta campos exigidos ausentes, datas invalidáveis, linhas vazias, erros numéricos, contradições, duplicatas dentro/entre arquivos e sobreposição de competências; alerta com gravidade e recomendação.
Deduplicação: definir chave composta específica por tipo. Nunca remover linhas automaticamente sem evidência e opção de revisão; salvar decisão e possibilidade de desfazer.
Totais resumidos/subtotais não podem ser contabilizados duas vezes.

### 1.5 Correção assistida e memória local
Atualizar `app.js`: fluxo `Selecionar → Reconhecer → Conferir → Confirmar → Ver painel`. Prévia curta com unidade, período e campo interpretado; edição simplificada para itens incertos; lista de importações, exclusão/restauração mantidas.
Guardar mapeamentos confirmados por **assinatura de esquema** (`analysis/preferences.js`) com versão, origem e opção de apagar/reverter. Não “treinar silenciosamente” ou promover uma correção específica a regra universal.

### Critério de conclusão da fase 1
- Identificar as quatro planilhas conhecidas mesmo com cabeçalhos deslocados/alternativos e explicar as colunas escolhidas.
- Arquivo ambíguo exige revisão e não gera indicador falso.
- Datas ausentes não são inventadas e totais por competência não viram série diária.
- Detecção explícita de duplicatas, inconsistências e conflitos.
- Testes com variações e fixtures negativas/casos adversariais, além de histórico legado.

## Fase 2 | Motor analítico gerencial e assistente com evidências

### 2.1 Camada semântica de métricas
Criar `analysis/metrics.js`: catálogo versionado com ID da métrica, tipos aceitos, fórmula, unidade, regra de agregação, granularidade temporal, condições de validade e restrições. Distinguir `count(rows)`, `sum(value)`, taxas válidas, duração e percentuais.
Preservar `data-core.js` / `data-intelligence.js` como compatibilidade até regressão completa.

### 2.2 Motor de análise
Criar `analysis/engine.js` com `comparePeriods`, `concentrations`, `trend`, `qualitySummary`, `outliers`, `bottlenecks` e `crossSources`.
Não comparar períodos incompletos ou bases divergentes como se fossem equivalentes; mostrar ausência de dados ou insuficiência amostral explicitamente.
Limiares de anomalia configuráveis e condicionados a tamanho de amostra; diferenciar observação estatística de causa provável. Não inventar prioridades sem gravidade, meta definida ou evidência.

### 2.3 Objetos de evidência
Criar `analysis/evidence.js`: cada insight retorna título, conclusão, contexto, fontes/abas, filtros, linhas relevantes/IDs, método, limitações, valor/tipo/unidade, `confidenceLevel` e CTA para abrir os registros. Se um vínculo for apenas por nome aproximado, rotular como hipótese e pedir confirmação.

### 2.4 Assistente gerencial auditável
Criar `analysis/queries.js` com interpretação determinística de intenções frequentes: “O que merece atenção?”, “Quais contas concentram deslocamentos?”, “Qual setor teve mais registros?”, “Por que aumentou?”, “Qual arquivo está inconsistente?”, “Compare dois períodos”.
Perguntas fora do escopo devem informar limites; mostrar filtros e origem. “Por que” exige explicitar que correlação não demonstra causa. Integração generativa opcional **futura**: backend autenticado, controles LGPD, retenção mínima, consentimento explícito e provedor/custos configuráveis.

### 2.5 Exposição na UI
Em `dashboard.js` e `app.js`: cards executivos curtos, “Entender este resultado”, filtro visível, drill-down para registro original, classificações de risco apoiadas em dados. Não aumentar densidade visual do mobile.
Compatibilidade com UX mobile planejada na issue #1.

### Critério de conclusão da fase 2
- Todo insight reproduzível a partir de fontes e filtros mostrados.
- Testes de unidades incompatíveis, planilhas mistas, períodos faltantes, duplicidades, denominadores zero, sobreposição e falsos positivos.
- Assistente jamais promete acesso a IA externa sem a integração efetiva.
- Performance aceitável nas quatro amostras reais e datasets maiores simulados.

## Fase 3 | PWA instalável e experiência de aplicativo

### 3.1 Completar instalação existente
Não recriar do zero: `manifest.webmanifest` **já** tem `standalone`, `start_url`, `scope` e PNG 192/512. Validar referências reais, consistência dos ícones e `start_url` sob o subcaminho `/michelle-preview/`; definir `id` estável e metadados de instalação.
Na UI, botão “Instalar aplicativo” apenas quando `beforeinstallprompt` oferecer prompt. Para iOS, exibir passo-a-passo contextual de “Adicionar à Tela de Início”; para navegador sem suporte, oferecer orientação sem falsa promessa. Ocultar convite em `display-mode: standalone`.
Usar `standalone` para esconder UI completa do navegador; a barra do sistema operacional/status pode permanecer e varia conforme plataforma. `minimal-ui` não garante uma barra idêntica em todos.

### 3.2 Service worker com política de atualização e offline honesta
Criar `service-worker.js` com cache versionado, pré-cache apenas do shell e assets essenciais (HTML, CSS, scripts, ícones/bibliotecas locais) e rota offline amigável. Não cachear dados pessoais ou endpoints externos; dados continuam no IndexedDB. Definir invalidação e atualização sem recarregar/importar arquivo a meio do fluxo.
Caso offline, avisar que dados locais podem ser consultados se já disponíveis; APIs/integracões online ficam indisponíveis.

### 3.3 Ajustes da interface instalada
Respeitar safe areas, navigation/status bars, teclado virtual, controle de voltar, viewport pequeno; minimizar cabeçalho duplicado; instalação sem prompt agressivo. Manter botão de backup/exportação e aviso de **dados deste navegador**; instalar não sincroniza os dados automaticamente entre dispositivos.

### Critério de conclusão da fase 3
- Teste de instalação em Chrome Android e desktop; instruções verificadas para iOS Safari.
- Abrir da tela inicial em `standalone` onde suportado.
- Sem elementos escondidos pela barra de sistema/rodapé.
- Offline inicial exibe shell e estado honesto; importação/histórico existentes não se perdem em atualização.
- Validar HTTPS e subcaminho do GitHub Pages.

## Fase 4 | Identidade MC (tarefa artística separada)
Brief: monograma **MC** reconhecível, profissional, minimalista e tecnológico; feminilidade sutil como **35% de suavidade** (curvas, ritmo, equilíbrio) sem estereótipos; estilo da Horizon como linguagem visual, sem assinatura Horizon na interface da cliente. Priorizar tipografia geométrica sob medida e negativo intencional, contraste/acessibilidade.
Criar versões conceituais para avaliação antes de substituir ícone atual; testar 16, 32, 48, 192 e 512 px, claro/escuro, recorte de máscara PWA.
Após aprovação, substituir favicon e PNGs do `manifest.webmanifest`, `apple-touch-icon`, imagem OpenGraph e símbolos internos; limpar cache e ajustar versão de assets.

## Fase 5 | Pacote multi-formato MC (tarefa posterior independente)
Após aprovação da arte, criar mestre vetorial, folha de versões/uso e exportar SVG, PNG (16, 32, 48, 180, 192, 512, 1024), fundo claro/escuro, monocromática, maskable PWA, apple-touch, favicon, preview social e marca símbolo + nome. Gerar documentação `assets/brand/README.md` e garantir consistência cromática e margens de segurança.
Evitar transformar uma imagem raster em “SVG editável” falso; o mestre tem de ser vetorial autêntico.

## Execução sugerida e qualidade
Etapas técnicas: 0) registrar cenários base / testes; 1) contratos e perfil de arquivo; 2) semântica/classificação; 3) validações e memória de correções; 4) métricas e análise; 5) assistente e evidências; 6) PWA; 7) ícone MC; 8) exportação da identidade; 9) regressão final.
Usar **fatias verticais** por recurso (lógica + armazenamento + UI + testes), evitando reescrita integral de `app.js` de uma só vez.
Novos testes em `tests/*.test.cjs` com `node --test`; incluir fixture anonimizada para os quatro formatos, datas PT-BR, números, subtotal, repetição, conflito, arquivo misto e migração. Testar 320/360/390/430/768 px, Chrome Android e Safari iOS. Manter interfaces desktop/TV.
Portões de qualidade por etapa: ① testes existentes continuam verdes, ② nenhum dado legado perdido, ③ explicabilidade auditável, ④ desempenho aceitável, ⑤ verificação manual dos fluxos reais.

## Dependências e limites
- Fases 1 e 2 são sequenciais; PWA pode avançar paralelamente após revisar persistência e atualização; identidade MC deve ser aprovada antes de gerar pacote definitivo.
- Sem backend: não afirmar “aprendizado automático online”, sincronização multiusuário, acesso a arquivos de outros dispositivos ou IA generativa externa.
- Separar integração IA como possível escopo e custo próprio; **não** adicionar chaves externas ao repositório público.
- Evitar custo desnecessário: maximizar compreensão com regras e heurísticas testáveis antes de recorrer a IA externa.

## Fontes técnicas
- MDN PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- web.dev Install criteria: https://web.dev/articles/install-criteria?hl=pt-BR
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

Documento base das tarefas futuras. Não é declaração de código implementado.
