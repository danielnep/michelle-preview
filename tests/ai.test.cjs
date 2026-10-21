const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base=path.join(__dirname,"..");
test("a página carrega o Copiloto e mantém scripts antes do app",()=>{
 const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
 assert.ok(html.includes("michelle-ai-client.js"));
 assert.ok(html.includes("michelle-ai-dock.js"));
 assert.ok(html.includes("michelle-ai-dock.css"));
 assert.ok(html.indexOf("michelle-ai-client.js") < html.indexOf("app.js"));
 assert.ok(html.indexOf("michelle-ai-dock.js") < html.indexOf("app.js"));
});
test("API do servidor exige segredo e não expõe a chave",async()=>{
 const { default: handler, config }=await import("../server/michelle-ai.mjs");
 assert.equal(config.path,"/api/michelle-ai");
 const prior=process.env.GROQ_API_KEY, priorMichelle=process.env.API_IA_GROQ;
 delete process.env.GROQ_API_KEY;
 delete process.env.API_IA_GROQ;
 try {
   const req=new Request("http://localhost/api/michelle-ai",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({mode:"chat",channel:"geral",message:"Olá"})
   });
   const out=await handler(req);assert.equal(out.status,503);
   assert.match((await out.json()).error,/temporariamente indisponível/);
 } finally {
   if(prior===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=prior;
   if(priorMichelle===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=priorMichelle;
 }
});
test("servidor chama a Groq e interpreta sem inventar campos",async()=>{
 const { default: handler }=await import("../server/michelle-ai.mjs");
 const oldFetch=global.fetch,oldSecret=process.env.GROQ_API_KEY;
 process.env.GROQ_API_KEY="test-somente-no-servidor";
 let sent;
 global.fetch=async(url,opts)=>{
   sent={url,opts};
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({type:"ordens",sector:"tec",headerRow:0,mapping:{date:2,unsafe:5},confidence:"Alta",reason:"Coluna indica data"})}}]}),{status:200});
 };
 try {
   const req=new Request("http://localhost/api/michelle-ai",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({mode:"interpret",context:{headers:["ID","Setor","Data"],allowedFields:["date"]}})
   });
   const out=await handler(req);assert.equal(out.status,200);
   const response=await out.json();
   assert.deepEqual(response.interpretation.mapping,{date:2});
   assert.equal(response.interpretation.type,"ordens");
   assert.ok(sent.url.includes("groq.com"));
   assert.equal(sent.opts.headers.Authorization,"Bearer test-somente-no-servidor");
   assert.ok(!JSON.stringify(response).includes("test-somente-no-servidor"));
 } finally {
   global.fetch=oldFetch;
   if(oldSecret===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=oldSecret;
 }
});

test("diagnóstico informa variável disponível e autentica com o Groq sem vazar chave", async()=>{
 const {default:handler}=await import("../server/michelle-ai.mjs");
 const prior=process.env.GROQ_API_KEY, fetch0=global.fetch;
 process.env.GROQ_API_KEY="chave-teste-nao-publicar";
 let calls=0;
 global.fetch=async (url,options)=>{
   assert.equal(url,"https://api.groq.com/openai/v1/models");
   assert.equal(options.headers.Authorization,"Bearer chave-teste-nao-publicar");
   calls++;
   return new Response(JSON.stringify({data:[{id:"openai/gpt-oss-120b"}]}),{status:200});
 };
 try{
   const publicStatus=await handler(new Request("http://localhost/api/michelle-ai",{method:"GET"}));
   assert.equal(publicStatus.status,200);
   const status=await publicStatus.json();
   assert.equal(status.keyConfigured,true);
   assert.ok(!JSON.stringify(status).includes("chave-teste-nao-publicar"));
   const diag=await handler(new Request("http://localhost/api/michelle-ai",{
     method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"diagnostic"})
   }));
   assert.equal(diag.status,200);
   assert.equal((await diag.json()).ok,true);
   assert.equal(calls,1);
 } finally {
   global.fetch=fetch0;
   if(prior===undefined)delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=prior;
 }
});
test("o carregador usa o Copiloto lateral e não carrega o posicionador de bolinha",()=>{
 const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
 const src=fs.readFileSync(path.join(base,"app.js"),"utf8");
 assert.equal(html.includes('analysis/compact-dock.js'),false);
 assert.ok(html.includes('mc-live.css'));
 assert.equal(src.includes('class="assistant-fab'),false);
});

test("função lê API_IA_GROQ antes da variável antiga, sem expor valor", async()=>{
 const {default:handler}=await import("../server/michelle-ai.mjs");
 const previous=process.env.API_IA_GROQ;
 const originalOld=process.env.GROQ_API_KEY;
 const previousFetch=global.fetch;
 process.env.API_IA_GROQ="chave-michelle-teste";
 process.env.GROQ_API_KEY="chave-antiga-teste";
 let auth;
 global.fetch=async(url,opts)=>{
   assert.equal(url,"https://api.groq.com/openai/v1/models");
   auth=opts.headers.Authorization;
   return new Response(JSON.stringify({data:[]}),{status:200});
 };
 try {
   const req=new Request("http://localhost/api/michelle-ai",{
     method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"diagnostic"})
   });
   const answer=await handler(req);
   assert.equal(answer.status,200);
   assert.equal((await answer.json()).ok,true);
   assert.equal(auth,"Bearer chave-michelle-teste");
   const check=await handler(new Request("http://localhost/api/michelle-ai"));
   const checkBody=await check.text();
   assert.equal(JSON.parse(checkBody).keyConfigured,true);
   assert.ok(!checkBody.includes("chave-michelle-teste"));
 } finally {
   global.fetch=previousFetch;
   if(previous===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=previous;
   if(originalOld===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=originalOld;
 }
});


test("Groq mantém uma classificação por aba, prioriza confiança e orienta navegação atual",async()=>{
 const {default:handler}=await import("../server/michelle-ai.mjs");
 const fetcher=async(url,options)=>{
   assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
   const data=JSON.parse(options.body);
   assert.match(data.messages[0].content,/Início, Setores, Explorar, Insights e Mais/);
   return Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({
     sources:[
       {id:"sheet-A",type:"geral",sector:"coi",mapping:{},confidence:"Baixa"},
       {id:"sheet-A",type:"ligacoes",sector:"port",mapping:{number:1},confidence:"Alta"},
       {id:"sheet-B",type:"ordens",sector:"tec",mapping:{status:1},confidence:"Moderada"}
     ]})}}]});
 };
 const req=new Request("http://localhost/api/michelle-ai",{method:"POST",
   headers:{"content-type":"application/json"},body:JSON.stringify({mode:"interpret-batch",context:{
     sources:[{id:"sheet-A",headers:["Data","Telefone"]},{id:"sheet-B",headers:["OS","Status"]}],
     allowedFields:["number","status"]
   }})});
 const response=await handler(req,{fetcher,environment:{API_IA_GROQ:"chave-sintetica"}});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.sources.length,2);
 assert.equal(data.sources[0].type,"ligacoes");
 assert.deepEqual(data.sources[0].mapping,{number:1});
 assert.equal(data.sources[1].type,"ordens");
});
test("Railway interpreta múltiplas fontes em uma solicitação sem aceitar campos inventados",async()=>{
  const {default:handler}=await import("../server/michelle-ai.mjs");
  const oldFetch=global.fetch,oldKey=process.env.API_IA_GROQ;
  process.env.API_IA_GROQ="chave-de-teste";
  global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({
    sources:[{id:"aba-01",type:"ordens",sector:"tec",headerRow:0,mapping:{date:0,campoInventado:1},confidence:"Alta",reason:"Data reconhecida"},
      {id:"fonte-fantasma",type:"geral",sector:"coi",mapping:{}}]
  })}}]}),{status:200});
  try{
    const response=await handler(new Request("https://railway.example/api/michelle-ai",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"interpret-batch",context:{
        sources:[{id:"aba-01",headers:["Data","Cliente"],name:"ordens.xlsx",sheet:"Registros"}],
        allowedFields:["date"]}})
    }));
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.sources.length,1);
    assert.equal(result.sources[0].type,"ordens");
    assert.deepEqual(result.sources[0].mapping,{date:0});
  }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=oldKey;}
});
