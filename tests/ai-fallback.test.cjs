const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

function openAIClient(fetchStub){
  const root={};
  const context={window:root,fetch:fetchStub,AbortController,setTimeout,clearTimeout,
    localStorage:{getItem:()=>null,setItem:()=>{}},Date,Intl,Map,Set,JSON};
  const src=fs.readFileSync(path.join(__dirname,"../michelle-ai-client.js"),"utf8");
  vm.runInNewContext(src,context,{filename:"michelle-ai-client.js"});
  return root.MCAI;
}

test("IA indisponível: nunca expõe fornecedor, API, token ou status ao usuário",async()=>{
  let calls=0;
  const client=openAIClient(async()=>{calls++;return {ok:false,status:503,json:async()=>({error:"POWER_BI_MICHELLE_IA ausente na API DeepSeek"})};});
  await assert.rejects(()=>client.request("chat",{message:"Olá"}),error=>{
    assert.match(error.message,/Pedimos desculpas/);
    assert.match(error.message,/algoritmos e diretrizes/);
    assert.doesNotMatch(error.message,/API|DeepSeek|POWER_BI|token|503/);
    return true;
  });
  assert.equal(client.available,false);
  await assert.rejects(()=>client.request("review",{}),/temporariamente indisponível/);
  assert.equal(calls,1,"Não repetir solicitações em lote enquanto indisponível");
});

test("IA volta: verificação de disponibilidade restabelece chat",async()=>{
  let calls=0;
  const client=openAIClient(async()=>{calls++;return calls===1
    ?{ok:false,status:502,json:async()=>({error:"gateway 502"})}
    :{ok:true,status:200,json:async()=>({ok:true,answer:"Resposta real"})};});
  await assert.rejects(()=>client.request("chat",{message:"A"}),/temporariamente indisponível/);
  assert.equal(client.available,false);
  await client.request("diagnostic");
  assert.equal(client.available,true);
  const answer=await client.request("chat",{message:"B"});
  assert.equal(answer.answer,"Resposta real");
});

test("Análises locais: registros de fontes incompatíveis continuam separados",()=>{
  const review=require("../analysis/automatic-review.js");
  const lots=[
    {id:"os",name:"Ordens",sheet:"OS",type:"ordens",sector:"coi",rows:[]},
    {id:"cuc",name:"Eventos",sheet:"CUC",type:"cuc",sector:"coi",rows:[]}
  ];
  const rows=[
    {lotId:"os",status:"Concluído",raw:{"Código":"0001","Valor":"120"},date:"2026-10-20"},
    {lotId:"os",status:"Pendente",raw:{"Código":"0002","Valor":"90"},date:"2026-10-20"},
    {lotId:"cuc",status:"Não informado",raw:{"Evento":"A"},value:3,date:"2026-10-20"}
  ];
  const result=review.buildLocalReview(lots,rows);
  assert.equal(result.localMode,true);
  assert.equal(result.coverage.sources,2);
  assert.equal(result.coverage.rows,3);
  assert.equal(result.registry.filter(m=>m.operation==="count").length,2);
  assert.equal(result.dashboard.metrics.some(m=>m.metricId==="os:rate"),true);
  assert.equal(result.dashboard.metrics.some(m=>m.metricId==="cuc:quantity"),true);
  assert.match(result.dashboard.description,/sem inteligência artificial/);
  assert.equal(result.insights.some(i=>i.interpretation.includes("SLA")),true);
  assert.equal(result.insights.every(i=>i.evidenceIds.every(id=>result.registry.some(m=>m.id===id))),true);
});
