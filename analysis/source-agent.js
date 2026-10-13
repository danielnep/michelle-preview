/* Agente de fontes: inventario independente por arquivo/aba, sem combinar dados. */
(function(root,factory) {
  const api=factory(root);
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.MCSourceAgent=api;
})(typeof window!=="undefined"?window:globalThis,function(root) {
  "use strict";
  const MAX_SOURCES=12, MAX_COLUMNS=18;
  const state={busy:false,plan:null,error:"",fingerprint:"",catalog:[]};
  const text=(v,max=110)=>String(v??"").trim().slice(0,max);
  const norm=v=>text(v,150).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
  const shape=v=>{
    const s=String(v??"").trim();
    if(!s)return "vazio";
    if(/^\d{4}-\d\d-\d\d/.test(s)||/^\d\d?\/\d\d?\/\d{4}/.test(s))return "data";
    if(/^-?[\d.,]+\s*%$/.test(s))return "percentual";
    if(/^-?[\d.,]+$/.test(s))return "numero";
    if(/^\d\d?:\d\d(:\d\d)?$/.test(s))return "horario";
    return "texto";
  };
  function fingerprint(lots) {
    return lots.filter(l=>!l.deleted&&!l.archived&&!l.supersededBy).map(l=>String(l.id)+":"+(l.rows?.length||0)+":"+text(l.sheet,80)).sort().join("|");
  }
  function catalog(rows=[],lots=[]) {
    const activeIds=new Set((rows||[]).map(r=>r.lotId).filter(Boolean));
    return (lots||[]).filter(l=>!l.deleted&&!l.archived&&!l.supersededBy&&activeIds.has(l.id))
      .slice(0,MAX_SOURCES).map(l=>{
        const records=(rows||[]).filter(r=>r.lotId===l.id);
        const keys=new Map();
        for(const record of records.slice(0,300)) {
          for(const [name,value] of Object.entries(record.raw||{})) {
            const k=text(name,95);if(!k)continue;
            if(!keys.has(k))keys.set(k,{name:k,filled:0,kinds:new Map()});
            const field=keys.get(k);
            if(value!==null&&value!==undefined&&String(value).trim())field.filled++;
            const kind=shape(value);field.kinds.set(kind,(field.kinds.get(kind)||0)+1);
          }
        }
        const columns=[...keys.values()].slice(0,MAX_COLUMNS).map(field=>({
          name:field.name,filledSample:field.filled,
          sampleSize:Math.min(records.length,300),
          inferredShape:[...field.kinds].sort((a,b)=>b[1]-a[1])[0]?.[0]||"desconhecido"
        }));
        const byType={};
        for(const record of records)byType[record.type||"geral"]=(byType[record.type||"geral"]||0)+1;
        return {
          id:text(l.id,96),file:text(l.name||l.filename||"Planilha",160),
          sheet:text(l.sheet||"Aba não informada",100),
          rowCount:records.length,registeredType:text(l.type||"geral",40),
          destination:text(l.sector||"",40),types:byType,columns,
          hasIndividualDates:records.some(r=>!!r.date),
          hasPeriod:records.some(r=>!!r.periodStart&&!!r.periodEnd),
          originalPreserved:records.some(r=>r.raw&&Object.keys(r.raw).length>0)
        };
      });
  }
  function localGroups(profiles) {
    const groups=new Map();
    for(const p of profiles) {
      const sig=p.registeredType+"|"+p.columns.map(c=>norm(c.name)).sort().join("|");
      if(!groups.has(sig))groups.set(sig,[]);
      groups.get(sig).push(p.id);
    }
    return [...groups.values()].filter(ids=>ids.length>1).map(ids=>({
      sourceIds:ids,kind:"sobreposicao_possivel",
      reason:"Esquema e tipo semelhantes. Verificar periodo e duplicidade antes de acumular; não implica vinculo entre linhas."
    }));
  }
  function validatePlan(plan,profiles) {
    const ids=new Set(profiles.map(p=>p.id));
    const permittedBlocks=new Set(["insights","metrics","crossings","reading","trend","status","sectors","ranking","records"]);
    const short=(v,n)=>text(v,n);
    const proposedSources=Array.isArray(plan?.sources)?plan.sources:[];
    const sources=proposedSources.filter(s=>ids.has(s?.id)).map(s=>({
      id:s.id,subject:short(s.subject,140),grain:short(s.grain,170),
      purpose:short(s.purpose,260),
      metrics:(Array.isArray(s.metrics)?s.metrics:[]).slice(0,5).map(m=>({
        name:short(m?.name,90),operation:["count","sum","average","distinct","none"].includes(m?.operation)?m.operation:"none",
        column:profiles.find(p=>p.id===s.id)?.columns.some(c=>c.name===m?.column)?m.column:"",
        unit:short(m?.unit,55),reason:short(m?.reason,180)
      })),
      chart:short(s.chart,140),warnings:(Array.isArray(s.warnings)?s.warnings:[]).slice(0,4).map(v=>short(v,180))
    }));
    const groups=(Array.isArray(plan?.groups)?plan.groups:[]).slice(0,12).map(g=>({
      sourceIds:[...new Set((Array.isArray(g?.sourceIds)?g.sourceIds:[]).filter(id=>ids.has(id)))],
      classification:["mesmo_assunto","complementares","independentes","sobreposicao_possivel"].includes(g?.classification)?g.classification:"independentes",
      reason:short(g?.reason,300),
      confidence:["Alta","Moderada","Baixa"].includes(g?.confidence)?g.confidence:"Baixa",
      // Sugestao nunca autoriza mescla nem altera calculos.
      requiresReview:true
    })).filter(g=>g.sourceIds.length>=2);
    const order=[...new Set((Array.isArray(plan?.dashboard?.order)?plan.dashboard.order:[]).filter(id=>permittedBlocks.has(id)))];
    return {
      summary:short(plan?.summary,600),sources,groups,
      dashboard:{order,rationale:short(plan?.dashboard?.rationale,360)},
      questions:(Array.isArray(plan?.questions)?plan.questions:[]).slice(0,5).map(q=>short(q,170))
    };
  }
  function render(rows=[],lots=[],esc=x=>String(x??"")) {
    const fp=fingerprint(lots)+"#"+(rows||[]).length+"#"+[...new Set((rows||[]).map(r=>r.lotId).filter(Boolean))].sort().join("|");
    if(fp!==state.fingerprint){state.fingerprint=fp;state.plan=null;state.error="";state.busy=false;}
    state.catalog=catalog(rows,lots);
    if(!state.catalog.length)return "";
    const profiles=state.catalog;
    const profileHtml=profiles.map(p=>
      '<details><summary>'+esc(p.file)+' · '+esc(p.sheet)+' · '+p.rowCount+' linhas</summary>'+
      '<p>Tipo identificado: '+esc(p.registeredType)+'. Colunas analisadas separadamente: '+p.columns.length+'. Datas individuais: '+(p.hasIndividualDates?"sim":"não")+'.</p>'+
      '<p>'+esc(p.columns.map(c=>c.name+" ("+c.inferredShape+")").join(" · "))+'</p></details>').join("");
    const matches=localGroups(profiles);
    const overlap=matches.length?'<p class="dash-note">Esquemas parecidos encontrados em '+matches.length+' grupo(s). Isso não autoriza somar nem cruzar os arquivos.</p>':"";
    let result="";
    if(state.plan) {
      const p=state.plan;
      result='<div class="dash-readings" aria-label="Plano sugerido pela IA">'+
        '<p><strong>Proposta do agente:</strong> '+esc(p.summary||"Fontes lidas independentemente.")+'</p>'+
        p.sources.map(s=>'<details><summary>'+esc(profiles.find(x=>x.id===s.id)?.file||s.id)+' · '+esc(s.subject)+'</summary>'+
          '<p>'+esc(s.purpose)+'</p><p>Unidade por registro: '+esc(s.grain)+'</p>'+
          '<p>Indicadores sugeridos: '+esc(s.metrics.map(m=>m.name+(m.unit?" ("+m.unit+")":"")).join("; ")||"A confirmar")+'</p>'+
          '<p>Visualização: '+esc(s.chart||"A definir")+'</p>'+
          (s.warnings.length?'<p class="dash-note">'+esc(s.warnings.join("; "))+'</p>':"")+'</details>').join("")+
        p.groups.map(g=>'<p><b>'+esc(g.classification)+'</b>: '+esc(g.sourceIds.map(id=>profiles.find(x=>x.id===id)?.file||id).join(" + "))+
          '. '+esc(g.reason)+' <small>Proposta para revisão; nenhum cruzamento aplicado.</small></p>').join("")+
        (p.questions.length?'<p><b>Conferir:</b> '+esc(p.questions.join(" · "))+'</p>':"")+
        '<p class="dash-note">Os números continuam calculados localmente. O plano apenas orienta a apresentação dos blocos.</p>'+
        (p.dashboard.order.length?'<button type="button" class="btn btn-primary" data-mc-source-apply>Aplicar organização sugerida</button>':"")+
        '</div>';
    }
    return '<section class="mc-source-agent" aria-label="Agente de planilhas"><h3>Leitura independente por planilha</h3>'+
      '<p class="dash-note">Cada arquivo e aba é analisado por si. A comparação entre eles é opcional, auditável e nunca cria vínculos automaticamente.</p>'+
      '<div class="dash-readings">'+profileHtml+'</div>'+overlap+
      '<button type="button" class="btn" data-mc-source-plan '+(state.busy?"disabled":"")+'>'+
        (state.busy?"Planejando dashboard…":"✦ Planejar dashboard com IA")+'</button>'+
      '<small>Ao tocar, apenas nomes, cabeçalhos e formatos agregados serão enviados à IA. Nenhuma célula original será transmitida.'+(lots.filter(l=>!l.deleted&&!l.archived&&!l.supersededBy).length>MAX_SOURCES?" Limite desta análise: as primeiras "+MAX_SOURCES+" fontes ativas; demais devem ser avaliadas em lotes.":"")+'</small>'+
      (state.error?'<p role="alert">'+esc(state.error)+'</p>':"")+result+'</section>';
  }
  async function onPlan() {
    if(state.busy||!root.MCAI?.request)return;
    state.busy=true;state.error="";root.MichelleBridge?.render();
    try {
      const r=await root.MCAI.request("plan",{context:{sources:state.catalog.slice(0,MAX_SOURCES)}});
      if(!r.plan || !Array.isArray(r.plan.sources))throw Error("Esta versão da API ainda não suporta o agente de planilhas. É necessário publicar a função atualizada no Netlify.");
      state.plan=validatePlan(r.plan,state.catalog);
    }catch(e){state.error=e?.message||"Não foi possível consultar a IA.";}
    finally{state.busy=false;root.MichelleBridge?.render();}
  }
  if(root.document) root.document.addEventListener("click",event=>{
    const target=event.target.closest?.("button");
    if(!target)return;
    if(target.matches("[data-mc-source-plan]")){event.preventDefault();onPlan();}
    if(target.matches("[data-mc-source-apply]")&&state.plan?.dashboard.order.length) {
      root.dispatchEvent(new CustomEvent("mc:source-plan-apply",{detail:{order:state.plan.dashboard.order}}));
    }
  });
  return {catalog,localGroups,validatePlan,render,fingerprint};
});