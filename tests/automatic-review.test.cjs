const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const R=require('../analysis/automatic-review.js');
const lot=(id,n=1)=>({id,hash:id,created:'2026-10-13',name:'Ordens '+id+'.xlsx',sheet:'Dados',type:'ordens',sector:'tec',rows:Array.from({length:n},(_,i)=>({id:id+i,lotId:id,status:i%2?'Pendente':'Concluído',date:'2026-10-01',raw:{Quantidade:i+1,CPF:'31999999999',Situação:i%2?'Pendente':'Concluído'}}))});
test('revisão percorre todos os arquivos e encontra colunas que surgem depois da linha trezentos',()=>{
  const lots=Array.from({length:25},(_,i)=>lot('s'+i,305));lots[24].rows[304].raw['Métrica tardia']=8;
  const profiles=R.profiles(lots,lots.flatMap(l=>l.rows));
  assert.equal(profiles.length,25);assert.equal(profiles.reduce((n,p)=>n+p.quality.rowsRead,0),7625);
  assert.ok(profiles[24].columns.some(c=>c.name==='Métrica tardia'));
  assert.ok(profiles.every(p=>!p.metrics.some(m=>m.column==='CPF')));
  assert.equal(JSON.stringify(R.batches(profiles)).includes('31999999999'),false);
  const ids=new Set(R.batches(profiles).flat().map(p=>p.id));assert.equal(ids.size,25);
  assert.ok(R.batches(profiles).every(sources=>JSON.stringify({sources}).length<=16000));
});
test('taxas e saldos não são somados; médias preservam zero e registros filtrados não voltam à base',()=>{
  const l=lot('one',3);l.rows.forEach((r,i)=>{r.raw={Taxa:[0,10,20][i]+'%',Saldo:[5,10,15][i],Custo:['R$ 0,00','R$ 10,00','R$ 20,00'][i]};});
  const p=R.profiles([l],l.rows)[0];assert.equal(p.metrics.find(m=>m.column==='Taxa'&&m.operation==='average').value,10);
  assert.equal(p.metrics.some(m=>['Taxa','Saldo'].includes(m.column)&&m.operation==='sum'),false);
  assert.equal(p.metrics.find(m=>m.column==='Custo'&&m.operation==='sum').value,30);
  assert.equal(R.profiles([l],[])[0].rows,0);
  assert.equal(R.profiles([l],l.rows.slice(1))[0].metrics.find(m=>m.id==='one:records').value,2);
});
test('competências têm evidências calculadas sem inventar dias nem meses ausentes',()=>{
  const l=lot('period',3);l.rows[0].date='2026-08-10';l.rows[1].date='2026-10-03';l.rows[2].date='2026-10-10';
  const p=R.profiles([l],l.rows)[0],months=p.metrics.filter(m=>m.domain==='temporal');
  assert.equal(months.length,2);assert.deepEqual(months.map(m=>m.value),[1,2]);
  assert.equal(months[0].periodStart,'2026-08-10');assert.equal(months[0].periodEnd,'2026-08-10');
  assert.ok(R.batches([p]).flat().some(part=>part.metrics.some(m=>m.domain==='temporal')));
});
test('contrato descarta métricas inventadas, números da IA e comparativos incompatíveis',async()=>{
  const {validateReview,plainText}=await import('../server/automatic-review.mjs');
  const sources=R.batches(R.profiles([lot('a')],lot('a').rows))[0];
  const p=sources[0],e=p.metrics[0];
  const review=validateReview({sources:[{id:p.id,partId:p.partId,title:'**Ordens**',description:'Operação',chart:'script'}],
    dashboard:{title:'**Operação**',order:['crossings','metrics','fake'],metrics:[{metricId:e.id,title:'**Quantidade**',value:999},{metricId:'fake',title:'Falso'}]},
    insights:[{kind:'idea',title:'**Planejar atendimento**',interpretation:'Pode haver concentração em uma etapa',action:'Medir tempo de espera',evidenceIds:[e.id,'fake'],sourceIds:[p.id],relatedIndicators:[{name:'Fila',reason:'Identificar espera',value:99}]},
      {kind:'comparison',title:'Cresceu',interpretation:'Tendência',evidenceIds:[e.id],sourceIds:[p.id],comparison:{leftId:e.id,rightId:'fake'}}]}, {sources});
  assert.equal(review.dashboard.metrics.length,1);assert.equal(review.dashboard.metrics[0].value,undefined);
  assert.deepEqual(review.dashboard.order,['metrics']);assert.equal(review.insights.length,1);
  assert.equal(review.insights[0].relatedIndicators[0].available,false);assert.equal(review.sources[0].chart,'auto');
  assert.equal(JSON.stringify(review).includes('*'),false);assert.equal(plainText('## Título\n**claro**'),'Título\nclaro');
  assert.throws(()=>validateReview({sources:[]},{sources}),/todas as fontes/);
});
test('comparação exige a mesma definição, unidade e períodos observados separados',async()=>{
  const {validateReview}=await import('../server/automatic-review.mjs');
  const make=(id,start,end)=>({id,partId:id,metrics:[{id:id+':m',value:10,unit:'registros',comparisonKey:'mesmo-esquema',periodStart:start,periodEnd:end}]});
  const source=(a,b)=>({sources:[{id:a.id,partId:a.partId},{id:b.id,partId:b.partId}],insights:[{kind:'comparison',title:'Comparação',interpretation:'Investigar mudança de demanda',sourceIds:[a.id,b.id],evidenceIds:[a.metrics[0].id,b.metrics[0].id],comparison:{leftId:a.metrics[0].id,rightId:b.metrics[0].id}}]});
  const a=make('a','2026-08-01','2026-08-31'),b=make('b','2026-09-01','2026-09-30');
  assert.equal(validateReview(source(a,b),{sources:[a,b]}).insights.length,1);
  b.metrics[0].unit='eventos';assert.equal(validateReview(source(a,b),{sources:[a,b]}).insights.length,0);
  b.metrics[0].unit='registros';b.metrics[0].periodStart='2026-08-15';assert.equal(validateReview(source(a,b),{sources:[a,b]}).insights.length,0);
});
test('backend Railway aplica protocolo de revisão e limpa Markdown nas respostas do chat',async()=>{
 const {default:handler}=await import('../server/michelle-ai.mjs');const old=process.env.API_IA_GROQ,fetch0=global.fetch;process.env.API_IA_GROQ='segredo-apenas-teste';let sent;
 const sources=R.batches(R.profiles([lot('a')],lot('a').rows))[0];
 global.fetch=async(_url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({choices:[{message:{content:sent.response_format?JSON.stringify({sources:sources.map(s=>({id:s.id,partId:s.partId,title:'Ordens',description:'Atendimento'})),dashboard:{title:'Operação',metrics:[]},insights:[]}):'**Resposta** sem Markdown'}}]}),{status:200});};
 try{
  const call=input=>handler(new Request('http://localhost/api/michelle-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}));
  const review=await call({mode:'review',context:{sources}});assert.equal(review.status,200);assert.equal((await review.json()).review.sources.length,sources.length);
  assert.match(sent.messages[0].content,/NÃO entregue uma transcrição/);assert.equal(sent.response_format.type,'json_object');
  const chat=await call({mode:'chat',message:'Resumo'});assert.equal((await chat.json()).answer,'Resposta sem Markdown');
 }finally{global.fetch=fetch0;if(old===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=old;}
});
test('revisão persistida é por usuário e perde acesso quando um setor é revogado',async()=>{
  const {readReview,writeReview}=await import('../server/review-store.mjs');const calls=[];
  const body={signature:'v1',result:{sources:[{id:'a'}]},registry:[],userId:'outra-pessoa'};
  let rows=[{id:'a',sector:'tec'}];const pool={query:async(sql,params)=>{calls.push({sql,params});if(sql.startsWith('SELECT content'))return {rows:[{content:body}]};if(sql.startsWith('SELECT id'))return{rows};return{rows:[]};}};
  await writeReview(pool,{owner:false,sectors:['tec']},'usuario-logado',body);
  assert.equal(calls.at(-1).params[0],'usuario-logado');assert.equal(JSON.parse(calls.at(-1).params[1]).userId,undefined);
  assert.ok(await readReview(pool,{owner:false,sectors:['tec']},'usuario-logado'));
  assert.equal(await readReview(pool,{owner:false,sectors:['rh']},'usuario-logado'),null);
  await assert.rejects(writeReview(pool,{owner:false,sectors:['rh']},'usuario-logado',body),e=>e.status===409);
  rows=[];assert.equal(await readReview(pool,{owner:true},'usuario-logado'),null);
});
test('arquivos confirmados são analisados juntos; resposta de rodada antiga não substitui a nova',async()=>{
  const dom=new JSDOM('<div></div>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
  let lots=[lot('a')],calls=[],release;
  const first=new Promise(resolve=>release=resolve),s={ready:true};
  w.MichelleBridge={getImports:()=>lots,getAll:()=>lots.flatMap(l=>l.rows),getState:()=>s,render(){}};
  w.MCAI={consent:()=>true,setConsent(){},request:async(_mode,{context})=>{
    calls.push(context.sources.map(s=>s.id));if(calls.length===1)await first;
    return {review:{summary:'Percepção',sources:context.sources.map(p=>({id:p.id,partId:p.partId,title:'Ordens',description:'Atendimento'})),insights:[],dashboard:{title:'Operação',description:'Leitura',order:['metrics'],metrics:context.sources.map(p=>({metricId:p.metrics[0].id,title:'Registros'})),blocks:[]}}};
  }};
  w.eval(fs.readFileSync(path.join(__dirname,'../analysis/automatic-review.js'),'utf8'));
  w.MCAutoReview.schedule();await new Promise(r=>setTimeout(r,680));lots.push(lot('b'));w.MCAutoReview.schedule();release();
  const start=Date.now();while(w.MCAutoReview.state.phase!=='ready'&&Date.now()-start<3500)await new Promise(r=>setTimeout(r,20));
  assert.equal(w.MCAutoReview.state.phase,'ready');assert.equal(w.MCAutoReview.current().coverage.sources,2);assert.equal(w.MCAutoReview.current().coverage.rows,2);
  assert.ok(calls.slice(1).some(ids=>ids.includes('a')&&ids.includes('b')));assert.equal(w.MCAutoReview.current().sources.length,2);
  dom.window.close();
});
