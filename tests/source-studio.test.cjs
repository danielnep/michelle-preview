const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Sheets=require("../analysis/workbook-sheets.js");
const V=require("../analysis/source-visuals.js");
const fakeXLSX={
  utils:{
    decode_range(ref){const [,last]=ref.split(":");return {s:{r:0,c:0},e:{r:Number(last.slice(1))-1,c:2}};},
    sheet_to_json(sheet){return sheet.rows}
  }
};
function workbook(){
  return {
    SheetNames:["Dados agosto","Dados setembro","Resumo"],
    Sheets:{
      "Dados agosto":{"!ref":"A1:C4",rows:[["Data","Motivo"],["2026-08-01","Aberto"],["2026-08-02","Fechado"],["2026-08-03","Aberto"]]},
      "Dados setembro":{"!ref":"A1:C3",rows:[["Data","Motivo"],["2026-09-01","Aberto"],["2026-09-02","Fechado"]]},
      "Resumo":{"!ref":"A1:C3",rows:[["Indicador","Total"],["Chamados",120],["Resolvidos",98]]}
    }
  };
}
test("classifica todas as abas e desmarca resumos sem excluir",()=>{
  const result=Sheets.inspect(workbook(),fakeXLSX,()=>({score:2}),"exemplo.xlsx");
  assert.equal(result.length,3);
  assert.deepEqual(result.map(x=>x.selected),[true,true,false]);
  assert.equal(result[2].summary,true);
  const active=Sheets.active(result.map((i,index)=>({...i,grid:[[1],[2]],lotId:null})));
  assert.equal(active.length,2);
});
test("resumo isolado continua selecionável",()=>{
  const wb=workbook();wb.SheetNames=["Resumo"];
  const result=Sheets.inspect(wb,fakeXLSX,()=>({score:2}),"resumo.xlsx");
  assert.equal(result.length,1);
  assert.equal(result[0].selected,true);
});
test("produz gráficos sem misturar fontes",()=>{
  const a={id:"a",columns:[{name:"Motivo",inferredShape:"texto"}]};
  const b={id:"b",columns:[{name:"Motivo",inferredShape:"texto"}]};
  const rows=[
    {lotId:"a",date:"2026-08-01",raw:{Motivo:"Alarme"}},
    {lotId:"a",date:"2026-08-02",raw:{Motivo:"Vistoria"}},
    {lotId:"a",date:"2026-08-03",raw:{Motivo:"Alarme"}},
    {lotId:"b",date:"2026-08-03",raw:{Motivo:"Ocorrência"}}
  ];
  const result=V.seriesFor(rows,a),other=V.seriesFor(rows,b);
  assert.equal(result.sourceRows,3);
  assert.equal(other.sourceRows,1);
  assert.equal(result.hasTrend,true);
  assert.equal(result.bars.find(x=>x.label==="Alarme").value,2);
  assert.ok(!result.bars.some(x=>x.label==="Ocorrência"));
  assert.match(V.chart(result,"bar",s=>String(s)),/svg/);
  assert.match(V.chart(result,"line",s=>String(s)),/polyline/);
});
test("não usa dados pessoais em categorias automáticas",()=>{
  const a={id:"a",columns:[
    {name:"CPF",inferredShape:"texto"},{name:"Status",inferredShape:"texto"}
  ]};
  const rows=[
    {lotId:"a",raw:{CPF:"111",Status:"Aberto"}},
    {lotId:"a",raw:{CPF:"222",Status:"Fechado"}},
    {lotId:"a",raw:{CPF:"333",Status:"Aberto"}}
  ];
  assert.equal(V.seriesFor(rows,a).categoryField,"Status");
  assert.equal(V.safeField("CPF"),false);
});
test("estrutura de layout adaptativo e arquivos scripts presentes",()=>{
  const base=path.join(__dirname,"..");
  const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(base,"analysis/source-studio.css"),"utf8");
  const src=fs.readFileSync(path.join(base,"app.js"),"utf8");
  const agent=fs.readFileSync(path.join(base,"analysis/source-agent.js"),"utf8");
  assert.ok(html.indexOf("analysis/workbook-sheets.js")<html.indexOf("app.js"));
  assert.ok(html.indexOf("analysis/source-visuals.js")<html.indexOf("analysis/source-agent.js"));
  assert.match(css,/@media \(max-width:560px\)/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(src,/data-include-sheet/);
  assert.match(src,/MCWorkbookSheets\?\.inspect/);
  assert.match(agent,/mc-source-workspace/);
  assert.match(agent,/data-mc-source-view/);
});

test("PWA armazena os módulos de exploração e invalida cache antigo",()=>{
  const root=path.join(__dirname,"..");
  const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  for(const resource of ["source-agent.js","source-visuals.js","workbook-sheets.js","compact-dock.js","compact-shell.css","source-studio.css"]){
    assert.match(sw,new RegExp(resource.replace(/\./g,"\\.")));
    assert.ok(html.includes(resource));
  }
  assert.match(sw,/michelle-shell-v4\.7\.0/);
  assert.match(sw,/const canonical=new URL\(url\.pathname,url\.origin\)\.href/);
  assert.match(html,/app-version" content="4\.7\.0"/);
});


test("prompt da IA reside em biblioteca, sem endpoint Netlify desnecessário",()=>{
  const base=path.join(__dirname,"..");
  const fn=fs.readFileSync(path.join(base,"netlify/functions/michelle-ai.mjs"),"utf8");
  assert.match(fn,/\.\.\/lib\/planilha-agent-prompt\.mjs/);
  assert.ok(fs.existsSync(path.join(base,"netlify/lib/planilha-agent-prompt.mjs")));
  assert.ok(!fs.existsSync(path.join(base,"netlify/functions/planilha-agent-prompt.mjs")));
});
