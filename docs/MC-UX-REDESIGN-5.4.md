# Power BI MC — Estudo de UI/UX e Renovação Visual v5.4

**Projeto:** PowerBI Completo MC / Michelle Cândido  
**Data:** 14-10-2026  
**Escopo:** arquitetura de informação, navegação, responsividade, hierarquia de dashboards, microinterações, acessibilidade e consistência visual.  
**Natureza:** revisão de apresentação existente; não altera regras de negócios, banco, arquivos enviados, IA, autenticação ou permissões do servidor.

## 1. Diagnóstico do modelo anterior

A inspeção do código-fonte da branch `railway-power-bi-michelle` encontrou:

- Navegação dividida entre itens principais, departamentos, gestão de dados e recursos, mas com repetições de caminhos como setores, importações e relatórios.
- Oito departamentos competindo visualmente com as ações globais no menu.
- Indicadores prioritários, blocos de análise e setores apresentados com muitas superfícies semelhantes, reduzindo a clareza da hierarquia.
- Layout mobile existente, porém com oportunidade de melhorar ordem e densidade de leitura em telas compactas.
- Dashboard interativo e importação automática já implementados, que precisam ser preservados e não recriados.

**Princípio:** o usuário deve reconhecer onde está, identificar o resultado importante e concluir a próxima ação com o mínimo possível de procura.

## 2. Arquitetura de informação revisada

```text
Power BI MC
├── Visão e dados
│   ├── Início
│   ├── Dashboard
│   └── Setores (visão geral)
├── Arquivos
│   ├── Importar planilhas
│   ├── Biblioteca de arquivos (por permissão)
│   ├── Exportar análises (por permissão)
│   └── Colaboradores (proprietária)
├── Análises e resultados
│   ├── Insights e análises
│   ├── Relatórios
│   └── Apresentações
├── Departamentos (grupo expansível)
│   ├── COI
│   ├── Facilities
│   ├── RH
│   ├── Comercial
│   ├── Técnico
│   ├── Implementação
│   ├── Qualidade
│   └── Portaria Remota
├── Preferências
│   └── Configurações
└── Recursos
    ├── Instalar aplicativo
    └── Abrir Copiloto (por permissão)
```

A abertura dos departamentos é opcional e continua acessível a teclado. A visualização individual respeita o escopo setorial já exposto pelo aplicativo. A página inicial e o diretório de setores seguem o mesmo filtro visual.

## 3. Diretrizes profissionais de design aplicadas

### Hierarquia e sofisticação

1. Informar a localização e o objetivo da página com um título inequívoco.
2. Priorizar informações de decisão e ações centrais; depois mostrar detalhes.
3. Aumentar espaçamento ENTRE seções sem desperdiçar espaço DENTRO de cada componente.
4. Usar superfícies independentes apenas quando representam decisões ou indicadores autônomos. Não empilhar cards por hábito.
5. Evitar animações decorativas: manter microinterações curtas e reduzir movimento quando solicitado pelo sistema.

### Dados e gráficos

- Preservar período, unidade e origem dos indicadores existentes.
- Manter tabelas para busca de valores exatos e gráficos para tendência/comparação.
- Melhorar a leitura de KPI, títulos de widgets, filtros, tabelas e rótulos.
- Jamais apresentar dado fictício como dado real ou insinuar que os arquivos importados são PBIX nativos.
- Não alterar transformação, filtros, agregações, relatórios, consultas ou inferência de IA nesta revisão visual.

### Cores e tipografia

- Cor de marca **#38BDF8** em botões, destaques e elementos gráficos.
- Em fundos claros, textos pequenos utilizam azul mais profundo, por contraste, sem mudar a cor principal da marca.
- Em fundos escuros, realces legíveis e superfícies grafite.
- Rosa da identidade Michelle mantido como cor secundária.
- Fonte atual Plus Jakarta Sans/Inter preservada; escala mais clara entre rótulo, número e título.

### Mobile e desktop

- Mobile: uma coluna para setores e prioridades, botões utilizáveis por toque, margens adequadas e sem interferir com navegação inferior.
- Desktop: colunas de comparação, sidebar categorizada e uso eficiente da área útil.
- Larguras de referência para QA: 320, 360, 390, 430, 768, 1024 e 1440 pixels, além de janela estreita, zoom e teclado.

## 4. Implementação v5.4

| Arquivo | Escopo |
|---|---|
| `app.js` | Reorganização semântica da navegação, detalhes expansíveis, busca mais clara, títulos de contexto, exposição setorial coerente com acesso |
| `mc-experience.css` | Camada visual isolada com tokens, refinamento de cabeçalho, hero, KPIs, diretório, importação, dashboard, mobile, acessibilidade e redução de movimento |
| `index.html` | Carregamento da nova camada CSS por último; nova referência de cache para app.js e identificação v5.4 |

## 5. Evidência de revisão e limitações

**Verificações do código:** compilação sintática de `app.js`, presença das rotas de navegação, dos controles de upload e da lógica de permissões; presença e precedência de `mc-experience.css`; chaves de cor e alinhamento de chaves CSS.

**A serem confirmados visualmente no navegador autenticado:** estados com e sem dados, expansão da lista de setores, cabeçalhos longos, mobile 320–430 px, abertura de chat, menu lateral em telas estreitas, importação de múltiplas planilhas, impressão e zoom. A aprovação dessas experiências não é presumida por uma implantação bem-sucedida.

**Não houve mudança de comportamento de backend.** Identidade e acesso permanecem governados por mecanismos já existentes.

## 6. Fontes do estudo

- Nielsen Norman Group, *Visual Hierarchy in UX*: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- Android Developers, *Layouts and navigation patterns*: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*: https://www.w3.org/TR/WCAG22/
- Manuais internos de UI/UX, Frontend e Backend da Horizon App Factory (12-10-2026).

## 7. Próxima evolução possível, não implementada nesta etapa

Auditoria autenticada com screenshots e testes de tarefa; estudo com usuários; revisão de estados sem dados, erro, offline e carregamento; inventário completo de design tokens; mapeamento de rótulos de cada planilha aos componentes do dashboard; testes automatizados visuais.
