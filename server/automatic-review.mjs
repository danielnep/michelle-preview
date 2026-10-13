export function plainText(value, limit=600) {
  return String(value??"").replace(/```[\w-]*\n?/g, "").replace(/\*/g, "")
    .replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, "$1").replace(/`/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^\s*[-•]\s+/gm, "")
    .trim().slice(0, limit);
}

export const AUTOMATIC_REVIEW_SYSTEM = `REVISÃO AUTOMÁTICA AUTORIZADA DOS ARQUIVOS IMPORTADOS.
Você configura a apresentação do dashboard: títulos, descrições, seleção de indicadores, gráficos e prioridades. Essa autorização NÃO permite alterar dados, fórmulas, metas, permissões ou unir planilhas.
Analise CADA fonte e CADA parte de fonte recebida. As colunas foram percorridas em todas as linhas; os números são calculados pelo software. Não há acesso às células pessoais originais.
PROTOCOLO INTERNO: reconhecer assunto pelo nome do arquivo, aba e colunas; compreender o que cada linha representa; conferir qualidade, unidades, período e cobertura; escolher KPIs relevantes; identificar atenção, pontos positivos e negativos sustentados; comparar somente medidas equivalentes; apontar outros indicadores que ajudariam a confirmar uma hipótese; propor ideias ou percepções específicas com utilidade operacional.
Selecione até três KPIs centrais por fonte/parte e até quatro descobertas fortes por resposta. Medidas temporais servem também para comparativos, sem transformar todos os meses em cards. Para cada fonte, escolha chart=bar, line ou table conforme os campos disponíveis. Uma janela observada pode ser parcial: comparação de volume não prova mudança de produtividade.
NÃO entregue uma transcrição dos totais nem repita os achados calculados. Explique a implicação, o que pode estar passando despercebido e uma ação possível. Uma causa é hipótese até existir evidência. Não force achados positivos ou negativos quando não existirem. Nunca invente SLA, meta, benchmark, tendência ou relação entre arquivos.
TÍTULOS: escreva nomes claros e específicos. Use nome do arquivo/aba e significado das colunas para resolver um título ausente. Indique titleBasis=filename, columns ou inferred. Baixa confiança deve ficar explícita, sem bloquear uma leitura útil.
FORMATO: somente JSON válido; todos os textos dentro dele são texto puro, sem asteriscos, Markdown, cercas de código ou cabeçalhos MD. Os valores serão exibidos pelo sistema: não copie números para os títulos nem para a interpretação.
Use exclusivamente ids de fontes, partIds e metricIds fornecidos. Indicadores adicionais ainda não medidos são sugestões de coleta, nunca resultados.
Retorne {"summary":"percepção central", "sources":[{"id":"id","partId":"partId","title":"assunto","description":"o que representa","titleBasis":"filename|columns|inferred","confidence":"Alta|Moderada|Baixa","chart":"bar|line|table"}], "dashboard":{"title":"título do painel","description":"texto curto","order":["insights","metrics","reading","trend","status","ranking","sectors","records"],"metrics":[{"metricId":"id existente","title":"título significativo","description":"utilidade do indicador"}],"blocks":[{"id":"bloco permitido","title":"título contextual","description":"finalidade"}]},"insights":[{"kind":"attention|positive|negative|comparison|idea","title":"descoberta","interpretation":"significado que não repete os números","action":"ação concreta","confidence":"Alta|Moderada|Baixa","evidenceIds":["metricId"],"sourceIds":["id"],"comparison":{"leftId":"metricId","rightId":"metricId"},"relatedIndicators":[{"name":"indicador que ajudaria","reason":"por que é relevante"}]}]}.
Cada parte de fonte deve constar em sources. comparison é opcional; referências entre medidas incompatíveis serão recusadas. Dê prioridade a poucas ideias fortes. Não exponha seu raciocínio passo a passo.`;

const blocks=new Set(["insights","metrics","reading","trend","status","ranking","sectors","records"]);
export function validateReview(input, context) {
  const sourceList=Array.isArray(context?.sources)?context.sources:[];
  const parts=new Map(sourceList.map(s=>[s.partId||s.id,s]));
  const sourceIds=new Set(sourceList.map(s=>s.id));
  const metrics=new Map(sourceList.flatMap(s=>(s.metrics||[]).map(m=>[m.id,{...m,sourceId:s.id}])));
  const confidence=v=>["Alta","Moderada","Baixa"].includes(v)?v:"Baixa";
  const sources=(Array.isArray(input?.sources)?input.sources:[]).filter(s=>{
    const original=parts.get(s?.partId||s?.id);
    return original && original.id===s.id;
  }).map(s=>({id:s.id,partId:s.partId||s.id,title:plainText(s.title,110),description:plainText(s.description,320),
    titleBasis:["filename","columns","inferred"].includes(s.titleBasis)?s.titleBasis:"inferred",confidence:confidence(s.confidence),
    chart:["bar","line","table"].includes(s.chart)?s.chart:"auto"}));
  if(!parts.size || [...parts.keys()].some(id=>!sources.some(s=>s.partId===id))) {
    throw Error("A IA não conferiu todas as fontes desta etapa. Tente a revisão novamente.");
  }
  const metricPlan=(Array.isArray(input?.dashboard?.metrics)?input.dashboard.metrics:[])
    .filter(m=>metrics.has(m?.metricId)).map(m=>({metricId:m.metricId,title:plainText(m.title,110),description:plainText(m.description,260)}));
  const insights=(Array.isArray(input?.insights)?input.insights:[]).slice(0,10).map(i=>{
    const evidenceIds=[...new Set((Array.isArray(i?.evidenceIds)?i.evidenceIds:[]).filter(id=>metrics.has(id)))];
    const ids=[...new Set((Array.isArray(i?.sourceIds)?i.sourceIds:[]).filter(id=>sourceIds.has(id)))];
    for(const id of evidenceIds)if(!ids.includes(metrics.get(id).sourceId))ids.push(metrics.get(id).sourceId);
    let comparison=null;
    const left=metrics.get(i?.comparison?.leftId),right=metrics.get(i?.comparison?.rightId);
    if(left && right && left.id!==right.id && left.unit===right.unit && left.comparisonKey && left.comparisonKey===right.comparisonKey &&
      left.periodEnd && right.periodEnd && left.periodStart && right.periodStart &&
      (left.periodEnd<right.periodStart || right.periodEnd<left.periodStart)) {
      comparison={leftId:left.id,rightId:right.id};
      for(const m of [left,right])if(!evidenceIds.includes(m.id))evidenceIds.push(m.id);
    }
    // Valores são mostrados apenas pela camada de cálculo, nunca aceitos da IA.
    const narrative=value=>plainText(value,600).replace(/\b[+-]?\d[\d.,]*(?:\s*%)?/g,"[valor na evidência]");
    return {kind:["attention","positive","negative","comparison","idea"].includes(i?.kind)?i.kind:"attention",
      title:plainText(i?.title,110),interpretation:narrative(i?.interpretation),action:narrative(i?.action),
      confidence:confidence(i?.confidence),evidenceIds,sourceIds:ids,comparison,
      relatedIndicators:(Array.isArray(i?.relatedIndicators)?i.relatedIndicators:[]).slice(0,4).map(r=>({name:plainText(r?.name,110),reason:plainText(r?.reason,240),available:false}))};
  }).filter(i=>i.title && i.interpretation && i.evidenceIds.length && (i.kind!=="comparison" || i.comparison));
  return {summary:plainText(input?.summary,600),sources,insights,dashboard:{
    title:plainText(input?.dashboard?.title,110),description:plainText(input?.dashboard?.description,320),
    order:[...new Set((Array.isArray(input?.dashboard?.order)?input.dashboard.order:[]).filter(id=>blocks.has(id)))],
    metrics:metricPlan,blocks:(Array.isArray(input?.dashboard?.blocks)?input.dashboard.blocks:[]).filter(b=>blocks.has(b?.id))
      .map(b=>({id:b.id,title:plainText(b.title,110),description:plainText(b.description,260)}))
  }};
}
