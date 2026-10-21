const {test}=require('node:test');
const assert=require('node:assert/strict');
const environment={API_IA_GROQ:'synthetic-secret'};
const log=()=>{const messages=[];return {messages,log:m=>messages.push(m),warn:m=>messages.push(m)}};
test('autoteste no Railway usa contexto real do cliente e confere resultado por recorte',async()=>{
 const {checkAnalysis}=await import('../server/ai-analysis-self-test.mjs');
 const logger=log();let calls=0;
 const result=await checkAnalysis({environment,logger,fetcher:async(url,options)=>{
  calls++;assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
  const body=JSON.parse(options.body),message=body.messages.at(-1).content;
  assert.match(message,/"questionEvidence"/);
  assert.match(message,/"operation":"sum","value":300/);
  assert.match(message,/"operation":"sum","value":450/);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'300;450'}}]}),{status:200});
 }});
 assert.deepEqual(result,{ok:true,status:'ok'});assert.equal(calls,1);
 assert.deepEqual(logger.messages,['MICHELLE_AI_ANALYSIS_SELFTEST status=ok']);
 assert.doesNotMatch(JSON.stringify(logger.messages),/synthetic-secret|300|450/);
});
test('resposta incorreta ou truncada não conta como análise aprovada',async()=>{
 const {checkAnalysis}=await import('../server/ai-analysis-self-test.mjs');
 for(const [answer,finish,status]of [['2;3','stop','incorrect_analysis'],['300;450','length','http_502']]){
  const result=await checkAnalysis({environment,logger:log(),fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content:answer}}]}),{status:200})});
  assert.equal(result.ok,false);assert.equal(result.status,status);
 }
});
test('contexto acima do contrato é erro de entrada e não chama modelo',async()=>{
 const {default:handler}=await import('../server/michelle-ai.mjs');let calls=0;
 const response=await handler(new Request('http://localhost/api/michelle-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Analise',context:{oversized:'x'.repeat(18001)}})}),{environment,fetcher:async()=>{calls++}});
 assert.equal(response.status,413);assert.equal(calls,0);
});
