const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function client(){
 const window={MCAIQuestionEvidence:require('../analysis/ai-question-evidence.js'),MCData:{stats:()=>({rate:null})},MCAnalysis:{analyze:()=>[]},MCIntelligence:{analyze:()=>({cards:[]})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../michelle-ai-client.js'),'utf8'),{window,localStorage:{getItem:()=>null,setItem:()=>{}}});
 return window.MCAI;
}
test('ranking mantém denominador e unidade próprios de cada tipo',()=>{
 const rows=[{lotId:'calls',type:'ligacoes',title:'Telefonia'},{lotId:'cuc',type:'cuc',title:'Eventos',value:999}];
 const c=client().context(rows,[{id:'calls',name:'Calls'},{id:'cuc',name:'CUC'}],[],{allRows:rows});
 const calls=c.selectedData.topGroups.title.find(r=>r.type==='ligacoes');
 const cuc=c.selectedData.topGroups.title.find(r=>r.type==='cuc');
 assert.equal(calls.percent,100);assert.equal(calls.denominator,1);assert.equal(calls.unit,'registros');
 assert.equal(cuc.percent,100);assert.equal(cuc.denominator,999);assert.equal(cuc.unit,'quantidade informada');
});
test('histórico global tem rankings independentes do recorte atual',()=>{
 const all=[{lotId:'a',type:'ligacoes',direction:'Recebida'},{lotId:'a',type:'ligacoes',direction:'Realizada'}];
 const c=client().context(all.slice(0,1),[{id:'a',name:'Calls'}],[],{allRows:all,question:'Em todos os dados qual percentual de realizadas?'});
 assert.equal(c.selectedData.totalRows,1);assert.equal(c.allData.totalRows,2);
 assert.equal(c.allData.topGroups.direction.find(r=>r.label.includes('Realizada')).percent,50);
});
test('categoria pedida fora das maiores aparece sem alterar denominador',()=>{
 const all=[];
 for(let i=0;i<20;i++)for(let n=0;n<30-i;n++)all.push({lotId:'a',type:'ordens',company:'Empresa '+i,title:'OS'});
 const c=client().context(all,[{id:'a',name:'Ordens'}],[],{allRows:all,question:'Quantas OS da Empresa 19?'});
 const target=c.selectedData.topGroups.company.find(r=>r.label==='ordens · Empresa 19');
 assert.ok(target);assert.equal(target.value,11);assert.equal(target.denominator,410);
});
test('arquivo e aba citados recebem evidência específica em vez de misturar fontes',()=>{
 const all=[{lotId:'a',type:'ligacoes',direction:'Recebida'},{lotId:'b',type:'ligacoes',direction:'Realizada'}];
 const c=client().context(all,[{id:'a',name:'Janeiro.xlsx',sheet:'Calls'},{id:'b',name:'Fevereiro.xlsx',sheet:'Atendimentos'}],[],{allRows:all,question:'Analise o arquivo Fevereiro.xlsx'});
 assert.equal(c.questionScope.totalRows,1);assert.equal(c.questionScope.sourceIds[0],'b');
 assert.equal(c.questionScope.data.topGroups.direction[0].percent,100);
});
test('contexto com muitas fontes respeita teto após incluir cobertura e mantém alvo',()=>{
 const all=Array.from({length:150},(_,i)=>({lotId:'s'+i,type:'geral',date:'2026-10-01',raw:{Telefone:'31999999999',Coluna:'x'}}));
 const imports=all.map((r,i)=>({id:r.lotId,name:('Arquivo '+i+' ').padEnd(120,'A'),sheet:'B'.repeat(90),sector:'x'}));
 imports[149].name='Alvo específico.xlsx';
 const c=client().context(all,imports,[],{allRows:all,question:'Analise Alvo específico.xlsx'});
 assert.ok(JSON.stringify(c).length<=17000);
 assert.ok(c.files.some(f=>f.id==='s149'));assert.ok(c.coverage.omittedFileProfiles>0);
 assert.equal(c.coverage.totalImportedFiles,150);assert.equal(c.questionScope.totalRows,1);
 assert.doesNotMatch(JSON.stringify(c),/31999999999/);
});

test('orçamento com 500 fontes financeiras preserva a métrica da fonte perguntada',()=>{
 const rows=Array.from({length:500},(_,i)=>({lotId:'s'+i,type:'geral',raw:{Faturamento:'R$ '+(i+1)+',00'}}));
 const imports=rows.map((row,i)=>({id:row.lotId,name:'Receita filial '+i+'.xlsx',sheet:'Financeiro'}));
 const context=client().context(rows,imports,[],{allRows:rows,question:'Qual o faturamento total no arquivo Receita filial 499.xlsx?'});
 assert.ok(JSON.stringify(context).length<=17000);
 assert.ok(context.files.some(f=>f.id==='s499'));
 const metric=context.questionEvidence.allData.metrics.find(m=>m.sourceId==='s499'&&m.operation==='sum');
 assert.ok(metric);assert.equal(metric.value,500);
 assert.ok(context.questionEvidence.allData.coverage.omittedSourceProfiles>0);
});
test('redução de evidências mantém descritor para cada métrica, incluindo somas',()=>{
 const rows=Array.from({length:500},(_,i)=>({lotId:'s'+i,type:'geral',raw:{Faturamento:'R$ '+(i+1)+',00'}}));
 const imports=rows.map((row,i)=>({id:row.lotId,name:'Fonte financeira '+i+'.xlsx',sheet:'Receitas'}));
 const context=client().context(rows,imports,[],{allRows:rows,question:'Qual o faturamento total de Fonte financeira 499.xlsx?'});
 assert.ok(context.questionEvidence);
 for(const scope of ['selectedData','allData']){
  const evidence=context.questionEvidence[scope],ids=new Set(evidence.sources.map(s=>s.sourceId));
  for(const metric of evidence.metrics)assert.ok(ids.has(metric.sourceId),scope+': métrica órfã '+metric.sourceId+' '+metric.operation);
  assert.ok(evidence.metrics.some(m=>m.sourceId==='s499'&&m.operation==='sum'&&m.value===500));
 }
 assert.ok(JSON.stringify(context).length<=17000);
});
