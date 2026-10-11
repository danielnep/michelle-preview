# Power BI painel completo / Michelle Cândido

Aplicativo operacional de Michelle Cândido. A interface e os cinco modelos de apresentação existentes foram preservados e integrados a um fluxo de dados real.

## Funcionamento

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

## Armazenamento

Não existe backend neste repositório. Dados, apresentações e originais ficam no IndexedDB do navegador, no dispositivo e no endereço utilizados. Atualizar a página conserva o conteúdo. Para transferir entre dispositivos ou guardar uma cópia externa, use **Exportar backup completo** e **Restaurar backup** em Enviar Dados Excel. Limpar os dados do navegador remove esse armazenamento.

Importações e apresentações antigas do localStorage são migradas sem apagar a cópia anterior. Importações antigas precisam ser reconferidas quando sua normalização original perdeu informações.

## Limites explícitos

A conversa com IA externa aguarda integração. As análises operacionais e as consultas locais funcionam sem essa integração.

O dashboard de planilhas é uma implementação deste aplicativo; ele não cria arquivos PBIX nem envia dados ao Microsoft Power BI. O modo nativo depende do link de um relatório publicado no serviço, das permissões e do licenciamento do usuário. O layout interno no celular depende do relatório original. A incorporação segue a [documentação oficial da Microsoft](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure); não recebe tokens de acesso no formulário e não amplia permissões de visualização.

A renderização de PPTX é local, não é o motor do Microsoft PowerPoint. Fontes, quebras de linha, estilos de gráficos e algumas formas podem variar. Gradientes usam a primeira cor; SmartArt, mídias incorporadas, imagens EMF/WMF e animações internas não têm reprodução completa. O aplicativo apresenta avisos sobre essas limitações. Os originais permanecem intactos. Não há promessa de fidelidade visual para todos os arquivos.

## Envio de arquivos e aparência

A Visão Geral começa com o Dashboard central. O botão **Adicionar dados** abre o fluxo real de importação de uma ou mais planilhas. Insights, indicadores, gráficos e atalhos por setor ficam reunidos no dashboard; o Estúdio e a atividade recente aparecem depois. Os insights continuam sendo o primeiro conteúdo após os títulos do dashboard.

O quadro aceita vários arquivos por seleção ou arrastar e soltar. A confirmação na janela processa cada planilha independentemente e mantém erros visíveis para correção. A área de arquivos importados preserva nome, linhas, destino, datas disponíveis, consulta, original e exclusão, inclusive após recarregar. Logo abaixo ficam **Gerar relatório**, **Visualizar dashboard** e **Gerar e criar apresentação**. O último cria uma nova apresentação e preserva as anteriores.

A identificação no cabeçalho, menu e rodapé é “Power BI painel completo / Michelle Cândido”, sem logotipos ou créditos de desenvolvimento. O favicon, os ícones de atalho e a imagem de compartilhamento usam um símbolo neutro de indicadores. A paleta escura usa preto e cinza neutro, branco e azul celeste nas ações. O modo escuro é o padrão para novos acessos; preferências já salvas são preservadas. O modo claro/escuro é persistido, a navegação móvel respeita a área segura e o menu pode ser fechado por botão ou Esc. Os resumos de insights usam três colunas no computador e uma no celular, com tipografia e foco de teclado consistentes. A aparência do aplicativo não modifica os temas das apresentações. A busca de registros fica no menu e está disponível também no celular, com indicação do filtro ativo e ação para limpar.

O manifesto fornece o nome e os ícones para atalhos do sistema. Ele não adiciona funcionamento offline. As referências de design usadas são as diretrizes oficiais de [modo escuro da Apple](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [layouts adaptáveis do Android](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes), [papéis de cores do Material Design](https://m3.material.io/styles/color/roles) e [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Código e testes

`app.js` mantém navegação, páginas, gráficos e assistente. `dashboard.js` e `dashboard.css` implementam a análise interativa e a incorporação opcional do Power BI. `data-core.js` concentra normalização, cálculos e persistência. `data-intelligence.js` define interpretação de colunas, perfis de cobertura, cruzamentos e insights explicáveis. `studio.js` mantém os modelos e a edição. `pptx.js` lê PowerPoint. Bibliotecas de produção ficam em `vendor/`, com suas licenças; não há instalação necessária para usar o painel por HTTPS ou localhost.

Para executar os testes:

```sh
npm ci
npm test
```

Os trinta testes cobrem leitura semântica, unidades de tempo, dados sem datas, cruzamentos temporais e de identidade, isolamento de empresas/contas, exclusão e restauração, confirmação em janela e atalhos, além de importação, totais/status, datas e competência, deduplicação/versionamento, filtros, geração/exportação de relatórios, persistência, composição do dashboard, tela cheia e sua alternativa, validação e persistência do link Power BI, edição/posicionamento de slides, teclado e leitura de um PPTX real com imagem e gráfico. O armazenamento e o DOM são exercitados com fake-indexeddb e jsdom. A conferência visual em navegador inclui 320 px sem transbordamento horizontal e a tela dedicada do dashboard. Um relatório nativo real não pôde ser validado sem seu link e acesso Microsoft.

`tests/responsive.html` exibe o aplicativo real em janelas de 390 × 844 e 1280 × 900, com seletores de largura entre 320 e 1600 px para conferência visual. Reabrir essa página carrega a versão atual do painel nos quadros de teste. A apresentação de teste não contém dados de clientes. As planilhas operacionais usadas na reconciliação permanecem fora deste repositório público.
