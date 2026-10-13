/* Visualizações verificáveis por fonte, sem agregação de arquivos diferentes. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MCSourceVisuals=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const normalize=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const clean=s=>String(s??"").trim();
  // Somente dimensões categóricas reconhecidas. Nomes, contatos e identificadores não viram barras.
  const safeField=name=>/(^|\b)(status|situac[aã]o|categoria|tipo|motivo|etapa|setor|grupo|origem|destino|canal|prioridade|produto|unidade|regi[aã]o)(\b|$)/i.test(normalize(name)) &&
    !/(cpf|cnpj|email|telefone|celular|senha|token|chave|endereco|cep|matricula|cliente|pessoa|usuario|identificador|contato|numero|numero de telefone)/i.test(normalize(name));
  function dateValue(value){
    const text=String(value??"").trim();
    const d=/^(\d{4})-(\d{2})-(\d{2})/.exec(text)||/^(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
    if(!d)return null;
    const iso=d[1].length===4?d[1]+"-"+d[2]+"-"+d[3]:d[3]+"-"+d[2]+"-"+d[1];
    const dt=new Date(iso+"T12:00:00Z");
    return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===iso?iso:null;
  }
  function dataRows(rows,sourceId){
    return (rows||[]).filter(r=>r.lotId===sourceId);
  }
  function seriesFor(rows,profile){
    const own=dataRows(rows,profile.id);
    const time=new Map();
    for(const r of own){
      const day=dateValue(r.date);
      if(day)time.set(day,(time.get(day)||0)+1);
    }
    const dateSeries=[...time].sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([date,value])=>({label:date.slice(8,10)+"/"+date.slice(5,7),fullLabel:date,value}));
    const categories=[];
    for(const field of profile.columns||[]) {
      if(field.inferredShape!=="texto"||!safeField(field.name))continue;
      const values=new Map();
      for(const r of own){
        const value=clean(r.raw?.[field.name]);
        if(!value||value.length>72)continue;
        values.set(value,(values.get(value)||0)+1);
      }
      const cardinality=values.size;
      if(cardinality<2||cardinality>18||cardinality>own.length*0.9)continue;
      const n=normalize(field.name);
      const semantic=/(status|situac|categoria|tipo|motivo|etapa|setor|grupo|origem|destino|canal|prioridade|produto|unidade|regiao)/.test(n)?60:0;
      categories.push({name:field.name,values,score:semantic+Math.min(30,own.length-cardinality)});
    }
    categories.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
    const category=categories[0]||null;
    let categorySeries=[];
    if(category){
      const sorted=[...category.values.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR"));
      const top=sorted.slice(0,7).map(([label,value])=>({label,fullLabel:label,value}));
      if(sorted.length>7)top.push({label:"Outros",fullLabel:"Outras categorias",value:sorted.slice(7).reduce((total,item)=>total+item[1],0)});
      categorySeries=top;
    }
    return {sourceId:profile.id,sourceRows:own.length,dated:dateSeries.reduce((n,p)=>n+p.value,0),
      hasTrend:dateSeries.length>=2,
      trend:dateSeries.slice(-24),trendTruncated:dateSeries.length>24,
      categoryField:category?.name||"",bars:categorySeries,
      columns:profile.columns?.length||0};
  }
  function chart(data,mode,esc=x=>String(x??"")){
    const fmt=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0});
    if(mode==="table")return table(data,esc);
    const trend=mode==="line"&&data.hasTrend;
    const items=trend?data.trend:data.bars;
    if(!items.length)return '<p class="mc-source-empty-viz">Não há categorias ou datas suficientes para desenhar um gráfico confiável nesta fonte. Confira os indicadores e o detalhamento das colunas.</p>';
    const title=trend?"Registros por data (fonte selecionada)":"Registros por "+data.categoryField;
    const w=700,h=246,pad={left:46,right:14,top:20,bottom:58};
    const plotW=w-pad.left-pad.right,plotH=h-pad.top-pad.bottom;
    const max=Math.max(1,...items.map(i=>i.value));
    const grid=[0,0.5,1].map((f,j)=>{
      const y=pad.top+plotH*(1-f);
      return '<line x1="'+pad.left+'" x2="'+(w-pad.right)+'" y1="'+y+'" y2="'+y+'" stroke="currentColor" stroke-opacity=".12"/>'+
        '<text x="'+(pad.left-8)+'" y="'+(y+4)+'" fill="currentColor" fill-opacity=".6" text-anchor="end" font-size="11">'+fmt.format(Math.ceil(max*f))+'</text>';
    }).join("");
    let shapes="";
    const n=items.length;
    if(trend){
      const pts=items.map((item,index)=>{
        const x=pad.left+(n===1?plotW/2:index*plotW/(n-1));
        const y=pad.top+plotH*(1-item.value/max);
        return {x,y,...item};
      });
      shapes='<polyline fill="none" stroke="var(--mc-source-accent,#71aaff)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="'+pts.map(p=>p.x+','+p.y).join(' ')+'"/>'+
        pts.map((p,i)=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="var(--mc-source-accent,#71aaff)" stroke="var(--surface,#111)" stroke-width="2"><title>'+esc(p.fullLabel+': '+fmt.format(p.value))+'</title></circle>').join("");
      const labels=pts.filter((p,i)=>i===0||i===pts.length-1||i%Math.max(1,Math.ceil(pts.length/5))===0);
      shapes+=labels.map(p=>'<text x="'+p.x+'" y="'+(h-23)+'" fill="currentColor" fill-opacity=".7" font-size="11" text-anchor="middle">'+esc(p.label)+'</text>').join("");
    }else{
      const step=plotW/n,bw=Math.min(step*0.58,52);
      shapes=items.map((item,i)=>{
        const bh=plotH*item.value/max,x=pad.left+i*step+(step-bw)/2,y=pad.top+plotH-bh;
        const short=item.label.length>13?item.label.slice(0,12)+"…":item.label;
        return '<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="5" fill="var(--mc-source-accent,#71aaff)" fill-opacity="'+(1-i*0.045)+'"><title>'+esc(item.fullLabel+': '+fmt.format(item.value))+'</title></rect>'+
          '<text x="'+(x+bw/2)+'" y="'+(Math.max(11,y-6))+'" fill="currentColor" text-anchor="middle" font-size="11">'+fmt.format(item.value)+'</text>'+
          '<text x="'+(x+bw/2)+'" y="'+(h-24)+'" fill="currentColor" fill-opacity=".7" text-anchor="middle" font-size="10">'+esc(short)+'</text>';
      }).join("");
    }
    return '<div class="mc-source-chart-wrap"><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(title)+'" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'+
      '<title>'+esc(title)+'</title>'+grid+shapes+'</svg>'+
      '<p class="mc-source-caption">'+esc(title)+' · quantidade de linhas, sem agregar outras planilhas'+(trend&&data.trendTruncated?" · últimas 24 datas":"")+'</p>'+
      '<details><summary>Conferir valores do gráfico</summary>'+table(data,esc,trend?"line":"bar")+'</details></div>';
  }
  function table(data,esc=x=>String(x??""),override=""){
    const trend=override==="line"||(override!=="bar"&&data.hasTrend&&!data.bars.length);
    const items=trend?data.trend:data.bars;
    if(!items.length)return '<p>Sem dados suficientes.</p>';
    return '<div class="mc-source-scroll"><table><caption>'+esc(trend?"Contagem por data":"Contagem por categoria")+'</caption><thead><tr><th scope="col">'+esc(trend?"Data":data.categoryField)+'</th><th scope="col">Linhas</th></tr></thead><tbody>'+
      items.map(p=>'<tr><th scope="row">'+esc(p.fullLabel)+'</th><td>'+new Intl.NumberFormat("pt-BR").format(p.value)+'</td></tr>').join("")+'</tbody></table></div>';
  }
  return {seriesFor,chart,table,dateValue,safeField};
});