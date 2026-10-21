// One synthetic analysis through the same client context and Railway handler.
// No accounts, uploaded spreadsheets, database rows or model answers are logged.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import handler from './michelle-ai.mjs';

export async function checkAnalysis({environment=process.env,fetcher=globalThis.fetch,logger=console}={}){
 const report=(ok,status)=>{
  logger[ok?'log':'warn']('MICHELLE_AI_ANALYSIS_SELFTEST status='+status);
  return {ok,status};
 };
 if(!(environment.API_IA_GROQ||environment.GROQ_API_KEY))return report(false,'missing_key');
 try{
  const window={};
  const sandbox={window,localStorage:{getItem:()=>null,setItem:()=>{}}};
  for(const file of ['../analysis/ai-question-evidence.js','../michelle-ai-client.js'])
   vm.runInNewContext(readFileSync(new URL(file,import.meta.url),'utf8'),sandbox,{timeout:1000});
  const all=[100,200,150].map((value,i)=>({lotId:'synthetic',type:'geral',raw:{Faturamento:value},id:'fixture-'+i}));
  const question='Informe o faturamento do recorte atual e depois o faturamento do histórico completo, nessa ordem. Responda somente os dois valores separados por ponto e vírgula, sem texto.';
  const context=window.MCAI.context(all.slice(0,2),[{id:'synthetic',name:'Fonte sintética.xlsx',sheet:'Receita'}],[],{allRows:all,question});
  const headers={'content-type':'application/json'};
  if(environment.MICHELLE_AI_ACCESS_TOKEN)headers['x-michelle-ai-token']=environment.MICHELLE_AI_ACCESS_TOKEN;
  const response=await handler(new Request('http://localhost/api/michelle-ai',{
   method:'POST',headers,body:JSON.stringify({mode:'chat',channel:'dados',message:question,context})
  }),{environment,fetcher});
  if(!response.ok)return report(false,'http_'+response.status);
  const body=await response.json();
  const amounts=(String(body.answer||'').match(/-?\d[\d.,]*/g)||[]).map(value=>{
   if(value.includes(','))return Number(value.replace(/\./g,'').replace(',','.'));
   return Number(value);
  });
  return amounts.length===2&&amounts[0]===300&&amounts[1]===450
   ?report(true,'ok'):report(false,'incorrect_analysis');
 }catch{return report(false,'test_error');}
}
