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
test("Netlify function exige segredo e não expõe a chave",async()=>{
 const { default: handler, config }=await import("../netlify/functions/michelle-ai.mjs");
 assert.equal(config.path,"/api/michelle-ai");
 const prior=process.env.DEEPSEEK_API_KEY, priorMichelle=process.env.POWER_BI_MICHELLE_IA;
 delete process.env.DEEPSEEK_API_KEY;
 delete process.env.POWER_BI_MICHELLE_IA;
 try {
   const req=new Request("https://example.netlify.app/api/michelle-ai",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({mode:"chat",channel:"geral",message:"Olá"})
   });
   const out=await handler(req);assert.equal(out.status,503);
   assert.match((await out.json()).error,/DEEPSEEK_API_KEY/);
 } finally {
   if(prior===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=prior;
   if(priorMichelle===undefined)delete process.env.POWER_BI_MICHELLE_IA;else process.env.POWER_BI_MICHELLE_IA=priorMichelle;
 }
});
test("função chama o DeepSeek em servidor e interpreta sem inventar campos",async()=>{
 const { default: handler }=await import("../netlify/functions/michelle-ai.mjs");
 const oldFetch=global.fetch,oldSecret=process.env.DEEPSEEK_API_KEY;
 process.env.DEEPSEEK_API_KEY="test-somente-no-servidor";
 let sent;
 global.fetch=async(url,opts)=>{
   sent={url,opts};
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({type:"ordens",sector:"tec",headerRow:0,mapping:{date:2,unsafe:5},confidence:"Alta",reason:"Coluna indica data"})}}]}),{status:200});
 };
 try {
   const req=new Request("https://example.netlify.app/api/michelle-ai",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({mode:"interpret",context:{headers:["ID","Setor","Data"],allowedFields:["date"]}})
   });
   const out=await handler(req);assert.equal(out.status,200);
   const response=await out.json();
   assert.deepEqual(response.interpretation.mapping,{date:2});
   assert.equal(response.interpretation.type,"ordens");
   assert.ok(sent.url.includes("deepseek.com"));
   assert.equal(sent.opts.headers.Authorization,"Bearer test-somente-no-servidor");
   assert.ok(!JSON.stringify(response).includes("test-somente-no-servidor"));
 } finally {
   global.fetch=oldFetch;
   if(oldSecret===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldSecret;
 }
});

test("diagnóstico informa variável disponível e autentica com o DeepSeek sem vazar chave", async()=>{
 const {default:handler}=await import("../netlify/functions/michelle-ai.mjs");
 const prior=process.env.DEEPSEEK_API_KEY, fetch0=global.fetch;
 process.env.DEEPSEEK_API_KEY="chave-teste-nao-publicar";
 let calls=0;
 global.fetch=async (url,options)=>{
   assert.equal(url,"https://api.deepseek.com/models");
   assert.equal(options.headers.Authorization,"Bearer chave-teste-nao-publicar");
   calls++;
   return new Response(JSON.stringify({data:[{id:"deepseek-flash"}]}),{status:200});
 };
 try{
   const publicStatus=await handler(new Request("https://example.test/api/michelle-ai",{method:"GET"}));
   assert.equal(publicStatus.status,200);
   const status=await publicStatus.json();
   assert.equal(status.keyConfigured,true);
   assert.ok(!JSON.stringify(status).includes("chave-teste-nao-publicar"));
   const diag=await handler(new Request("https://example.test/api/michelle-ai",{
     method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"diagnostic"})
   }));
   assert.equal(diag.status,200);
   assert.equal((await diag.json()).ok,true);
   assert.equal(calls,1);
 } finally {
   global.fetch=fetch0;
   if(prior===undefined)delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY=prior;
 }
});
test("os tamanhos da bolinha do Copiloto cresceram 30%",()=>{
 const css=fs.readFileSync(path.join(base,"michelle-ai-dock.css"),"utf8");
 const js=fs.readFileSync(path.join(base,"michelle-ai-dock.js"),"utf8");
 assert.match(css,/width:73px;height:73px;min-height:73px/);
 assert.match(css,/width:65px!important;height:65px!important;min-height:65px!important/);
 assert.match(css,/width:26px!important;height:26px!important/);
 assert.match(js,/const size=mobile\(\)\?65:73/);
});

test("função lê POWER_BI_MICHELLE_IA antes da variável antiga, sem expor valor", async()=>{
 const {default:handler}=await import("../netlify/functions/michelle-ai.mjs");
 const previous=process.env.POWER_BI_MICHELLE_IA;
 const originalOld=process.env.DEEPSEEK_API_KEY;
 const previousFetch=global.fetch;
 process.env.POWER_BI_MICHELLE_IA="chave-michelle-teste";
 process.env.DEEPSEEK_API_KEY="chave-antiga-teste";
 let auth;
 global.fetch=async(url,opts)=>{
   assert.equal(url,"https://api.deepseek.com/models");
   auth=opts.headers.Authorization;
   return new Response(JSON.stringify({data:[]}),{status:200});
 };
 try {
   const req=new Request("https://example.netlify.app/api/michelle-ai",{
     method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"diagnostic"})
   });
   const answer=await handler(req);
   assert.equal(answer.status,200);
   assert.equal((await answer.json()).ok,true);
   assert.equal(auth,"Bearer chave-michelle-teste");
   const check=await handler(new Request("https://example.netlify.app/api/michelle-ai"));
   assert.equal((await check.json()).keyConfigured,true);
   assert.ok(!(await check.text()).includes("chave-michelle-teste"));
 } finally {
   global.fetch=previousFetch;
   if(previous===undefined)delete process.env.POWER_BI_MICHELLE_IA;else process.env.POWER_BI_MICHELLE_IA=previous;
   if(originalOld===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=originalOld;
 }
});
