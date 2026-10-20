const {test}=require("node:test");
const assert=require("node:assert/strict");

async function load(){return (await import("../server/groq-self-test.mjs")).checkGroqConnection;}
function record(){const messages=[];return {messages,log:m=>messages.push(m),warn:m=>messages.push(m)};}

test("autoteste em produção valida inferência JSON sem registrar chave",async()=>{
  const check=await load(),log=record();
  let called=0;
  const result=await check({environment:{API_IA_GROQ:"super-secret-test"},
    logger:log,fetcher:async(url,opts)=>{
      called++;
      assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
      assert.equal(opts.headers.Authorization,"Bearer super-secret-test");
      const request=JSON.parse(opts.body);
      assert.equal(request.model,"openai/gpt-oss-120b");
      assert.equal(request.reasoning_effort,"low");
      assert.equal(request.include_reasoning,false);
      return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]}),{status:200});
    }});
  assert.deepEqual(result,{ok:true,status:"ok"});
  assert.equal(called,1);
  assert.deepEqual(log.messages,["MICHELLE_GROQ_SELFTEST status=ok"]);
});
test("falha HTTP informa apenas o código e não expõe valores",async()=>{
  const check=await load(),log=record();
  const result=await check({environment:{GROQ_API_KEY:"segredo-403"},logger:log,
    fetcher:async()=>new Response("private upstream error secret",{status:403})});
  assert.deepEqual(result,{ok:false,status:"http_403"});
  assert.deepEqual(log.messages,["MICHELLE_GROQ_SELFTEST status=http_403"]);
});
test("sem variável de produção, não aciona Groq",async()=>{
  const check=await load(),log=record();
  const result=await check({environment:{},logger:log,fetcher:async()=>{throw Error("must not call");}});
  assert.deepEqual(result,{ok:false,status:"missing_key"});
});
test("resposta truncada ou inválida não é anunciada como operacional",async()=>{
  const check=await load(),log=record();
  const result=await check({environment:{GROQ_API_KEY:"teste"},logger:log,
    fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:"length",message:{content:'{"ok":true}'}}]}),{status:200})});
  assert.deepEqual(result,{ok:false,status:"invalid_response"});
});
