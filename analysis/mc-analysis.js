/* MC Analysis 4.0: interpretação rastreável, sem serviços externos. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MCAnalysis=api;
})(typeof window!=="undefined"?window:globalThis,function(){
"use strict";
const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
const specs={
 ordens:{label:"Ordens de serviço",metric:"Ordens de serviço registradas",unit:"ordens de serviço",hints:[/\bordens?\s+de\s+servic/,/\brelatorio\s+(?:de\s+)?os\b/,/\b(?:os)\s+(?:abertas|fechadas|concluidas)\b/],columns:[/numero\s+(?:da\s+)?os\b/,/\bordem\s+de\s+servic/,/solicitacao/,/data\s+de\s+abertura/] },
 ligacoes:{label:"Ligações",metric:"Ligações registradas",unit:"ligações",hints:[/ligac/,/telefon/,/chamad/],columns:[/durac/,/operador/,/resultado\s+ligacao/,/origem\s+(?:da\s+)?ligac/,/\bura\b/]},
 cuc:{label:"Motivos de CUC",metric:"Eventos CUC",unit:"eventos CUC",hints:[/\bcuc\b/,/motivos?\s+de\s+alarme/],columns:[/\bcuc\b/,/numero\s+de\s+eventos/,/motivos?\s+de\s+alarme/]},
 deslocamentos:{label:"Deslocamentos por conta",metric:"Deslocamentos registrados",unit:"deslocamentos",hints:[/deslocament/,/visitas?\s+tecnic/],columns:[/deslocament/,/numero\s+de\s+deslocament/]},
 indicadores:{label:"Indicadores",metric:"Valores de indicadores",unit:"valores da fonte",hints:[/\bindicadores?\b/,/\bkpis?\b/,/metricas?/],columns:[/\bindicador\b/,/\bmeta\b/,/\bresultado\b/]}
};
const badValue=x=>x==null||String(x).trim()==="";
function guess(text,which) {
 const v=norm(text).replace(/\.(xlsx|xls|csv)$/,"").replace(/\s*\(\d+\)\s*$/,"").replace(/\s+(copia|copy|v\d+)$/,"");
 const result=[];
 for(const [type,def] of Object.entries(specs)){
   const matches=def[which].filter(re=>re.test(v));
   if(matches.length)result.push({type,score:matches.length});
 }
 return result.sort((a,b)=>b.score-a.score);
}
function signature(headers){return headers.map(norm).filter(Boolean).sort().join("|").slice(0,600);}
function profile(grid,context={},previous){
 const cells=Array.isArray(grid)?grid:[];
 const filename=String(context.filename||"");
 const sheet=String(context.sheet||"");
 const file=guess(filename,"hints"),tab=guess(sheet,"hints");
 let top={index:0,score:-1,headers:[]};
 for(let i=0;i<Math.min(60,cells.length);i++){
   const row=Array.isArray(cells[i])?cells[i]:[];
   const asText=row.map(norm).filter(Boolean);
   const terms=asText.filter(v=>Object.values(specs).some(d=>d.columns.some(re=>re.test(v))));
   const textCount=asText.filter(v=>/[\p{L}]/u.test(v)).length;
   const score=terms.length*4+textCount-Math.max(0,row.length-textCount)*1.5;
   if(score>top.score){top={index:i,score,headers:row};}
 }
 const headerType=guess((top.headers||[]).join(" | "),"columns");
 const candidates=new Map();
 for(const [arr,weight,origin] of [[file,3,"Nome do arquivo"],[tab,2,"Nome da aba"],[headerType,5,"Cabeçalho"]]){
   for(const x of arr){const c=candidates.get(x.type)||{type:x.type,score:0,evidence:[]};c.score+=x.score*weight;c.evidence.push(origin);candidates.set(x.type,c);}
 }
 const ranked=[...candidates.values()].sort((a,b)=>b.score-a.score);
 const preferred=previous?.type&&previous.type!=="geral"?previous.type:ranked[0]?.type||"geral";
 const contradictory=file[0]&&headerType[0]&&file[0].type!==headerType[0].type;
 const hasHeaders=top.headers?.length>0;
 const columns=(top.headers||[]).map((raw,index)=>{
   let nonempty=0,numeric=0,dates=0,distinct=new Set(),samples=[];
   for(const row of cells.slice(top.index+1,top.index+501)){
     const v=Array.isArray(row)?row[index]:null;
     if(badValue(v))continue;
     nonempty++;distinct.add(norm(v));
     if(/^[+-]?\d+(?:[.,]\d+)?$/.test(String(v).trim()))numeric++;
     if(/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(String(v).trim()))dates++;
     if(samples.length<3)samples.push(String(v).slice(0,45));
   }
   return {index,name:String(raw||"Coluna "+(index+1)),nonempty,numeric,dates,distinct:distinct.size,samples};
 });
 const emptyCount=cells.slice(top.index+1,top.index+501).filter(r=>!Array.isArray(r)||!r.some(v=>!badValue(v))).length;
 const confidence=contradictory?"Revisão obrigatória":ranked.length&&ranked[0].score>=8?"Alta":ranked.length?"Moderada":"Revisão recomendada";
 return {filename,sheet,headerRow:previous?.headerRow??top.index,suggestedHeaderRow:top.index,preferredType:preferred,filenameType:file[0]?.type||null,headerType:headerType[0]?.type||null,confidence,conflict:!!contradictory,candidates:ranked.map(x=>({...x,label:specs[x.type]?.label||x.type})),columns,signature:signature(top.headers||[]),emptyRows:emptyCount,explanation:contradictory?"O nome do arquivo e os cabeçalhos indicam assuntos diferentes. Confirme antes de importar.":ranked.length?"Classificação baseada em "+[...new Set(ranked[0].evidence)].join(", ").toLowerCase()+".":"Arquivo sem classificação confiável. Confira a origem e as colunas.",hasHeaders};
}
function quality(rows,context={}){
 const issues=[],seen=new Map(),type=context.type||rows[0]?.type||"geral";
 const originals=Array.isArray(rows)?rows:[];
 const add=(code,severity,text,refs)=>issues.push({code,severity,text,refs:refs.slice(0,5)});
 if(!originals.length)add("EMPTY","high","Nenhum registro válido encontrado.",[]);
 const missingDate=originals.filter(r=>!r.date&&!r.periodStart&&!r.periodEnd);
 if(missingDate.length)add("MISSING_DATES","info",missingDate.length+" registros sem data ou competência; não serão distribuídos em dias fictícios.",missingDate);
 const badNumber=originals.filter(r=>["cuc","deslocamentos","indicadores"].includes(r.type||type)&&(!Number.isFinite(Number(r.value))||Number(r.value)<0));
 if(badNumber.length)add("INVALID_VALUE","high",badNumber.length+" quantidades/valores inválidos.",badNumber);
 const duplicates=[];
 for(const r of originals){
   const rt=r.type||type;
   // Para telefonia sem ID único, repetições são candidatas à revisão, não duplicatas certas.
   if(rt!=="ordens"||!r.id||String(r.id).startsWith("LINHA-"))continue;
   const key=JSON.stringify([rt,norm(r.company),norm(r.id)]);
   if(seen.has(key))duplicates.push(r);
   else seen.set(key,r);
 }
 if(duplicates.length)add("POSSIBLE_DUPLICATE","warning",duplicates.length+" identificadores de OS repetidos; nenhuma linha foi eliminada automaticamente.",duplicates);
 const stats={rows:originals.length,missingDates:missingDate.length,invalidValues:badNumber.length,possibleDuplicates:duplicates.length};
 return {stats,issues,confidence:issues.some(x=>x.severity==="high")?"Revisão necessária":issues.length?"Com ressalvas":"Conferida"};
}
function metricLabel(metric){
 const id=typeof metric==="string"?metric:metric?.id||"";
 const x=specs[id];
 if(x)return x.metric;
 return ({records:"Linhas registradas",done:"Registros concluídos",pending:"Registros pendentes",rate:"Taxa de conclusão",duration:"Duração média",indicadores:"Linhas de indicadores"})[id]||metric?.label||id;
}
function sourceSummary(row,lots=[]){
 const lot=lots.find(x=>x.id===row.lotId);
 return {file:row.source||lot?.filename||lot?.name||"Fonte desconhecida",sheet:lot?.sheet||"Não informada",line:row.line??null,type:row.type,unit:specs[row.type]?.unit||"registros"};
}
function analyze(rows,lots=[]){
 const data=Array.isArray(rows)?rows:[],notes=[];
 if(!data.length)return [];
 const groups=new Map();
 for(const r of data){const key=r.type||"geral";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 for(const [type,group] of groups){
   const s=specs[type],label=s?.label||"Registros";
   const unit=s?.unit||"registros";
   const weight=["cuc","deslocamentos","indicadores"].includes(type);
   const total=group.reduce((n,r)=>n+(weight&&Number.isFinite(Number(r.value))?Number(r.value):1),0);
   const origins=[...new Set(group.map(r=>r.source).filter(Boolean))];
   notes.push({type,kind:"volume",title:label+": "+new Intl.NumberFormat("pt-BR").format(total)+" "+unit,text:"Foram identificados "+group.length+" registros nesta fonte. O total considera "+(weight?"a quantidade informada em cada linha.":"uma unidade por registro."),basis:weight?"Soma dos valores válidos do campo de quantidade.":"Contagem de registros sem mistura de unidades.",caveat:"Não compara desempenho entre setores com bases distintas.",confidence:"Alta",unit,value:total,sources:origins,evidence:group.slice(0,3).map(r=>sourceSummary(r,lots))});
   if((type==="cuc"||type==="deslocamentos")&&total>0){
     const buckets=new Map();
     for(const r of group){
       const k=type==="cuc"?String(r.title||"Sem categoria"):String(r.company||"")+" · "+String(r.account||r.client||"Sem conta");
       if(!buckets.has(k))buckets.set(k,{total:0,examples:[]});
       const b=buckets.get(k);b.total+=Number(r.value)||0;if(b.examples.length<3)b.examples.push(r);
     }
     const sorted=[...buckets].sort((a,b)=>b[1].total-a[1].total),first=sorted[0];
     if(first)notes.push({type,kind:"concentration",title:"Maior concentração: "+first[0],text:"Este grupo representa "+(first[1].total/total*100).toFixed(1).replace(".",",")+"% do total do recorte.",basis:first[1].total+" ÷ "+total+" "+unit+" × 100.",caveat:"Concentração não demonstra causa nem define uma meta.",confidence:"Alta",unit,value:first[1].total,sources:origins,evidence:first[1].examples.map(r=>sourceSummary(r,lots))});
   }
   if(type==="ordens"){
      const pend=group.filter(r=>["Pendente","Em andamento"].includes(r.status));
      if(pend.length)notes.push({type,kind:"attention",title:pend.length+" OS em aberto no recorte",text:"Revisar as ordens marcadas como pendentes ou em andamento.",basis:"Contagem dos status de OS reconhecidos na planilha.",caveat:"Sem prazo contratado não é possível afirmar atraso.",confidence:"Alta",unit:"ordens de serviço",value:pend.length,sources:origins,evidence:pend.slice(0,3).map(r=>sourceSummary(r,lots))});
   }
 }
 // Comparações somente com datas individuais em ambos os períodos e cobertura suficiente.
 const dated=data.filter(r=>r.date&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&["ordens","ligacoes"].includes(r.type));
 for(const type of ["ordens","ligacoes"]){
   const arr=dated.filter(r=>r.type===type);
   const days=[...new Set(arr.map(r=>r.date))].sort();
   if(days.length<6)continue;
   const last=days.at(-1),ms=Date.parse(last+"T12:00:00Z"),windowDays=7;
   const current=arr.filter(r=>Date.parse(r.date+"T12:00:00Z")>ms-(windowDays-1)*86400000);
   const previous=arr.filter(r=>{const v=Date.parse(r.date+"T12:00:00Z");return v<=ms-(windowDays-1)*86400000&&v>ms-(windowDays*2-1)*86400000;});
   const currentDays=new Set(current.map(r=>r.date)).size,prevDays=new Set(previous.map(r=>r.date)).size;
   if(currentDays<4||prevDays<4||!previous.length)continue;
   const change=(current.length-previous.length)/previous.length*100;
   notes.push({type,kind:"comparison",title:"Variação observada em "+(specs[type]?.label||type),text:current.length+" registros nos últimos 7 dias da fonte versus "+previous.length+" nos 7 dias anteriores ("+change.toFixed(1).replace(".",",")+"%).",basis:"Contagem por data individual. Janela final terminada em "+last+".",caveat:"Períodos de atividade podem ser incompletos; variação não indica motivo nem qualidade.",confidence:"Moderada",unit:"registros",value:current.length,sources:[...new Set(arr.map(r=>r.source).filter(Boolean))],evidence:current.slice(0,3).map(r=>sourceSummary(r,lots))});
 }
 return notes;
}
function answer(question,rows,lots=[]){
 const q=norm(question),list=Array.isArray(rows)?rows:[],insights=analyze(list,lots);
 if(!list.length)return "Não há dados disponíveis. Importe uma planilha ou ajuste os filtros.";
 if(/arquivo|planilh|qualidade|inconsisten|erro|duplic/.test(q)){
  const by=new Map();
  for(const r of list){const k=r.source||"Fonte não informada";if(!by.has(k))by.set(k,[]);by.get(k).push(r);}
  return [...by].map(([name,arr])=>{const v=quality(arr);return name+": "+arr.length+" registros. "+(v.issues.length?v.issues.map(x=>x.text).join(" "):"Nenhuma inconsistência coberta pelas regras detectada.")}).join("\n\n");
 }
 if(/setor|departament/.test(q)){
   const groups=new Map();for(const r of list)groups.set(r.sector,(groups.get(r.sector)||0)+1);
   return [...groups].sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+": "+v+" linhas").join(" · ")+". Comparação de linhas, não de desempenho entre unidades diferentes.";
 }
 let chosen=insights;
 if(/conta|desloc/.test(q))chosen=chosen.filter(x=>x.type==="deslocamentos"||x.kind==="concentration");
 else if(/ligac|chamad|telefon/.test(q))chosen=chosen.filter(x=>x.type==="ligacoes");
 else if(/\bos\b|ordem|penden|abert/.test(q))chosen=chosen.filter(x=>x.type==="ordens");
 else if(/cuc|evento/.test(q))chosen=chosen.filter(x=>x.type==="cuc");
 else if(/compar|subiu|caiu|pior|melhor|evolu|variac/.test(q))chosen=chosen.filter(x=>x.kind==="comparison");
 else if(/atenc|prior|problema|gargalo/.test(q))chosen=chosen.filter(x=>x.kind==="attention"||x.kind==="concentration");
 if(!chosen.length)return "Não há evidências suficientes neste recorte para responder com segurança. Confira os arquivos, filtros e datas disponíveis.";
 return chosen.slice(0,5).map(x=>x.title+"\n"+x.text+"\nBase: "+x.basis+"\nLimitação: "+x.caveat+"\nOrigem: "+x.evidence.map(e=>e.file+" · aba "+e.sheet+(e.line?" · linha "+e.line:"")).join("; ")).join("\n\n");
}
return {specs,norm,guess,profile,quality,metricLabel,sourceSummary,analyze,answer};
});