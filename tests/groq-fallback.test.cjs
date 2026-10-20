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

test("Groq assume o chat quando não há chave DeepSeek, sem expor segredo",async()=>{
  let called=0;
  await isolated({API_IA_GROQ:"groq-teste"},async(url,opts)=>{
    called++;
    assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
    assert.equal(opts.headers.Authorization,"Bearer groq-teste");
    const payload=JSON.parse(opts.body);
    assert.equal(payload.model,"openai/gpt-oss-120b");
    assert.equal(payload.reasoning_effort,"low");
    assert.equal(payload.thinking,undefined);
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

test("se DeepSeek negar saldo, o Copiloto tenta Groq mantendo o contexto",async()=>{
  const called=[];
  await isolated({POWER_BI_MICHELLE_IA:"deepseek-teste",API_IA_GROQ:"groq-teste"},async(url,opts)=>{
    called.push({url,body:JSON.parse(opts.body)});
    if(url.startsWith("https://api.deepseek.com/"))return new Response("sem saldo",{status:402});
    return reply("Plano B funcionando.");
  },async(handler)=>{
    const result=await handler(request("chat",{context:{allData:{totalRows:4}}}));
    assert.equal(result.status,200);
    assert.match((await result.json()).answer,/Plano B/);
  });
  assert.equal(called.length,2);
  assert.match(called[0].url,/deepseek/);
  assert.match(called[1].url,/groq/);
  assert.deepEqual(called[0].body.messages,called[1].body.messages);
});

test("Groq preserva JSON estruturado e a validação dos campos de planilha",async()=>{
  await isolated({API_IA_GROQ:"groq-teste",GROQ_MODEL:"openai/gpt-oss-20b"},async(_url,opts)=>{
    assert.equal(JSON.parse(opts.body).model,"openai/gpt-oss-20b");
    assert.deepEqual(JSON.parse(opts.body).response_format,{type:"json_object"});
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

test("resposta inválida do DeepSeek também ativa a alternativa",async()=>{
  let n=0;
  await isolated({POWER_BI_MICHELLE_IA:"deepseek-teste",API_IA_GROQ:"groq-teste"},async(url)=>{
    n++;
    return url.includes("deepseek")
      ? reply("não é JSON")
      : reply(JSON.stringify({type:"geral",sector:"coi",mapping:{},confidence:"Baixa"}));
  },async(handler)=>{
    const result=await handler(request("interpret",{context:{headers:[],allowedFields:[]}}));
    assert.equal(result.status,200);
    assert.equal((await result.json()).interpretation.type,"geral");
  });
  assert.equal(n,2);
});

test("quando os dois provedores falham, informa indisponibilidade sem expor erro ou segredo",async()=>{
  await isolated({POWER_BI_MICHELLE_IA:"deepseek-teste",API_IA_GROQ:"groq-teste"},
    async()=>new Response("upstream internals",{status:429}),async(handler)=>{
      const result=await handler(request());
      assert.equal(result.status,503);
      const body=await result.json();
      assert.match(body.error,/temporariamente indisponível/);
      assert.doesNotMatch(JSON.stringify(body),/upstream internals|groq-teste|deepseek-teste/);
    });
});

test("diagnóstico consulta Groq quando DeepSeek não responde",async()=>{
  const targets=[];
  await isolated({POWER_BI_MICHELLE_IA:"deepseek-teste",API_IA_GROQ:"groq-teste"},async(url)=>{
    targets.push(url);
    return new Response("{}",{status:url.includes("deepseek")?401:200});
  },async(handler)=>{
    const result=await handler(request("diagnostic"));
    assert.equal(result.status,200);
    const body=await result.json();
    assert.equal(body.ok,true);
    assert.equal(body.provider,"Groq");
  });
  assert.deepEqual(targets,["https://api.deepseek.com/models","https://api.groq.com/openai/v1/models"]);
});
