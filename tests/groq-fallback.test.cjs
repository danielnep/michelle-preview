const test = require("node:test");
const assert = require("node:assert/strict");

const keys=["POWER_BI_MICHELLE_IA","DEEPSEEK_API_KEY","API_IA_GROQ","GROQ_API_KEY","GROQ_MODEL"];
const reply=content=>new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{"content-type":"application/json"}});
const request=(mode="chat",extra={})=>new Request("https://railway.example/api/michelle-ai",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({mode,message:"Olá",channel:"geral",...extra})
});
async function isolated(variables,remote,run){
  const values=new Map(keys.map(k=>[k,process.env[k]]));
  const oldFetch=global.fetch;
  keys.forEach(k=>delete process.env[k]);
  Object.assign(process.env,variables);
  global.fetch=remote;
  try{
    const {default:handler}=await import("../server/michelle-ai.mjs");
    return await run(handler);
  }finally{
    global.fetch=oldFetch;
    for(const [k,v] of values){
      if(v===undefined)delete process.env[k];
      else process.env[k]=v;
    }
  }
}

test("Groq atende o chat com o segredo apenas no servidor",async()=>{
  let called=0;
  await isolated({API_IA_GROQ:"groq-teste"},async(url,opts)=>{
    called++;
    assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
    assert.equal(opts.headers.Authorization,"Bearer groq-teste");
    const payload=JSON.parse(opts.body);
    assert.equal(payload.model,"llama-3.3-70b-versatile");
    assert.equal(payload.reasoning_effort,undefined);
    assert.equal(payload.thinking,undefined);
    assert.equal(payload.reasoning_format,undefined);
    return reply("A interpretação está disponível.");
  },async(handler)=>{
    const status=await handler(new Request("https://railway.example/api/michelle-ai"));
    assert.equal((await status.json()).keyConfigured,true);
    const result=await handler(request());
    assert.equal(result.status,200);
    const data=await result.json();
    assert.match(data.answer,/interpretação/);
    assert.equal(JSON.stringify(data).includes("groq-teste"),false);
  });
  assert.equal(called,1);
});

test("API desativada não é utilizada mesmo com variáveis antigas definidas",async()=>{
  let called=0;
  await isolated({DEEPSEEK_API_KEY:"chave-legada",POWER_BI_MICHELLE_IA:"chave-anterior"},async()=>{
    called++;
    throw Error("Nenhum acesso remoto deve acontecer");
  },async(handler)=>{
    const status=await handler(new Request("https://railway.example/api/michelle-ai"));
    assert.equal((await status.json()).keyConfigured,false);
    const result=await handler(request());
    assert.equal(result.status,503);
  });
  assert.equal(called,0);
});

test("Groq preserva JSON estruturado e valida os campos permitidos da planilha",async()=>{
  await isolated({API_IA_GROQ:"groq-teste",GROQ_MODEL:"openai/gpt-oss-20b"},async(url,opts)=>{
    assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
    const data=JSON.parse(opts.body);
    assert.equal(data.model,"openai/gpt-oss-20b");
    assert.deepEqual(data.response_format,{type:"json_object"});
    return reply(JSON.stringify({type:"ordens",sector:"tec",headerRow:0,
      mapping:{date:1,inventado:2},confidence:"Alta",reason:"Coluna data"}));
  },async(handler)=>{
    const result=await handler(request("interpret",{context:{
      headers:["OS","Data","extra"],allowedFields:["date"]
    }}));
    assert.equal(result.status,200);
    const body=await result.json();
    assert.deepEqual(body.interpretation.mapping,{date:1});
    assert.equal(body.interpretation.type,"ordens");
  });
});

test("Falhas remotas não divulgam erro interno nem segredo",async()=>{
  await isolated({API_IA_GROQ:"groq-teste"},async()=>
    new Response("internals da API",{status:429}),async(handler)=>{
      const result=await handler(request());
      assert.equal(result.status,503);
      const body=await result.json();
      assert.match(body.error,/temporariamente indisponível/);
      assert.doesNotMatch(JSON.stringify(body),/internals|groq-teste/);
    });
});

test("Diagnóstico valida somente a Groq",async()=>{
  const targets=[];
  await isolated({API_IA_GROQ:"groq-teste",DEEPSEEK_API_KEY:"legado"},async(url,opts)=>{
    targets.push(url);
    assert.equal(opts.headers.Authorization,"Bearer groq-teste");
    return new Response("{}",{status:200});
  },async(handler)=>{
    const result=await handler(request("diagnostic"));
    assert.equal(result.status,200);
    const body=await result.json();
    assert.equal(body.ok,true);
    assert.equal(body.provider,"Groq");
  });
  assert.deepEqual(targets,["https://api.groq.com/openai/v1/models"]);
});
