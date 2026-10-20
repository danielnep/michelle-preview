const {test}=require("node:test");
const assert=require("node:assert/strict");

test("agente planeja cada fonte e descarta IDs, colunas e cruzamentos inventados",async()=>{
  const {default:handler}=await import("../server/michelle-ai.mjs");
  const before=process.env.API_IA_GROQ,old=process.env.GROQ_API_KEY,fetch0=global.fetch;
  process.env.API_IA_GROQ="chave-para-teste";delete process.env.GROQ_API_KEY;
  let sent;
  global.fetch=async(url,options)=>{
    sent=JSON.parse(options.body);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({
      summary:"Duas fontes independentes",
      sources:[
        {id:"a",subject:"Férias",grain:"uma pessoa por solicitação",metrics:[{name:"Contagem",operation:"count",column:"Colaborador",unit:"solicitações"}]},
        {id:"b",subject:"Estoque",grain:"produto",metrics:[{name:"Soma",operation:"sum",column:"Coluna inexistente",unit:"peças"}]},
        {id:"inventado",subject:"Falso",metrics:[]}],
      groups:[{sourceIds:["a","inventado"],classification:"complementares",reason:"Suposta chave"}],
      dashboard:{order:["metrics","crossings","reading","fake"]}})} }]}),{status:200});
  };
  try {
    const sources=[
      {id:"a",file:"ferias.csv",sheet:"Dados",rowCount:8,columns:[{name:"Colaborador",inferredShape:"texto"}]},
      {id:"b",file:"estoque.xlsx",sheet:"Produtos",rowCount:12,columns:[{name:"Saldo",inferredShape:"numero"}]}
    ];
    const req=new Request("https://example.test/api/michelle-ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"plan",context:{sources}})});
    const response=await handler(req);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.mode,"plan");
    assert.equal(data.plan.sources.length,2);
    assert.deepEqual(data.plan.groups,[]);
    assert.equal(data.plan.sources[1].metrics[0].column,"");
    assert.deepEqual(data.plan.dashboard.order,["metrics","reading"]);
    assert.match(sent.messages[0].content,/NÃO se complementam/);
    assert.equal(sent.response_format.type,"json_object");
    assert.equal(sent.temperature,0.2);
    assert.equal(sent.messages[1].content.includes("ferias.csv"),true);
  } finally {
    global.fetch=fetch0;
    if(before===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=before;
    if(old===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=old;
  }
});
