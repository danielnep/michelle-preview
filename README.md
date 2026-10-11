# MC Power BI Painel Completo · Horizon

Aplicativo operacional de Michelle Cândido. A interface e os cinco modelos de apresentação existentes foram preservados e integrados a um fluxo de dados real.

## Funcionamento

- Excel XLSX/XLS e CSV: leitura local, escolha de aba, associação de colunas, setor, tipo e competência; validação por linha; armazenamento do original e histórico.
- Arquivos idênticos são bloqueados. Sobreposição exige escolha explícita entre atualizar o mesmo período ou acumular. Ordens de serviço são reconciliadas por setor, empresa e número. Arquivar um lote retira seus dados dos cálculos e permite reativação.
- Totais de CUC e deslocamentos usam as quantidades da fonte. Dados sem dia exigem competência e só participam dos filtros que abrangem esse período inteiro. Cancelamentos e ligações não atendidas ficam separados das pendências.
- Indicadores, tabelas, gráficos e insights determinísticos usam os dados ativos. Metas são configuradas pelo usuário. Limitações de status, datas e cobertura são informadas.
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

A renderização de PPTX é local, não é o motor do Microsoft PowerPoint. Fontes, quebras de linha, estilos de gráficos e algumas formas podem variar. Gradientes usam a primeira cor; SmartArt, mídias incorporadas, imagens EMF/WMF e animações internas não têm reprodução completa. O aplicativo apresenta avisos sobre essas limitações. Os originais permanecem intactos. Não há promessa de fidelidade visual para todos os arquivos.

## Código e testes

`app.js` mantém navegação, páginas, gráficos e assistente. `data-core.js` concentra normalização, cálculos e persistência. `studio.js` mantém os modelos e a edição. `pptx.js` lê PowerPoint. Bibliotecas de produção ficam em `vendor/`, com suas licenças; não há instalação necessária para abrir o painel por HTTP/HTTPS.

Para executar os testes:

```sh
npm ci
npm test
```

Os nove testes cobrem importação, totais/status, datas e competência, deduplicação/versionamento, filtros, geração/exportação de relatórios, persistência, edição/posicionamento de slides, teclado e leitura de um PPTX real com imagem e gráfico. O armazenamento e o DOM são exercitados com fake-indexeddb e jsdom. Testes de layout e tela cheia em navegador devem ser registrados separadamente; estes testes não substituem uma validação visual.

`tests/responsive.html` exibe o aplicativo real em janelas de 390 × 844 e 1280 × 900 para conferência visual. A apresentação de teste não contém dados de clientes. As planilhas operacionais usadas na reconciliação permanecem fora deste repositório público.
