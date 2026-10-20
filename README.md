# PowerBI Completo MC

Aplicativo operacional de Michelle Cândido. A interface e os cinco modelos de apresentação existentes foram preservados e integrados a um fluxo de dados real.

## Funcionamento

### Importar, entender, visualizar e excluir

1. Em **Enviar Dados Excel**, selecione ou arraste os arquivos XLSX, XLS ou CSV. É possível enviar vários de uma vez.
2. A janela **Importar e ler** explica o tipo de planilha reconhecido, a confiabilidade da interpretação, a aba, as colunas associadas e a prévia dos registros. O nome do arquivo e o da aba auxiliam a identificar planilhas de ligações, OS, CUC ou deslocamentos quando os cabeçalhos são genéricos. A identificação por colunas prevalece sobre nomes conflitantes.
3. Clique em **Confirmar importação**. Datas e informações originais são preservadas; período e associação de colunas continuam opcionais e precisam de conferência quando houver dúvida.
4. Clique em **Visualizar dashboard** para abrir os indicadores atualizados com filtros. **Gerar relatório** fornece visão para exportar; **Gerar e criar apresentação** abre o Estúdio.
5. Para retirar um arquivo de todos os cálculos, clique em **Excluir arquivo** na lista de importados. O item poderá ser recuperado em **Arquivos excluídos → Restaurar arquivo**.

Todos os números exibem a unidade ou a definição da medida. Nos cartões do dashboard, **Fonte** mostra arquivo e aba, e **Como este número foi obtido** detalha a operação e as colunas associadas quando identificadas. Gráficos e rankings trazem legenda da unidade e a tabela de registros mostra o tipo de quantidade ao lado do valor. Se fontes de unidades diferentes forem visualizadas em conjunto, os gráficos da visão geral contam linhas, sem somar eventos, deslocamentos e registros como uma única métrica.

O título do aplicativo é **PowerBI Completo MC** e símbolo de indicadores próprio em SVG. Os dados não dependem de arquivos PBIX; a integração com o serviço Microsoft Power BI é opcional e exige um relatório existente publicado com permissões próprias.


- Excel XLSX/XLS e CSV: seleção de arquivos abre a janela **Importar e ler**, com tipo, aba detalhada, prévia das colunas originais e datas detectados automaticamente. Basta confirmar. Aba, associação de colunas, destino e competência são ajustes opcionais. Original e histórico são preservados.
- Arquivos idênticos são bloqueados. Sobreposição exige escolha explícita entre atualizar o mesmo período ou acumular. Ordens de serviço são reconciliadas por setor, empresa e número. Arquivar um lote retira seus dados dos cálculos e permite reativação.
- Totais de CUC e deslocamentos usam as quantidades da fonte. Dados sem dia podem ser importados sem preencher datas. Aparecem no histórico completo; não recebem datas fictícias e ficam fora dos filtros por data. Quando uma competência é informada, entram somente em recortes que a abrangem inteira. Cancelamentos e ligações não atendidas ficam separados das pendências.
- Indicadores, tabelas, gráficos e insights determinísticos usam os dados ativos. A inteligência analítica distingue registros de telefonia, OS, quantidades de CUC e deslocamentos; reconhece unidades de duração, calcula cobertura e concentração, e mostra evidência e limites. Cliente é preservado separado de Nome/ramal. Campos originais, arquivo, aba e linha podem ser consultados no dashboard. Metas são configuradas pelo usuário. Limitações de status, datas e cobertura são informadas.
- **Visualizar dashboard** abre uma página analítica independente do Estúdio: filtros por setor, fonte, status, período e busca; gráficos com seleção por toque; exportação do recorte e detalhamento paginado. Personalizar permite escolher indicadores e blocos, reorganizar e ajustar larguras. A composição e os filtros são preservados. Há ampliação de 80% a 150%, foco individual em cada gráfico e tela cheia, com tela dedicada quando o navegador não permite Fullscreen API. No celular, os blocos ficam empilhados e os controles se adaptam desde 320 px.
- **Cruzamento de contas** agrega OS e deslocamentos por empresa + conta antes de relacionar. Havendo competência, exige abertura da OS dentro do período; sem datas, mostra somente correspondência de identidade, com aviso explícito de que os períodos não foram comparados. Totais de lotes sobrepostos são bloqueados. Não usa telefone como código de conta, não vincula CUC a clientes e não afirma causa ou SLA.
- **COI** tem entrada própria com botões para importar no destino COI e visualizar seu dashboard. **Excluir arquivo** retira o lote de todas as consultas ativas; **Arquivos excluídos → Restaurar arquivo** recupera o original e seus dados.
- **Conectar Microsoft Power BI** aceita o link seguro de incorporação de um relatório existente (`app.powerbi.com/reportEmbed`), preserva a autenticação Microsoft e oferece o relatório nativo, seus filtros e suas páginas no dashboard. A conexão é opcional e separada das planilhas importadas.
- Relatórios são gerados como um resultado consistente. A exportação XLSX contém os mesmos registros e indicadores. Filtros e novas importações invalidam o resultado anterior.
- Estúdio: cinco modelos, seleção de dados/indicadores, insights após os dados, seis temas (Grafite padrão), personalização, elementos adicionais e posicionamento por arraste, setas ou coordenadas. Componentes do modelo podem ser posicionados, mas não excluídos.
- Biblioteca unificada de apresentações criadas e importadas; salvamento automático, edição, reabertura e backup completo.
- PowerPoint PPTX: leitura real de OOXML, textos, formas, imagens comuns, tabelas e gráficos com valores armazenados; reprodução como slides SVG. O arquivo original é preservado e pode ser baixado.
- TV: apenas slides, proporção preservada, transições, Fullscreen API quando permitida e navegação por teclado. Direita/Espaço/Enter avançam; esquerda/Backspace retornam; Esc sai.

## Armazenamento — versão Railway

Esta branch usa autenticação individual no servidor, PostgreSQL para registros e um bucket privado para os arquivos originais. O catálogo, as abas importadas e os indicadores são compartilhados conforme as permissões e os setores de cada conta. Os arquivos enviados são mantidos na nuvem até serem excluídos. Os novos originais ficam no bucket privado do projeto, na pasta `power-bi-mc/arquivos-enviados/originais/`. A chave completa fica no catálogo; originais anteriores continuam sendo lidos e excluídos pelas suas chaves existentes. Não há prazo automático de expiração de arquivos ativos no aplicativo.

### Biblioteca de arquivos (v5.1)

- **Enviar arquivo**, **Biblioteca de arquivos**, **Exportar análises**, **Colaboradores**, aparência, instalação e Copiloto ficam na barra lateral. O cabeçalho contém a identificação do aplicativo e o controle do menu móvel.
- A tela inicial também possui um botão **Biblioteca de arquivos**, sem card de biblioteca. Ele abre uma janela **Arquivos enviados** dentro do próprio painel.
- Cada linha permite abrir/baixar o original conforme permissão e marcar sua exclusão. **Excluir tudo** marca todos os arquivos que a conta pode excluir. **Desfazer** recupera uma marcação antes de salvar.
- **Salvar** confirma as exclusões. Fechar pelo X, por Escape ou pelo fundo com alterações pendentes pede confirmação de descarte. Falha do servidor conserva o rascunho.
- O servidor remove o catálogo e todas as abas relacionadas em uma transação, atualizando os indicadores. A conta precisa da permissão **Excluir arquivos e seus dados do painel**; a administradora já a possui. Colaboradores não podem excluir um original compartilhado com um setor fora de seu acesso.
- A limpeza dos objetos excluídos é retentável. Cada novo envio tem chave própria, para uma exclusão antiga não apagar uma reimportação posterior do mesmo conteúdo.
- A versão escura da logo fornecida e o recorte com transparência real aparecem em cabeçalho, lateral, login, recuperação, favicon e instalação. Os JPGs fornecidos permanecem preservados na branch original.

## Limites explícitos

O Copiloto usa exclusivamente a API Groq pelo backend autenticado de produção, com chave somente no servidor. O modelo padrão é `openai/gpt-oss-120b` (Groq); a chave é `API_IA_GROQ` e o nome pode ser personalizado com `GROQ_MODEL`. Sem `API_IA_GROQ` ou backend disponível, a conversa geral indica indisponibilidade; consultas operacionais podem usar o motor local, claramente identificado. Interpretações de planilhas geradas por IA exigem confirmação. Veja [manual completo do Copiloto](docs/copiloto.md) para configuração, prompt, privacidade e limites.

O dashboard de planilhas é uma implementação deste aplicativo; ele não cria arquivos PBIX nem envia dados ao Microsoft Power BI. O modo nativo depende do link de um relatório publicado no serviço, das permissões e do licenciamento do usuário. O layout interno no celular depende do relatório original. A incorporação segue a [documentação oficial da Microsoft](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure); não recebe tokens de acesso no formulário e não amplia permissões de visualização.

A renderização de PPTX é local, não é o motor do Microsoft PowerPoint. Fontes, quebras de linha, estilos de gráficos e algumas formas podem variar. Gradientes usam a primeira cor; SmartArt, mídias incorporadas, imagens EMF/WMF e animações internas não têm reprodução completa. O aplicativo apresenta avisos sobre essas limitações. Os originais permanecem intactos. Não há promessa de fidelidade visual para todos os arquivos.

## Envio de arquivos e aparência

A Visão Geral começa com o Dashboard central. O botão **Adicionar dados** abre o fluxo real de importação de uma ou mais planilhas. Insights, indicadores, gráficos e atalhos por setor ficam reunidos no dashboard; o Estúdio e a atividade recente aparecem depois. Os insights continuam sendo o primeiro conteúdo após os títulos do dashboard.

O quadro aceita vários arquivos por seleção ou arrastar e soltar. A confirmação na janela processa cada planilha independentemente e mantém erros visíveis para correção. A área de arquivos importados preserva nome, linhas, destino, datas disponíveis, consulta, original e exclusão, inclusive após recarregar. Logo abaixo ficam **Gerar relatório**, **Visualizar dashboard** e **Gerar e criar apresentação**. O último cria uma nova apresentação e preserva as anteriores.

A identificação no cabeçalho, menu e rodapé é “PowerBI Completo MC”, sem logotipos ou créditos de desenvolvimento. O favicon, os ícones de atalho e a imagem de compartilhamento usam um símbolo neutro de indicadores. A paleta escura usa preto e cinza neutro, branco e azul celeste nas ações. O modo escuro é o padrão para novos acessos; preferências já salvas são preservadas. O modo claro/escuro é persistido, a navegação móvel respeita a área segura e o menu pode ser fechado por botão ou Esc. Os resumos de insights usam três colunas no computador e uma no celular, com tipografia e foco de teclado consistentes. A aparência do aplicativo não modifica os temas das apresentações. A busca de registros fica no menu e está disponível também no celular, com indicação do filtro ativo e ação para limpar.

O manifesto e os ícones próprios oferecem instalação em navegadores compatíveis. Nesta versão Railway, arquivos e dados operacionais são armazenados na nuvem; o service worker não guarda páginas autenticadas, respostas de API nem arquivos privados em cache offline. Instalar o aplicativo não altera o armazenamento dos arquivos. As referências de design usadas são as diretrizes oficiais de [modo escuro da Apple](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [layouts adaptáveis do Android](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes), [papéis de cores do Material Design](https://m3.material.io/styles/color/roles) e [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Contextos e acesso

O seletor de experiências foi retirado da interface. **Direção** não é mais uma opção; preferências antigas caem no contexto de **Gestão** sem apagar layouts salvos. Os contextos internos restantes são Gestão, Supervisão e Ronda / Vigia; eles organizam leitura e widgets, não concedem acesso. Contas, setores e permissões são aplicados no backend, separadamente desses contextos. Não há função de ronda/GPS criada por essa nomenclatura no painel BI.

## Código e testes

`app.js` mantém navegação, páginas, gráficos e assistente. `dashboard.js` e `dashboard.css` implementam a análise interativa e a incorporação opcional do Power BI. `data-core.js` concentra normalização, cálculos e persistência. `data-intelligence.js` define interpretação de colunas, perfis de cobertura, cruzamentos e insights explicáveis. `studio.js` mantém os modelos e a edição. `pptx.js` lê PowerPoint. Bibliotecas de produção ficam em `vendor/`, com suas licenças; não há instalação necessária para usar o painel por HTTPS ou localhost.

Para executar os testes:

```sh
npm ci
npm test
```

A suíte de testes cobre leitura semântica, unidades de tempo, dados sem datas, cruzamentos temporais e de identidade, isolamento de empresas/contas, exclusão e restauração, confirmação em janela e atalhos, além de importação, totais/status, datas e competência, deduplicação/versionamento, filtros, geração/exportação de relatórios, persistência, composição do dashboard, tela cheia e sua alternativa, validação e persistência do link Power BI, edição/posicionamento de slides, teclado e leitura de um PPTX real com imagem e gráfico. O armazenamento e o DOM são exercitados com fake-indexeddb e jsdom. A conferência visual em navegador inclui 320 px sem transbordamento horizontal e a tela dedicada do dashboard. Um relatório nativo real não pôde ser validado sem seu link e acesso Microsoft.

`tests/responsive.html` exibe o aplicativo real em janelas de 390 × 844 e 1280 × 900, com seletores de largura entre 320 e 1600 px para conferência visual. Reabrir essa página carrega a versão atual do painel nos quadros de teste. A apresentação de teste não contém dados de clientes. As planilhas operacionais usadas na reconciliação permanecem fora deste repositório público.

## GitHub Pages independente (prévia e testes)

- **Ambiente de desenvolvimento:** https://danielnep.github.io/michelle-preview/ apresenta a interface atual da `main`, sem redirecionamento para o servidor de produção.
- **Ambiente entregue ao cliente:** o servidor Railway/serviço conectado pode continuar na versão implantada anterior até uma publicação autorizada e bem-sucedida. Deploys, domínio e autenticação do cliente são independentes do Pages.
- Na prévia, `MCStore` usa somente IndexedDB do navegador, com importação local de planilhas, cálculos, gráficos e testes de UI. **Não acessa contas, arquivos nem API privada de produção**, nem compartilha os dados importados com o cliente.
- A IA generativa não roda no GitHub Pages sem um backend próprio: o chat informa indisponibilidade e as respostas operacionais podem recorrer aos cálculos locais. Nenhuma credencial Groq é exposta ao navegador; o Copiloto do servidor usa a chave `API_IA_GROQ`.
- A biblioteca da prévia lista, abre, baixa e remove apenas arquivos do próprio navegador. Limpar os dados do site apaga esse armazenamento local.
- Mudanças na `main` publicam a prévia pelo GitHub Pages, sem obrigar novo deploy de produção.

## Agente de planilhas independentes (prévia em revisão)

O bloco **Entendimento das planilhas** do dashboard apresenta um inventário separado por arquivo e aba, com tipos de colunas, período e origem, antes de qualquer comparação. O botão **Planejar dashboard com IA** envia somente metadados de até 12 fontes ativas para o Copiloto, sem valores originais. O modo \`plan\` da função servidor sugere indicadores, gráficos, independência, complementaridade e sobreposição, sempre como hipóteses revisáveis. Após confirmação, o aplicativo pode aplicar a **ordem dos blocos existentes** e exibir **indicadores calculados individualmente por fonte** (contagem, soma, média e distintos, quando colunas e unidades permitirem), sem fusão de dados ou publicação no Microsoft Power BI.

A seleção de arquivos XLSX/XLS agora enumera suas abas separadamente. Cada aba de dados é tratada como fonte independente, com revisão e confirmação antes de salvar. Abas chamadas **Resumo**, **Consolidado** ou equivalentes ficam inicialmente desmarcadas quando existem abas detalhadas, mas podem ser incluídas manualmente após conferência. CSV permanece com uma única aba. A importação não executa relações ou somas entre abas. Para arquivos acima do limite da prévia do agente, analisar em lotes. O planejamento remoto exige que a API protegida esteja publicada no servidor e que `API_IA_GROQ` esteja configurada. Sem conexão, o botão informa indisponibilidade. O aplicativo ainda não cria PBIX nem faz treinamento/fine-tuning de modelo.


### Visualização tipo BI para múltiplas fontes

No dashboard, use as abas **Visão geral** e **Explorar fontes**. Em Explorar fontes, cada arquivo/aba tem um espaço próprio, com contagem de linhas, cobertura de datas, lista de colunas e gráficos verificáveis de categorias e datas, além de tabela acessível. Não há cruzamento implícito. O layout possui navegação lateral no desktop e seletor horizontal no celular, com foco em leitura sem excesso de cartões. A IA propõe planos, mas os gráficos básicos são calculados no navegador mesmo sem a API. As recomendações e indicadores adicionais dependem do clique explícito em **Planejar dashboard com IA** e da função servidor publicada.
