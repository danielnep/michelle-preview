/* Revisão por todas as linhas/fontes. IA escolhe a leitura; o software calcula. */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.MCAutoReview=api;})(typeof window!=="undefined"?window:globalThis,function(root){
  "use strict";
  const state={phase:"idle",completed:0,total:0,error:"",result:null,signature:"",registry:[],generation:0,persistenceError:"",reviewWarning:""};
  let timer=null,running=false,pending=false,restored=false,manualRequested=false;
  const active=lots=>(lots||[]).filter(l=>!l.deleted&&!l.archived&&!l.supersededBy);
  const plain=(v,n=500)=>String(v??"").replace(/\*/g,"").replace(/`/g,"").replace(/^\s*#{1,6}\s+/gm,"").trim().slice(0,n);
  const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rounded=n=>Math.round(n*1e6)/1e6;
  const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
  const fingerprint=lots=>active(lots).map(l=>[l.id,l.hash,l.created,l.rows?.length||0,l.sheet,l.type,l.sector,JSON.stringify(l.mapping||{})].join(":")).sort().join("|");
  function number(value){
    if(typeof value==="number")return Number.isFinite(value)?value:null;
    let s=String(value??"").trim().replace(/\s+/g,"").replace(/^R\$/i,"").replace(/%$/,"");
    if(!s||!/^[+-]?[\d.,]+$/.test(s))return null;
    if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");
    else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
    const n=Number(s);return Number.isFinite(n)?n:null;
  }
  const identifier=name=>/\b(id|codigo|cod|cpf|cnpj|cep|telefone|fone|conta|matricula|identificador|placa)\b/.test(norm(name)) || /numero.*\b(os|chamado|protocolo|cliente)\b/.test(norm(name));
  function profiles(lots,rows){
    const grouped=new Map();for(const row of rows||[]){if(!grouped.has(row.lotId))grouped.set(row.lotId,[]);grouped.get(row.lotId).push(row);}
    return active(lots).map(l=>{
      const list=Array.isArray(rows)?grouped.get(l.id)||[]:l.rows||[],columns=new Map(),dates=[],months=new Map();
      let timed=0,minutes=0,known=0,done=0,pendingCount=0,quantity=0;
      for(const row of list){
        if(row.date)dates.push(row.date);
        if(Number.isFinite(row.duration)){timed++;minutes+=row.duration;}
        if(["Concluído","Pendente","Em andamento","Cancelado","Não atendido"].includes(row.status))known++;
        if(row.status==="Concluído")done++;
        if(["Pendente","Em andamento"].includes(row.status))pendingCount++;
        quantity+=number(row.value)||0;
        const date=row.date||((row.periodStart&&row.periodEnd&&row.periodStart.slice(0,7)===row.periodEnd.slice(0,7))?row.periodStart:null);
        if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){
          const key=date.slice(0,7);if(!months.has(key))months.set(key,{period:key,rows:0,quantity:0,first:date,last:row.date||row.periodEnd||date});
          const month=months.get(key);month.rows++;month.quantity+=number(row.value)||0;
          month.first=month.first<date?month.first:date;const end=row.date||row.periodEnd||date;month.last=month.last>end?month.last:end;
        }
        for(const [name,value]of Object.entries(row.raw||{})){
          if(!columns.has(name))columns.set(name,{name:plain(name||"Coluna sem nome",100),filled:0,numeric:0,min:Infinity,max:-Infinity,sum:0,percentage:0,currency:0});
          const c=columns.get(name),filled=value!=null&&String(value).trim()!=="";
          if(!filled)continue;c.filled++;
          if(identifier(name))continue;
          const n=number(value);if(n===null)continue;
          c.numeric++;c.sum+=n;c.min=Math.min(c.min,n);c.max=Math.max(c.max,n);
          if(String(value).includes("%"))c.percentage++;if(/R\$/i.test(String(value)))c.currency++;
        }
      }
      dates.sort();
      const firstDate=l.periodStart||dates[0]||null,lastDate=l.periodEnd||dates.at(-1)||null;
      const schema=hash([...columns.keys()].map(norm).sort().join("|"));
      const listMetrics=[];
      const add=(suffix,label,value,unit,operation,column="",coverage=list.length)=>{
        if(!Number.isFinite(value))return;
        listMetrics.push({id:l.id+":"+suffix,sourceId:l.id,label:plain(label,110),value:rounded(value),unit,operation,column,
          coverage,rows:list.length,periodStart:firstDate,periodEnd:lastDate,
          comparisonKey:[l.type||"geral",schema,operation,norm(column),unit].join(":"),file:plain(l.name||l.filename,160),sheet:plain(l.sheet,100)});
      };
      // A unidade acompanha a entidade de cada registro, nao o formato fisico da planilha.
      const entities={ligacoes:["Ligações registradas","ligações"],ordens:["Ordens de serviço registradas","ordens de serviço"],geral:["Registros da fonte","registros"],cuc:["Categorias CUC registradas","categorias CUC"],deslocamentos:["Contas ou categorias de deslocamento","registros de deslocamento"],indicadores:["Indicadores registrados","indicadores"]};
      const [recordLabel,recordUnit]=entities[l.type]||entities.geral;
      add("records",recordLabel,list.length,recordUnit,"count");
      if(["cuc","deslocamentos"].includes(l.type))add("quantity",l.type==="cuc"?"Eventos registrados":"Deslocamentos registrados",quantity,l.type==="cuc"?"eventos":"deslocamentos","quantity");
      if(known){add("done","Registros concluídos",done,"registros","done");add("pending","Registros em aberto",pendingCount,"registros","pending");add("rate","Conclusão entre status conhecidos",done/known*100,"%","rate","status",known);}
      if(timed)add("duration","Duração média registrada",minutes/timed,"minutos","averageDuration","duration",timed);
      const fieldList=[...columns.entries()].map(([original,c],index)=>{
        const compatible=c.numeric>0&&c.numeric===c.filled&&!identifier(original);
        const percentage=c.percentage>0||/percent|taxa|%/.test(norm(original));
        const unit=percentage?"%":c.currency>0||/r\$|\bbrl\b/.test(norm(original))?"R$":/quantidade|qtd|total de|numero de eventos/.test(norm(original))?"quantidade":"valor informado";
        if(compatible){
          add("c"+index+":average","Média de "+c.name,c.sum/c.numeric,unit,"average",original,c.numeric);
          add("c"+index+":min","Menor "+c.name,c.min,unit,"min",original,c.numeric);
          add("c"+index+":max","Maior "+c.name,c.max,unit,"max",original,c.numeric);
          // Saldos, taxas e fotografias de estoque não são acumulados automaticamente.
          if(!percentage&&!/saldo|estoque|acumulad|media|indice/.test(norm(original)) && (unit!=="valor informado"||/quant|qtd|total|volume|valor|custo|receita|despesa/.test(norm(original))))
            add("c"+index+":sum","Total de "+c.name,c.sum,unit,"sum",original,c.numeric);
        }
        return {name:c.name,filled:c.filled,missing:list.length-c.filled,shape:identifier(original)?"identificador":compatible?"medida numérica":c.numeric?"conteúdo misto":"texto ou data",unit:compatible?unit:null,index};
      });
      if(months.size>1)for(const month of [...months.values()].sort((a,b)=>a.period.localeCompare(b.period))){
        const weighted=["cuc","deslocamentos"].includes(l.type),unit=weighted?(l.type==="cuc"?"eventos":"deslocamentos"):recordUnit;
        add("month:"+month.period,(weighted?"Quantidade":recordLabel.replace(/ registrados?$| registradas$/,""))+" em "+month.period,weighted?month.quantity:month.rows,unit,"monthly", "",month.rows);
        const metric=listMetrics.at(-1);metric.domain="temporal";metric.periodStart=month.first;metric.periodEnd=month.last;
      }
      return {id:l.id,file:plain(l.name||l.filename||"Arquivo importado",160),sheet:plain(l.sheet||"Aba não informada",100),type:l.type||"geral",sector:l.sector||"",rows:list.length,
        periodStart:firstDate,periodEnd:lastDate,columns:fieldList,metrics:listMetrics,quality:{rowsRead:list.length,columnsRead:columns.size,dated:dates.length,knownStatus:known,timed},
        titleHint:plain((l.name||l.filename||"Arquivo importado").replace(/\.[^.]+$/,"").replace(/[_-]+/g," "),110)};
    });
  }
  function batches(catalog,max=16000){
    const parts=[];
    for(const source of catalog){
      const sourceParts=[];let cursor=0;
      const make=columns=>{
        const names=new Set(columns.map(c=>c.name));
        const metrics=source.metrics.filter(m=>m.domain!=="temporal"&&(!m.column||["status","duration"].includes(m.column)||names.has(plain(m.column,100))))
          .map(({file,sheet,...metric})=>metric);
        return {...source,columns,metrics};
      };
      if(!source.columns.length)sourceParts.push(make([]));
      while(cursor<source.columns.length){
        let count=Math.min(10,source.columns.length-cursor),part=make(source.columns.slice(cursor,cursor+count));
        while(JSON.stringify({sources:[part]}).length>max&&count>1){count=Math.max(1,Math.floor(count/2));part=make(source.columns.slice(cursor,cursor+count));}
        sourceParts.push(part);cursor+=count;
      }
      const temporal=source.metrics.filter(m=>m.domain==="temporal").map(({file,sheet,...metric})=>metric);
      for(let i=0;i<temporal.length;i+=12)sourceParts.push({...source,columns:[],metrics:temporal.slice(i,i+12)});
      sourceParts.forEach((part,i)=>parts.push({...part,partId:source.id+"/"+i,part:i+1,parts:sourceParts.length}));
    }
    const out=[];let current=[];
    for(const part of parts){
      if(JSON.stringify({sources:[part]}).length>max)throw Error("Uma parte da fonte é muito extensa para revisão. Reduza nomes de colunas e tente novamente.");
      if(current.length&&(current.length>=4||JSON.stringify({sources:[...current,part]}).length>max)){out.push(current);current=[];}
      current.push(part);
    }
    if(current.length)out.push(current);return out;
  }
  function combine(reviews){
    const unique=(items,key)=>[...new Map(items.map(item=>[item[key],item])).values()];
    const first=reviews[0]||{dashboard:{}};
    return {summary:reviews.map(r=>r.summary).filter(Boolean).join("\n"),sources:unique(reviews.flatMap(r=>r.sources||[]),"id"),
      insights:reviews.flatMap(r=>r.insights||[]),dashboard:{title:first.dashboard.title||"Leitura dos arquivos importados",description:first.dashboard.description||"",
        order:[...new Set(reviews.flatMap(r=>r.dashboard.order||[]))],metrics:unique(reviews.flatMap(r=>r.dashboard.metrics||[]),"metricId"),blocks:unique(reviews.flatMap(r=>r.dashboard.blocks||[]),"id")}};
  }
  const bridge=()=>root.MichelleBridge;
  const allowed=()=>!root.MCAccess||root.MCAccess.owner||root.MCAccess.rights?.ai;
  function refresh(){bridge()?.render();}
  async function persist(){
    if(root.MCPreview?.enabled || !root.MCAccess || !root.fetch)return;
    try{
      const res=await root.fetch("/api/analysis-review",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({signature:state.signature,result:state.result,registry:state.registry})});
      if(!res.ok)throw Error("Não foi possível guardar a revisão.");state.persistenceError="";
    }catch(error){state.persistenceError=error.message;}
  }
  async function run(){
    if(running){pending=true;return;}
    if(root.MCPreview?.enabled)return;
    if(!allowed()||!root.MCAI?.request||!bridge()?.getState().ready||(!root.MCAI.consent()&&!manualRequested))return;
    manualRequested=false;
    const lots=active(bridge().getImports());
    if(!lots.length){state.result=null;state.phase="idle";state.signature="";state.registry=[];refresh();return;}
    const generation=state.generation,signature=fingerprint(lots);
    if(state.result&&signature===state.signature&&state.phase==="ready")return;
    running=true;pending=false;state.phase="analyzing";state.completed=0;state.error="";state.reviewWarning="";
    state.result=null;state.registry=[];state.total=lots.length;refresh();
    try{
      const catalog=profiles(lots,bridge().getAll()),groups=batches(catalog),reviews=[],completed=new Set();
      const partsDone=new Map();
      async function requestReview(sources){
        let lastError;
        for(let attempt=0;attempt<3;attempt++){
          try{
            const response=await root.MCAI.request("review",{context:{
              scope:"Fontes e partes independentes; números calculados pelo sistema, sem células pessoais.",
              totalSources:catalog.length,sources
            }});
            if(!response?.review||sources.some(part=>!response.review.sources?.some(s=>s.id===part.id&&s.partId===part.partId)))
              throw Error("A revisão não cobriu todas as fontes desta etapa.");
            return response.review;
          }catch(error){
            lastError=error;
            if(error.status!==429||attempt===2)break;
            await new Promise(resolve=>root.setTimeout(resolve,attempt===0?15000:45000));
          }
        }
        throw lastError;
      }
      for(const sources of groups){
        if(generation!==state.generation)break;
        let groupReviews;
        try{groupReviews=[await requestReview(sources)];}
        catch(error){
          // Uma resposta incompleta nao deve eliminar as outras fontes do lote.
          if(sources.length===1)throw error;
          groupReviews=[];
          for(const part of sources){
            if(generation!==state.generation)break;
            groupReviews.push(await requestReview([part]));
          }
        }
        if(generation!==state.generation)break;
        for(const part of sources){
          const count=(partsDone.get(part.id)||0)+1;partsDone.set(part.id,count);if(count===part.parts)completed.add(part.id);
        }
        reviews.push(...groupReviews);state.completed=completed.size;refresh();
      }
      if(generation!==state.generation || signature!==fingerprint(bridge().getImports())){pending=true;return;}
      if(completed.size!==catalog.length)throw Error("A revisão ainda não cobriu todos os arquivos.");
      // Uma segunda leitura procura implicações entre todas as fontes quando cabem na mesma fotografia.
      if(catalog.length>1){
        const wanted=new Set(reviews.flatMap(r=>r.dashboard.metrics.map(m=>m.metricId)));
        const overview=catalog.map(p=>({...p,partId:p.id+"/overview",columns:[],metrics:p.metrics.filter(m=>wanted.has(m.id)||m.operation==="count"||m.operation==="rate").slice(0,5).map(({file,sheet,...m})=>m)}));
        const packets=[];let packet=[];
        for(const source of overview){
          if(packet.length&&(packet.length>=12||JSON.stringify({sources:[...packet,source]}).length>15000)){packets.push(packet);packet=[];}
          packet.push(source);
        }
        if(packet.length)packets.push(packet);
        const consolidated=[];
        for(const sources of packets){
          try{
            const global=await requestReview(sources);
            if(generation!==state.generation||signature!==fingerprint(bridge().getImports())){pending=true;return;}
            consolidated.push(global);
          }catch(error){
            // A sintese e complementar; nao invalida os arquivos ja analisados.
            state.reviewWarning="Síntese geral indisponível; análises individuais concluídas.";
            break;
          }
        }
        reviews.unshift(...consolidated);
      }
      state.result=combine(reviews);state.registry=catalog.flatMap(p=>p.metrics);state.signature=signature;state.phase="ready";
      state.result.coverage={sources:catalog.length,files:new Set(lots.map(l=>l.fileId||l.hash||l.id)).size,rows:catalog.reduce((n,p)=>n+p.rows,0),columns:catalog.reduce((n,p)=>n+p.columns.length,0),completedAt:new Date().toISOString()};
      if(!state.result.dashboard.metrics.length)state.result.dashboard.metrics=catalog.map(p=>({metricId:p.metrics[0].id,title:(state.result.sources.find(s=>s.id===p.id)?.title||p.titleHint)+" · registros",description:"Contagem desta fonte, sem somar outras planilhas."}));
      root.dispatchEvent?.(new root.CustomEvent("mc:automatic-review-ready",{detail:state.result}));
      refresh();await persist();refresh();
    }catch(error){if(generation===state.generation){state.phase="error";state.error=error.message;refresh();}}
    finally{running=false;if(pending){pending=false;timer=root.setTimeout(()=>void run(),400);}}
  }
  function schedule(force=false){
    if(root.MCPreview?.enabled)return;
    if(force)manualRequested=true;
    state.generation++;state.phase="queued";state.completed=0;state.total=active(bridge()?.getImports()||[]).length;state.error="";state.result=null;
    if(timer)root.clearTimeout(timer);pending=running;timer=root.setTimeout(()=>void run(),650);
    refresh();
  }
  function invalidate(){state.generation++;state.result=null;state.signature="";state.registry=[];state.phase="idle";if(root.MCAI?.consent())schedule();}
  function values(rows){
    if(!state.result||state.signature!==fingerprint(bridge()?.getImports()||[]))return [];
    const recalculated=profiles(bridge().getImports(),rows).flatMap(p=>p.metrics),byId=new Map(recalculated.map(m=>[m.id,m]));
    return state.result.dashboard.metrics.map(p=>({...byId.get(p.metricId),title:plain(p.title),description:plain(p.description)})).filter(m=>m.id&&m.rows>0);
  }
  const fmt=n=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(n);
  function current(){return state.result&&state.signature===fingerprint(bridge()?.getImports()||[])?state.result:null;}
  function status(){
    if(!allowed())return "";
    const busy=["queued","analyzing"].includes(state.phase);
    if(!busy&&state.phase!=="error"&&!current())return "";
    return '<section class="mc-review-status '+(busy?'is-working':'')+'" role="status" aria-live="polite"><span class="mc-review-spark" aria-hidden="true">✦</span><div><strong>'+(busy?'Copiloto conferindo os arquivos':state.phase==='error'?'Revisão precisa de atenção':'Leitura inteligente concluída')+'</strong><p>'+esc(busy?(state.completed+' de '+state.total+' fontes conferidas. A importação já está salva.'):state.phase==='error'?state.error:state.result.coverage.files+' arquivos · '+state.result.coverage.sources+' abas/fontes · '+fmt(state.result.coverage.rows)+' linhas lidas')+'</p></div>'+(!busy?'<button class="btn" type="button" data-auto-review-retry>Revisar novamente</button>':'')+'</section>';
  }
  function metricsHTML(rows){
    const list=values(rows);if(!list.length)return "";
    return '<div class="dash-metrics mc-auto-metrics">'+list.map(m=>'<article class="dash-metric"><span>'+esc(m.title||m.label)+'</span><strong>'+fmt(m.value)+(m.unit==='%'?'%':'')+'</strong><small>'+esc(m.unit==='%'?'':m.unit)+'</small><p>'+esc(m.description)+'</p><details><summary>Conferir origem e cobertura</summary><p>'+esc(m.file)+' · '+esc(m.sheet)+' · '+esc(m.column||'linhas da fonte')+'</p><p>'+fmt(m.coverage)+' valores de '+fmt(m.rows)+' linhas no recorte.</p></details></article>').join('')+'</div>';
  }
  function insightsHTML(){
    if(!state.result||state.signature!==fingerprint(bridge()?.getImports()||[]))return "";
    const names={attention:'Ponto de atenção',positive:'Ponto positivo',negative:'Ponto negativo',comparison:'Comparativo',idea:'Ideia e percepção'};
    const registry=new Map(state.registry.map(m=>[m.id,m]));
    return '<section class="mc-review-insights" aria-label="Percepções do Copiloto"><header><h2>'+esc(state.result.dashboard.title)+'</h2><p>'+esc(state.result.dashboard.description)+'</p><small>Análise do conjunto importado. Os indicadores abaixo acompanham os filtros do painel.</small></header>'+(!state.result.insights.length?'<p>Nenhuma percepção adicional foi sustentada nesta revisão. Os indicadores foram organizados por fonte.</p>':'<div class="mc-review-findings">'+state.result.insights.map(i=>{
      const evidence=i.evidenceIds.map(id=>registry.get(id)).filter(Boolean),comparison=i.comparison;
      let difference='';if(comparison){const a=registry.get(comparison.leftId),b=registry.get(comparison.rightId);if(a&&b)difference='<p>Diferença entre as fontes: '+fmt(b.value-a.value)+' '+esc(b.unit)+(a.value?'; variação de '+fmt((b.value-a.value)/Math.abs(a.value)*100)+'%':'')+'.</p>';}
      return '<article class="mc-review-finding '+i.kind+'"><span class="mc-review-kind">'+names[i.kind]+'</span><h3>'+esc(i.title)+'</h3><p>'+esc(i.interpretation)+'</p>'+(i.action?'<p class="mc-review-action">'+esc(i.action)+'</p>':'')+'<details><summary>Evidências e limites · confiança '+esc(i.confidence)+'</summary>'+evidence.map(m=>'<p>'+esc(m.label)+': '+fmt(m.value)+' '+esc(m.unit)+' · '+esc(m.file)+' / '+esc(m.sheet)+'</p>').join('')+difference+'<p>As causas sugeridas são hipóteses; não foram executadas mudanças nos dados.</p>'+i.relatedIndicators.map(r=>'<p>Para aprofundar: '+esc(r.name)+' — '+esc(r.reason)+' (indicador a coletar).</p>').join('')+'</details></article>';
    }).join('')+'</div>')+'</section>';
  }
  function textSummary(){if(!current())return "";return state.result.insights.map(i=>[i.title,i.interpretation,i.action].filter(Boolean).join('\n')).join('\n\n');}
  async function restore(){
    if(root.MCPreview?.enabled)return;
    if(restored||!bridge()?.getState().ready)return;restored=true;
    if(root.MCAccess&&allowed()&&root.fetch){try{
      const res=await root.fetch('/api/analysis-review',{credentials:'same-origin',cache:'no-store'});
      if(res.ok){const saved=await res.json();if(saved?.result&&saved.signature===fingerprint(bridge().getImports())){state.result=saved.result;state.registry=saved.registry||[];state.signature=saved.signature;state.phase='ready';root.dispatchEvent?.(new root.CustomEvent("mc:automatic-review-ready",{detail:state.result}));refresh();return;}}
    }catch(_){}}
    if(bridge().getImports().length&&root.MCAI?.consent())schedule();
  }
  if(root.document){
    const key='michelle.ai.automatic-review.v2';
    try{if(!root.localStorage.getItem(key)){root.MCAI?.setConsent(true);root.localStorage.setItem(key,'1');}}catch(_){}
    root.document.addEventListener('click',e=>{if(e.target.closest('[data-auto-review-retry]')){state.signature='';schedule(true);}});
    root.addEventListener('mc:app-ready',()=>void restore());
  }
  return {profiles,batches,fingerprint,combine,number,plain,state,schedule,run,invalidate,status,metricsHTML,insightsHTML,textSummary,restore,
    current,block:id=>current()?.dashboard.blocks.find(b=>b.id===id)};
});
