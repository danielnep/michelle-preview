/* Copiloto: cliente sem segredo, agrega evidências calculadas localmente. */
(function(root) {
  "use strict";
  const SETTINGS = "michelle.ai.behavior.v1";
  const memory = () => {
    try { return JSON.parse(localStorage.getItem(SETTINGS) || "{}"); } catch (_) { return {}; }
  };
  const save = data => { try { localStorage.setItem(SETTINGS, JSON.stringify(data)); } catch (_) {} };
  const consent = () => !!memory().automaticInsights;
  function setConsent(yes) { const m=memory();m.automaticInsights=!!yes;save(m); }
  async function request(mode, data={}) {
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),27000);
    try {
      const response=await fetch("/api/michelle-ai",{
        method:"POST",signal:ctrl.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode,...data})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw Error(body.error || "A IA está indisponível ("+response.status+").");
      return body;
    } catch(error) {
      if(error?.name==="AbortError") throw Error("A IA demorou demais. Tente novamente.");
      throw error;
    } finally { clearTimeout(timer); }
  }
  function context(rows=[], imports=[], sectors=[]) {
    const active=Array.isArray(rows)?rows:[];
    const sectorMap=new Map((sectors||[]).map(x=>[x.id,x.name]));
    const groups=new Map(), kinds=new Map();
    for(const r of active) {
      const key=r.sector||"não identificado";
      groups.set(key,(groups.get(key)||0)+1);
      const t=r.type||"geral";
      if(!kinds.has(t)) kinds.set(t,{rows:0,quantity:0,unit:["cuc","deslocamentos"].includes(t)?"quantidade informada":"linhas"});
      const g=kinds.get(t);g.rows++;
      g.quantity+=g.unit==="linhas"?1:(Number.isFinite(Number(r.value))?Number(r.value):0);
    }
    const stats=root.MCData?.stats(active)||{};
    const notes=(root.MCAnalysis?.analyze(active,imports)||[]).slice(0,9).map(n=>({
      title:n.title,summary:n.text,basis:n.basis,limitation:n.caveat,kind:n.kind,
      sources:(n.sources||[]).slice(0,4)
    }));
    return {
      totalRows:active.length,
      // Gráficos e totais permanecem computados pelo motor local.
      counts:{done:stats.done??null,pending:stats.pending??null,open:stats.open??null,
        cancelled:stats.cancelled??null,unanswered:stats.unanswered??null,
        knownStatus:stats.known??null,completionPercent:stats.rate??null},
      bySector:[...groups].map(([id,lines])=>({sector:sectorMap.get(id)||id,lines})),
      byType:[...kinds].map(([type,x])=>({type,...x})),
      files:(imports||[]).filter(f=>!f.deleted&&!f.archived&&!f.supersededBy).slice(-12).map(f=>({
        name:String(f.name||f.filename||"").slice(0,140),sheet:String(f.sheet||"").slice(0,80),
        type:f.type,sector:f.sector,rows:f.rows?.length||0,periodStart:f.periodStart||null,periodEnd:f.periodEnd||null
      })),
      findings:notes
    };
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
