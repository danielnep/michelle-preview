const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

function copiloto() {
  const window={MCData:{stats:()=>({rate:null})},MCAnalysis:{analyze:()=>[]},MCIntelligence:{analyze:()=>({cards:[]})}};
  const localStorage={getItem:()=>null,setItem:()=>{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../michelle-ai-client.js"),"utf8"),{window,localStorage});
  return window.MCAI;
}
test("chat e insights recebem o mesmo catálogo completo de arquivos, com o recorte separado",()=>{
  const c=copiloto();
  const all=[
    {lotId:"a",source:"Ligações outubro.xlsx",type:"ligacoes",sector:"port",date:"2026-10-01",status:"Concluído",client:"Cliente A",direction:"Recebida",title:"Chamada",raw:{"Origem":"Recebida","Telefone":"31999999999"}},
    {lotId:"a",source:"Ligações outubro.xlsx",type:"ligacoes",sector:"port",date:"2026-10-02",status:"Pendente",client:"Cliente B",direction:"Realizada",title:"Chamada",raw:{"Origem":"Realizada","Telefone":"31911111111"}},
    {lotId:"b",source:"CUC.xlsx",type:"cuc",sector:"coi",status:"Não informado",value:12,title:"Eventos",raw:{"Número de Eventos":12}}
  ];
  const files=[{id:"a",name:"Ligações outubro.xlsx",sheet:"Chamadas",sector:"port",type:"ligacoes"},
    {id:"b",name:"CUC.xlsx",sheet:"Motivos",sector:"coi",type:"cuc"}];
  const context=c.context(all.slice(0,2),files,[{id:"port",name:"Portaria Remota"},{id:"coi",name:"COI"}],{allRows:all,question:"Qual a porcentagem de chamadas recebidas?"});
  assert.equal(context.allData.totalRows,3);
  assert.equal(context.selectedData.totalRows,2);
  assert.equal(context.totalImportedFiles,2);
  assert.equal(context.files.length,2);
  assert.equal(context.files[0].sheet,"Chamadas");
  assert.ok(context.files[0].columns.includes("Origem"));
  assert.equal(context.allData.byType.find(x=>x.type==="cuc").quantity,12);
  assert.equal(context.selectedData.byType[0].completionPercent,50);
  assert.equal(context.selectedData.topGroups.direction.find(x=>x.label.includes("Recebida")).percent,50);
  assert.doesNotMatch(JSON.stringify(context),/31999999999|31911111111/);
  assert.ok(JSON.stringify(context).length<18000);
});
test("backend orienta respostas diretas sem fórmulas e reconhece diferenças de escopo",async()=>{
  const {default:handler}=await import("../netlify/functions/michelle-ai.mjs");
  const old=process.env.POWER_BI_MICHELLE_IA, priorFetch=global.fetch;
  process.env.POWER_BI_MICHELLE_IA="secret-for-test";
  let requestBody;
  global.fetch=async(_url,options)=>{
    requestBody=JSON.parse(options.body);
    return new Response(JSON.stringify({choices:[{message:{content:"Foram 50% de ligações recebidas. 📞"}}]}),{status:200});
  };
  try{
    const res=await handler(new Request("https://example.netlify.app/api/michelle-ai",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({mode:"chat",channel:"dados",message:"Qual o percentual?",context:{allData:{totalRows:2},selectedData:{totalRows:2},files:[]}})
    }));
    assert.equal(res.status,200);
    assert.match((await res.json()).answer,/50%/);
    assert.match(requestBody.messages[0].content,/RESULTADO pronto/);
    assert.match(requestBody.messages[0].content,/selectedData/);
    assert.equal(requestBody.max_tokens,340);
  }finally{
    global.fetch=priorFetch;
    if(old===undefined)delete process.env.POWER_BI_MICHELLE_IA;else process.env.POWER_BI_MICHELLE_IA=old;
  }
});
test("títulos e explicações de origem são contextuais, sem exibir fórmula como título",()=>{
  const dashboard=fs.readFileSync(path.join(__dirname,"../dashboard.js"),"utf8");
  assert.match(dashboard,/Ligações/);
  assert.match(dashboard,/function titleFor/);
  assert.match(dashboard,/De onde saiu este número\?/);
  assert.match(dashboard,/data-dash-ai-insights/);
  assert.match(dashboard,/b\.generateAIInsights/);
});
