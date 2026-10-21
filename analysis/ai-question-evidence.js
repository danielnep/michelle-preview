/* Evidências numéricas do Copiloto: cálculo local por arquivo/aba, sem células. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MCAIQuestionEvidence=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const text=(value,max=160)=>String(value??'').trim().slice(0,max);
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const identifier=name=>{const n=norm(name).replace(/[_-]+/g,' ');return /\b(id|codigo|cod|cpf|cnpj|cep|telefone|fone|celular|conta|matricula|identificador|placa|protocolo|cliente|nome|email|ramal|operador|atendente)\b/.test(n)||/numero.*\b(os|chamado|pedido|cliente)\b/.test(n);};
  const temporalHeader=name=>{
    const n=norm(name).trim();
    return /^(data|dt|competencia|periodo|date|timestamp)(?:$|[ _/.-])/.test(n)||/^(ano|mes|dia|hora|horario)(?: (?:de|da|do|inicio|fim|abertura|fechamento|registro|entrada|saida|competencia).*)?$/.test(n);
  };
  const nonAdditive=name=>/saldo|estoque|acumulad|media|indice|percent|taxa|%|proporcao|razao/.test(norm(name));
  const additive=name=>/faturamento|receita|despesa|custo|valor|venda|quantidade|\bqtd\b|volume|total|numero de eventos/.test(norm(name));
  const round=n=>{if(!Number.isFinite(n))return null;const rounded=Math.round(n*1e6)/1e6;return Number.isFinite(rounded)?rounded:n;};
  function numeric(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    let s=String(value??'').trim().replace(/\s+/g,'').replace(/^R\$/i,'').replace(/%$/,'');
    if(!s||!/^[+-]?(?:\d+(?:[.,]\d+)*|[.,]\d+)$/.test(s))return null;
    if(s.includes(',')){
      if(s.split(',').length!==2)return null;
      const [integer,fraction]=s.split(',');
      if(integer.includes('.')&&!/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(integer))return null;
      s=integer.replace(/\./g,'')+'.'+fraction;
    }else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    const valueNumber=Number(s);
    return Number.isFinite(valueNumber)?valueNumber:null;
  }
  const stop=new Set(['qual','quais','quanto','quantos','quantas','como','dos','das','para','pela','pelo','por','total','todos','todas','todo','toda','historico','historica','selecao','atual','dados','planilha','arquivo','fonte','media','maior','menor','soma','percentual','porcentagem']);
  function relevant(name,question){
    if(identifier(name)||temporalHeader(name))return false;
    const column=norm(name),q=norm(question);
    const terms=column.replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(t=>t.length>2&&!stop.has(t));
    const query=new Set(q.replace(/[^a-z0-9]+/g,' ').split(/\s+/));
    if(terms.some(t=>query.has(t)))return true;
    // Financial synonyms retain their direction: revenue does not imply cost.
    if(/faturamento|receita|vendas/.test(q)&&/faturamento|receita|vendas/.test(column))return true;
    if(/despesas|custos/.test(q)&&/despesa|custo/.test(column))return true;
    if(/financeir|monetari/.test(q)&&/faturamento|receita|venda|despesa|custo|valor/.test(column))return true;
    return false;
  }
  function sourceScore(file,question){
    const q=norm(question),fileName=norm(file.name||file.filename||''),stem=fileName.replace(/\.[a-z0-9]{1,6}$/,'');
    const sheet=norm(file.sheet||'');
    let score=0;
    if(fileName.length>4&&q.includes(fileName))score+=30;
    else if(stem.length>4&&q.includes(stem))score+=20;
    if(sheet.length>2&&(q.includes('aba '+sheet)||q.includes('planilha '+sheet)))score+=15;
    else if(sheet.length>4&&!['dados','planilha','sheet'].includes(sheet)&&q.includes(sheet))score+=10;
    return score;
  }
  function orderedOperations(question){
    const q=norm(question);
    const first=/media|medio/.test(q)?'average':/minimo|menor/.test(q)?'min':/maximo|maior/.test(q)?'max':/soma|total|faturamento|receita|despesa|custo|analis|resum|panorama|indicador|desempenho|compar/.test(q)?'sum':'average';
    return [first,...['sum','average','min','max'].filter(op=>op!==first)];
  }
  function summarize(rows,files,question,generic=false){
    const grouped=new Map();
    for(const row of rows){
      const key=String(row.lotId||row.source||'');
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(row);
    }
    const sources=[],metrics=[];
    const nameCounts=new Map();
    for(const f of files){const name=String(f.name||f.filename||'');nameCounts.set(name,(nameCounts.get(name)||0)+1);}
    for(const file of files){
      const id=String(file.id||''),name=String(file.name||file.filename||'');
      const records=grouped.get(id)||(nameCounts.get(name)===1?grouped.get(name):null)||[];
      const columns=new Map(),chosen=new Set();
      for(const row of records)for(const [name,value]of Object.entries(row.raw||{})){
        if(relevant(name,question)||(generic&&!identifier(name)&&!temporalHeader(name)&&numeric(value)!==null))chosen.add(name);
      }
      for(const row of records)for(const [name,value] of Object.entries(row.raw||{})){
        if(!chosen.has(name))continue;
        if(!columns.has(name))columns.set(name,{filled:0,numeric:0,sum:0,min:Infinity,max:-Infinity,currency:0,percent:0});
        const c=columns.get(name);
        if(value==null||String(value).trim()==='')continue;
        c.filled++;
        const parsed=numeric(value);
        if(parsed===null)continue;
        c.numeric++;c.sum+=parsed;c.min=Math.min(c.min,parsed);c.max=Math.max(c.max,parsed);
        if(/R\$/i.test(String(value)))c.currency++;
        if(/%/.test(String(value)))c.percent++;
      }
      if(!columns.size)continue;
      const sourceId=text(id,96),quality=[];
      for(const [name,c] of columns){
        const unit=c.percent||/percent|taxa|%/.test(norm(name))?'%':c.currency||/r\$|\bbrl\b/.test(norm(name))?'R$':/quantidade|\bqtd\b|volume|numero de eventos/.test(norm(name))?'quantidade':'valor informado';
        const mixedUnits=c.currency>0&&c.percent>0;
        const compatible=c.numeric>0&&c.numeric===c.filled&&!mixedUnits;
        quality.push({column:text(name,110),rows:records.length,filled:c.filled,numeric:c.numeric,
          missing:records.length-c.filled,invalid:c.filled-c.numeric,mixedUnits,compatible});
        if(!compatible)continue;
        const add=(operation,value)=>{const result=round(value);if(result!==null)metrics.push({sourceId,column:text(name,110),operation,value:result,unit,coverage:c.numeric,rows:records.length});};
        const operations={average:c.sum/c.numeric,min:c.min,max:c.max};
        if(unit!=='%'&&!nonAdditive(name)&&(unit==='R$'||additive(name)))operations.sum=c.sum;
        for(const op of orderedOperations(question))if(Object.hasOwn(operations,op))add(op,operations[op]);
      }
      sources.push({sourceId,file:text(file.name||file.filename||'Planilha'),sheet:text(file.sheet||'Aba não informada',100),rows:records.length,columns:quality});
    }
    return {sources,metrics};
  }
  function build(selected=[],all=[],imports=[],question=''){
    const current=Array.isArray(selected)?selected:[],history=Array.isArray(all)?all:current;
    const files=(Array.isArray(imports)?imports:[]).filter(f=>!f.deleted&&!f.archived&&!f.supersededBy)
      .sort((a,b)=>sourceScore(b,question)-sourceScore(a,question));
    if(!String(question).trim())return {selectedData:{sources:[],metrics:[]},allData:{sources:[],metrics:[]},coverage:{selectedRows:current.length,allRows:history.length,metricScope:'Sem pergunta numérica específica.'}};
    const analytical=/analis|resum|panorama|indicador|desempenho|compar|visao geral|insight|avalie|diagnostic/.test(norm(question));
    const explicitColumn=history.some(row=>Object.keys(row.raw||{}).some(name=>relevant(name,question)));
    const generic=analytical&&!explicitColumn;
    return {selectedData:summarize(current,files,question,generic),allData:summarize(history,files,question,generic),
      coverage:{selectedRows:current.length,allRows:history.length,sourceCount:files.length,
        broadAnalysis:generic,
        metricScope:generic?'Pedido analítico geral: medidas numéricas por fonte, sem somar arquivos ou abas.':'Somente colunas relacionadas à pergunta, calculadas por fonte; sem somar arquivos ou abas.',
        privacy:'Células e identificadores pessoais não enviados; cobertura explicita valores ausentes e incompatíveis.'}};
  }
  return {build};
});
