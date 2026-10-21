const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../analysis/ai-question-evidence.js');
const files=[{id:'a',name:'Receita.xlsx',sheet:'Outubro'},{id:'b',name:'Receita.xlsx',sheet:'Outra empresa'}];
const row=(id,raw)=>({lotId:id,type:'geral',raw});
const metric=(data,id,column,operation)=>data.metrics.find(m=>m.sourceId===id&&m.column===column&&m.operation===operation);

test('evidência financeira preserva seleção, histórico e independência das abas',()=>{
 const all=[row('a',{Faturamento:'R$ 100,00',CPF:'12345678901'}),row('a',{Faturamento:'R$ 200,00'}),row('b',{Faturamento:'R$ 900,00'})];
 const e=E.build(all.slice(0,1),all,files,'Qual o faturamento total do histórico?');
 assert.equal(metric(e.selectedData,'a','Faturamento','sum').value,100);
 assert.equal(metric(e.allData,'a','Faturamento','sum').value,300);
 assert.equal(metric(e.allData,'b','Faturamento','sum').value,900);
 assert.equal(metric(e.allData,'a','Faturamento','sum').unit,'R$');
 assert.equal(metric(e.allData,'a','Faturamento','sum').coverage,2);
 assert.equal(e.allData.sources[0].sheet,'Outubro');
 assert.equal(e.allData.metrics.some(m=>m.operation==='sum'&&m.value===1200),false);
 assert.doesNotMatch(JSON.stringify(e),/12345678901|CPF/);
});
test('coluna numérica que aparece depois da primeira linha conserva cobertura ausente',()=>{
 const all=[row('a',{Categoria:'A'}),row('a',{Categoria:'B',Faturamento:'R$ 230,50'}),row('a',{Faturamento:'R$ 0,00'})];
 const e=E.build(all,all,files,'Qual faturamento?');
 const m=metric(e.allData,'a','Faturamento','sum');
 assert.equal(m.value,230.5);assert.equal(m.coverage,2);assert.equal(m.rows,3);
 const column=e.allData.sources[0].columns.find(c=>c.column==='Faturamento');
 assert.equal(column.missing,1);assert.equal(column.numeric,2);
});
test('taxas e saldos recebem médias observadas e nunca totais acumulados',()=>{
 const all=[0,10,20].map((n,i)=>row('a',{Taxa:n+'%',Saldo:'R$ '+[5,10,15][i]+',00'}));
 const e=E.build(all,all,files,'Qual a taxa média e o saldo?');
 assert.equal(metric(e.allData,'a','Taxa','average').value,10);
 assert.equal(metric(e.allData,'a','Saldo','average').value,10);
 assert.equal(e.allData.metrics.some(m=>m.operation==='sum'),false);
});
test('colunas financeiras incompatíveis não geram soma parcial disfarçada de total',()=>{
 const all=[row('a',{Receita:'R$ 1.234,56'}),row('a',{Receita:'não apurado'}),row('a',{Receita:''})];
 const e=E.build(all,all,files,'Qual a receita?');
 assert.equal(e.allData.metrics.length,0);
 const col=e.allData.sources[0].columns[0];
 assert.equal(col.invalid,1);assert.equal(col.missing,1);assert.equal(col.numeric,1);
 assert.equal(col.compatible,false);
 assert.doesNotMatch(JSON.stringify(e),/não apurado|1\.234,56/);
});
test('pergunta numérica sobre identificador não autoriza calcular nem enviar seus valores',()=>{
 const all=[row('a',{'CPF Faturamento':'12345678901',Telefone:'31999999999'})];
 const e=E.build(all,all,files,'Qual total CPF faturamento e telefone?');
 assert.equal(e.allData.metrics.length,0);assert.equal(e.allData.sources.length,0);
 assert.doesNotMatch(JSON.stringify(e),/12345678901|31999999999/);
});
test('entidades arquivadas não entram e pergunta vazia não amplia o contexto',()=>{
 const all=[row('a',{Faturamento:100}),row('b',{Faturamento:900})];
 const e=E.build(all,all,[files[0],{...files[1],archived:true}],'Faturamento total');
 assert.equal(e.allData.sources.length,1);
 assert.equal(E.build(all,all,files,'').allData.metrics.length,0);
});

test('parse monetário pt-BR mantém zeros e recusa unidades contraditórias',()=>{
 const all=[row('a',{Faturamento:'R$ 1.234,56'}),row('a',{Faturamento:'R$ 0,00'}),row('a',{Faturamento:'R$ -34,56'})];
 const e=E.build(all,all,files,'Qual faturamento total?');
 assert.equal(metric(e.allData,'a','Faturamento','sum').value,1200);
 assert.equal(metric(e.allData,'a','Faturamento','sum').coverage,3);
 const bad=[row('a',{Faturamento:'R$ 100,00'}),row('a',{Faturamento:'50%'})];
 const result=E.build(bad,bad,files,'Qual faturamento?');
 assert.equal(result.allData.metrics.length,0);
 assert.equal(result.allData.sources[0].columns[0].mixedUnits,true);
});
test('overflow não vira indicador não finito nem célula nula silenciosa',()=>{
 const all=[row('a',{Faturamento:1e308}),row('a',{Faturamento:1e308})];
 const e=E.build(all,all,files,'Qual faturamento?');
 assert.ok(e.allData.metrics.every(m=>Number.isFinite(m.value)));
 assert.equal(metric(e.allData,'a','Faturamento','sum'),undefined);
});

test('fonte citada e operação pedida vêm primeiro para resistir ao orçamento de contexto',()=>{
 const sources=[{id:'a',name:'Operação Norte.xlsx',sheet:'Base'},{id:'b',name:'Faturamento Sul.xlsx',sheet:'Outubro'}];
 const all=[row('a',{Faturamento:'R$ 100,00'}),row('b',{Faturamento:'R$ 200,00'})];
 const e=E.build(all,all,sources,'Qual o total de faturamento em Faturamento Sul.xlsx?');
 assert.equal(e.allData.sources[0].sourceId,'b');
 assert.equal(e.allData.metrics[0].sourceId,'b');
 assert.equal(e.allData.metrics[0].operation,'sum');
 assert.equal(e.allData.metrics[0].value,200);
 assert.equal(E.build(all,all,sources,'Qual o maior faturamento?').allData.metrics[0].operation,'max');
 assert.equal(E.build(all,all,sources,'Qual a média de faturamento?').allData.metrics[0].operation,'average');
});
test('serial de data ou competência não vira medida, mas custo por dia continua analisável',()=>{
 const all=[row('a',{Data:45000,Competência:202610,'Hora de entrada':0.5,'Custo por dia':'R$ 10,00'})];
 const e=E.build(all,all,files,'Qual total de data, competência, hora de entrada e custo por dia?');
 assert.equal(e.allData.metrics.some(m=>['Data','Competência','Hora de entrada'].includes(m.column)),false);
 assert.equal(metric(e.allData,'a','Custo por dia','sum').value,10);
});

test('identificadores com separadores ou ramais numéricos não viram estatísticas',()=>{
 const all=[row('a',{'Valor_CPF':12345678901,Ramal:3204,'Cliente-ID':987654})];
 const e=E.build(all,all,files,'Qual o total de valor CPF, ramal e cliente?');
 assert.equal(e.allData.metrics.length,0);assert.equal(e.allData.sources.length,0);
 assert.doesNotMatch(JSON.stringify(e),/12345678901|3204|987654/);
});

test('pedido analítico geral inclui receitas e despesas por fonte sem enviar identificadores',()=>{
 const all=[row('a',{Receita:'R$ 100,00',Despesa:'R$ 40,00',CPF:'12345678901'}),row('b',{Receita:'R$ 200,00',Despesa:'R$ 30,00'})];
 for(const question of ['Analise as planilhas','Mostre os indicadores e um panorama']){
  const e=E.build(all,all,files,question);
  assert.equal(e.coverage.broadAnalysis,true);
  assert.equal(metric(e.allData,'a','Receita','sum').value,100);
  assert.equal(metric(e.allData,'a','Despesa','sum').value,40);
  assert.equal(metric(e.allData,'b','Receita','sum').value,200);
  assert.equal(metric(e.allData,'b','Despesa','sum').value,30);
  assert.doesNotMatch(JSON.stringify(e),/12345678901|CPF/);
 }
});
test('pedido explícito de análise de faturamento não amplia evidência para custos',()=>{
 const all=[row('a',{Faturamento:'R$ 100,00',Custo:'R$ 40,00'}),row('a',{Faturamento:'R$ 200,00',Custo:'R$ 60,00'})];
 const e=E.build(all,all,files,'Analise o faturamento');
 assert.equal(e.coverage.broadAnalysis,false);
 assert.equal(metric(e.allData,'a','Faturamento','sum').value,300);
 assert.equal(e.allData.metrics.some(m=>m.column==='Custo'),false);
});
