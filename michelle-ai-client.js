/* Copiloto: cliente sem segredo, agrega evidências calculadas localmente. */
(function(root) {
  "use strict";
  const SETTINGS = "michelle.ai.behavior.v1";
  const memory = () => {
    try { return JSON.parse(localStorage.getItem(SETTINGS) || "{}"); } catch (_) { return {}; }
  };
  const save = data => { try { localStorage.setItem(SETTINGS, JSON.stringify(data)); } catch (_) {} };
  const consent = () => memory().automaticInsights !== false;
  function setConsent(yes) { const m=memory();m.automaticInsights=!!yes;save(m); }
  // O Copiloto usa a API protegida da mesma hospedagem Railway.
  function apiUrl() {return "/api/michelle-ai";}
  async function request(mode, data={}) {
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),mode==="review"?60000:27000);
    try {
      const response=await fetch(apiUrl(),{
        method:"POST",signal:ctrl.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode,...data})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok) { const error=Error(body.error || "A IA está indisponível ("+response.status+").");error.status=response.status;throw error; }
      return body;
    } catch(error) {
      if(error?.name==="AbortError") throw Error("A IA demorou demais. Tente novamente.");
      throw error;
    } finally { clearTimeout(timer); }
  }
  // Uma única fotografia dos dados alimenta o chat e os insights. Não envia linhas brutas.
  function context(rows=[], imports=[], sectors=[], options={}) {
    const selected=Array.isArray(rows)?rows:[];
    const all=Array.isArray(options.allRows)?options.allRows:selected;
    const question=String(options.question||"").toLocaleLowerCase("pt-BR");
    const names=new Map((sectors||[]).map(s=>[s.id,s.name]));
    const fmt=n=>Math.round(n*10)/10;
    const percentage=(part,total)=>total?fmt(part/total*100):null;
    const counted=type=>["cuc","deslocamentos"].includes(type);
    const top=(map,limit=6)=>[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit)
      .map(([label,value])=>({label:String(label).slice(0,110),value,percent:percentage(value,[...map.values()].reduce((a,b)=>a+b,0))}));
    const add=(map,k,v=1)=>map.set(k,(map.get(k)||0)+v);
    function summarize(dataset,rich=true) {
      const types=new Map(),bySector=new Map(),byMonth=new Map(),byStatus=new Map();
      const dimensions={title:new Map(),direction:new Map(),client:new Map(),operator:new Map(),company:new Map()};
      for(const r of dataset) {
        const type=r.type||"geral",weighted=counted(type);
        if(!types.has(type))types.set(type,{type,rows:0,quantity:0,unit:weighted?"quantidade informada":"registros",dated:0,timed:0,totalMinutes:0,done:0,pending:0,knownStatus:0});
        const v=types.get(type);
        v.rows++;v.quantity+=weighted?(Number.isFinite(Number(r.value))?Number(r.value):0):1;
        if(r.date){v.dated++;if(/^\d{4}-\d{2}-\d{2}$/.test(r.date))add(byMonth,type+" · "+r.date.slice(0,7),weighted?(Number(r.value)||0):1);}
        if(Number.isFinite(r.duration)){v.timed++;v.totalMinutes+=r.duration;}
        if(r.status==="Concluído")v.done++;
        if(["Pendente","Em andamento"].includes(r.status))v.pending++;
        if(["Concluído","Pendente","Em andamento","Cancelado","Não atendido"].includes(r.status))v.knownStatus++;
        add(bySector,names.get(r.sector)||r.sector||"Não identificado");
        add(byStatus,r.status||"Não informado");
        for(const [field,map] of Object.entries(dimensions)){
          const value=String(r[field]||"").trim();
          if(value && value!=="Não informado")add(map,type+" · "+value,weighted?(Number(r.value)||0):1);
        }
      }
      const s=root.MCData?.stats(dataset)||{};
      const kinds=[...types.values()].map(x=>({...x,completionPercent:x.knownStatus?percentage(x.done,x.knownStatus):null,averageDurationMinutes:x.timed?fmt(x.totalMinutes/x.timed):null}));
      const breakdown={};
      const requested=/client|cliente|conta/.test(question)?"client":/operad|equipe|atendente/.test(question)?"operator":/dire[cç]|origem|recebid|realizad/.test(question)?"direction":/empresa/.test(question)?"company":"title";
      if(rich){
        for(const field of new Set([requested,"direction","title"])){
          breakdown[field]=top(dimensions[field],field===requested?12:5);
        }
      }
      return {
        totalRows:dataset.length,
        byType:kinds,bySector:[...bySector].map(([sector,rows])=>({sector,rows,percent:percentage(rows,dataset.length)})),
        status:[...byStatus].map(([status,rows])=>({status,rows,percent:percentage(rows,dataset.length)})),
        completionPercent:s.rate??null,
        temporalSeries:rich?[...byMonth].sort((a,b)=>a[0].localeCompare(b[0])).slice(-18).map(([period,value])=>({period,value})):[],
        topGroups:breakdown
      };
    }
    const activeFiles=(imports||[]).filter(f=>!f.deleted&&!f.archived&&!f.supersededBy);
    const groups=new Map();
    for(const r of all) {
      const key=String(r.lotId||r.source||"sem-fonte");
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(r);
    }
    const fileCatalog=activeFiles.map(f=>{
      const list=groups.get(String(f.id))||groups.get(String(f.name||f.filename))||[];
      const first=list[0];
      const weighted=counted(f.type||first?.type);
      const status=new Map();
      for(const r of list)add(status,r.status||"Não informado");
      const dates=list.map(r=>r.date||r.periodEnd||r.periodStart).filter(Boolean).sort();
      return {
        id:String(f.id||"").slice(0,70),file:String(f.name||f.filename||"Planilha").slice(0,120),
        sheet:String(f.sheet||"Não informada").slice(0,90),
        type:f.type||first?.type||"geral",sector:names.get(f.sector)||f.sector||null,
        rows:list.length,quantity:weighted?fmt(list.reduce((n,r)=>n+(Number(r.value)||0),0)):list.length,
        unit:weighted?"quantidade informada":"registros",
        firstDate:dates[0]||null,lastDate:dates.at(-1)||null,
        status:[...status].slice(0,6),
        columns:Object.keys(first?.raw||{}).slice(0,22)
      };
    });
    const findings=(root.MCAnalysis?.analyze(selected,imports)||[]).slice(0,7).map(n=>({
      title:n.title,conclusion:n.text,basis:n.basis,limit:n.caveat,
      sources:(n.evidence||[]).slice(0,2).map(e=>({file:e.file,sheet:e.sheet,line:e.line}))
    }));
    const localInsights=(root.MCIntelligence?.analyze(selected)?.cards||[]).slice(0,5).map(n=>({
      title:n.title,conclusion:n.text,basis:n.basis,limit:n.caveat
    }));
    const result={
      scope:"Catálogo: todos os arquivos ativos deste navegador. Resumo selecionado: filtros atuais. Rankings parciais, não linhas individuais.",
      totalImportedFiles:activeFiles.length,allData:summarize(all,false),
      selectedData:summarize(selected,true),files:fileCatalog,
      calculatedFindings:findings,calculatedInsights:localInsights,
      automaticReview:root.MCAutoReview?.current()?{
        coverage:root.MCAutoReview.current().coverage,
        insights:root.MCAutoReview.current().insights.slice(0,5).map(i=>({title:i.title,interpretation:i.interpretation,action:i.action,confidence:i.confidence,sourceIds:i.sourceIds}))
      }:null,
      analyzedAt:new Date().toISOString()
    };
    // Reserva espaço para as fontes: nunca envia um JSON acima do teto do servidor.
    const size=()=>JSON.stringify(result).length;
    if(size()>15500)result.selectedData.topGroups={};
    if(size()>15500)result.selectedData.temporalSeries=[];
    if(size()>15500)result.calculatedInsights=result.calculatedInsights.slice(0,2);
    if(size()>15500)result.calculatedFindings=result.calculatedFindings.slice(0,3);
    if(size()>15500)for(const file of result.files){file.columns=file.columns.slice(0,6);file.status=[];}
    if(size()>15500){
      result.fileCatalogTruncated=true;
      result.files=result.files.slice(0,Math.max(1,Math.floor(result.files.length/2)));
    }
    result.coverage={completeRowsAnalyzed:all.length,selectedRowsAnalyzed:selected.length,
      visibleFileProfiles:result.files.length,totalImportedFiles:activeFiles.length,
      detailLimit:"O Copiloto recebe agregações e nomes de colunas, não o conteúdo integral de cada linha."};
    return result;
  }
  function shape(val) {
    const s=String(val??"").trim();
    if(!s) return "vazio";
    if(/^\d{4}-\d{2}-\d{2}/.test(s)||/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return "data";
    if(/^-?[\d.,]+\s*%$/.test(s)) return "percentual";
    if(/^-?[\d.,]+$/.test(s)) return "número";
    if(/^\d\d?:\d\d(:\d\d)?$/.test(s)) return "horário";
    return "texto ("+Math.min(s.length,80)+" caracteres)";
  }
  function interpretationContext(p, fields=[], sectors=[], allowedFields=[]) {
    const grid=(p.grid||[]).slice((p.headerRow||0)+1,(p.headerRow||0)+7);
    return {
      name:String(p.name||"").slice(0,160),
      sheet:String(p.sheet||"").slice(0,100),
      headers:fields.map(x=>String(x??"").slice(0,100)).slice(0,100),
      // Nunca enviamos valores originais, CPF, telefones ou nomes de pessoas ao modelo.
      columnShapes:fields.map((_,i)=>grid.map(row=>shape(row?.[i]))).slice(0,100),
      headerRow:p.headerRow||0,
      allowedFields,allowedSectors:sectors.map(x=>({id:x.id,name:x.name})),
      localDetection:{type:p.type,sector:p.sector,confidence:p.detectInfo?.confidence||"não informado"}
    };
  }
  function topic(text) {
    const q=String(text||"").toLocaleLowerCase("pt-BR");
    if(/qualidade|auditor/.test(q))return "Qualidade";
    if(/facilit|faciliti/.test(q))return "Facilities";
    if(/portaria|remota|ligac|chamada/.test(q))return "Portaria Remota";
    if(/coi|evento|cuc/.test(q))return "COI";
    if(/recursos humanos|\brh\b/.test(q))return "RH";
    if(/comercial|venda/.test(q))return "Comercial";
    if(/implemen/.test(q))return "Implementação";
    if(/t[eé]cnic|\bos\b|ordem de servi/.test(q))return "Técnico";
    if(/pend[eê]n|status/.test(q))return "Pendências";
    return "";
  }
  function rememberQuestion(question) {
    const tag=topic(question);
    if(!tag)return;
    const m=memory();
    m.topics ||= {};
    m.topics[tag]=Math.min(1000,(m.topics[tag]||0)+1);
    save(m);
  }
  function home(rows=[],imports=[],esc=(x)=>String(x??"")) {
    if(!rows.length)return "";
    const review=root.MCAutoReview?.current();
    if(review?.insights?.length)return '<section class="mc-ai-home" aria-label="Percepções do Copiloto"><div class="mc-ai-home-title"><strong>Copiloto</strong><span>Leitura inteligente</span></div>'+
      review.insights.slice(0,2).map(i=>'<p><b>'+esc(i.title)+'</b> · '+esc(i.interpretation)+'</p>').join('')+
      '<button type="button" class="btn" data-nav="insight">Ver percepções e evidências</button></section>';

    const latest=(root.MCAnalysis?.analyze(rows,imports)||[]).find(x=>["attention","comparison","concentration"].includes(x.kind));
    const top=Object.entries(memory().topics||{}).sort((a,b)=>b[1]-a[1])[0];
    if(!latest && !(top&&top[1]>=2))return "";
    return '<section class="mc-ai-home" aria-label="Copiloto"><div class="mc-ai-home-title"><span aria-hidden="true">✦</span><strong>Copiloto</strong><span>Prioridades do painel</span></div>'+
      (latest?'<p><b>'+esc(latest.title)+'</b> · '+esc(latest.text)+'</p><small>Conclusão calculada localmente; confira a fonte e os limites em Análises.</small>':"")+
      (top&&top[1]>=2?'<p>Você costuma acompanhar <b>'+esc(top[0])+'</b>. <button type="button" class="btn" data-ai-favorite="'+esc(top[0])+'">Abrir esse assunto</button></p>':"")+
      '</section>';
  }
  root.MCAI={request,context,interpretationContext,rememberQuestion,home,consent,setConsent};
})(window);
