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
  const {default:handler}=await import("../server/michelle-ai.mjs");
  const old=process.env.API_IA_GROQ, priorFetch=global.fetch;
  process.env.API_IA_GROQ="secret-for-test";
  let requestBody;
  global.fetch=async(_url,options)=>{
    requestBody=JSON.parse(options.body);
    return new Response(JSON.stringify({choices:[{message:{content:"Foram 50% de ligações recebidas. 📞"}}]}),{status:200});
  };
  try{
    const res=await handler(new Request("http://localhost/api/michelle-ai",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({mode:"chat",channel:"dados",message:"Qual o percentual?",context:{allData:{totalRows:2},selectedData:{totalRows:2},files:[]}})
    }));
    assert.equal(res.status,200);
    assert.match((await res.json()).answer,/50%/);
    assert.match(requestBody.messages[0].content,/RESULTADO pronto/);
    assert.match(requestBody.messages[0].content,/selectedData/);
    assert.equal(requestBody.max_completion_tokens,1240);
    assert.equal(requestBody.reasoning_effort,"low");
    assert.equal(requestBody.include_reasoning,false);
  }finally{
    global.fetch=priorFetch;
    if(old===undefined)delete process.env.API_IA_GROQ;else process.env.API_IA_GROQ=old;
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

test("Copiloto usa somente a API da mesma origem quando há backend",async()=>{
  for(const [hostname,expected] of [
    ["powerbi-completo-mc.up.railway.app","/api/michelle-ai"],
    ["localhost","/api/michelle-ai"]
  ]){
    let called="";
    const root={location:{hostname}};
    const store={getItem:()=>null,setItem:()=>{}};
    const backendFetch=async(url,options)=>{
      called=url;
      assert.equal(options.method,"POST");
      assert.equal(JSON.parse(options.body).mode,"chat");
      return {ok:true,json:async()=>({answer:"Copiloto online"})};
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../michelle-ai-client.js"),"utf8"),{
      window:root,localStorage:store,fetch:backendFetch,AbortController,setTimeout,clearTimeout
    });
    const answer=await root.MCAI.request("chat",{message:"Olá"});
    assert.equal(answer.answer,"Copiloto online");
    assert.equal(called,expected);
  }
});

test("Produção protege a API no Express e mantém a chave no servidor",()=>{
  const backend=fs.readFileSync(path.join(__dirname,"../server/index.mjs"),"utf8");
  const handler=fs.readFileSync(path.join(__dirname,"../server/michelle-ai.mjs"),"utf8");
  assert.match(backend,/app\.post\("\/api\/michelle-ai", protectedRoute, requireRight\("ai"\)/);
  assert.match(backend,/app\.get\("\/api\/michelle-ai", protectedRoute, requireRight\("ai"\)/);
  assert.match(handler,/https:\/\/api\.groq\.com\/openai\/v1/);
  assert.doesNotMatch(handler,/api\.deepseek\.com|api\.openai\.com|netlify\.app/i);
});

// O GitHub Pages é uma prévia independente: sem redirect e sem POST estático.
test("GitHub Pages carrega localmente, sem redirecionar ao servidor",async()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const script=html.split("<script>")[1]?.split("</script>")[0];
  assert.ok(script);
  assert.ok(!script.includes("location.replace") && !script.includes("location.assign"));
  for(const [hostname,pathname,expected] of [
    ["danielnep.github.io","/michelle-preview/",true],
    ["danielnep.github.io","/outro-projeto/",false],
    ["powerbi-completo-mc.up.railway.app","/",false]
  ]){
    const location={hostname,pathname,hash:"#/insight",replace:()=>{throw Error("redirecionamento indevido")}};
    const window={};
    vm.runInNewContext(script,{window,location});
    assert.equal(window.MCPreview.enabled,expected);
  }
  let calls=0;
  const window={location:{hostname:"danielnep.github.io",pathname:"/michelle-preview/"},MCPreview:{enabled:true}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../michelle-ai-client.js"),"utf8"),{
    window,localStorage:{getItem:()=>null,setItem:()=>{}},
    fetch:async()=>{calls++;return {ok:true,json:async()=>({})}},
    AbortController,setTimeout,clearTimeout
  });
  await assert.rejects(window.MCAI.request("chat",{message:"Olá"}),/prévia do GitHub/);
  assert.equal(calls,0);
});
test("interface do Copiloto não cita DeepSeek e usa quebras de linha reais",()=>{
  const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
  assert.doesNotMatch(app,/DeepSeek/);
  assert.match(app,/Dados agregados enviados à Groq/);
  assert.match(app,/\\n\\nConsulta local \(sem IA generativa\):\\n/);
  assert.doesNotMatch(app,/\\\\n\\\\nConsulta local/);
});
