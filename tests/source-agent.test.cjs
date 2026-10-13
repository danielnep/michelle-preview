const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.join(__dirname,"..");
const A=require("../analysis/source-agent.js");

function lot(id,file,sheet,raw,type="geral") {
  return {id,name:file,sheet,type,sector:"coi",rows:raw.map((x,i)=>({lotId:id,type,source:file,line:i+2,raw:x}))};
}
test("lê arquivos e abas separadamente, mesmo com tema igual",()=>{
  const first=lot("a","relatorio.xlsx","Agosto",[{Data:"2026-08-01",Total:"3"}],"indicadores");
  const second=lot("b","relatorio.xlsx","Setembro",[{Data:"2026-09-01",Total:"4"}],"indicadores");
  const rows=[...first.rows,...second.rows];
  const profiles=A.catalog(rows,[first,second]);
  assert.equal(profiles.length,2);
  assert.deepEqual(profiles.map(x=>x.sheet),["Agosto","Setembro"]);
  assert.equal(profiles[0].rowCount,1);
  assert.equal(profiles[1].rowCount,1);
  assert.ok(A.localGroups(profiles).some(x=>x.sourceIds.includes("a")&&x.sourceIds.includes("b")));
  assert.match(A.localGroups(profiles)[0].reason,/não implica vinculo/);
});
test("diferentes temas não recebem ligação fictícia",()=>{
  const a=lot("a","ferias.csv","Dados",[{Colaborador:"Pessoa 1",Periodo:"2026-07-01"}]);
  const b=lot("b","estoque.csv","Dados",[{Produto:"Peça X",Saldo:12}]);
  const profiles=A.catalog([...a.rows,...b.rows],[a,b]);
  assert.equal(profiles.length,2);
  assert.deepEqual(A.localGroups(profiles),[]);
});
test("catálogo fornece formato, não transmite valores individuais",()=>{
  const a=lot("a","clientes.csv","Principal",[{CPF:"12345678901",Nome:"Pessoa particular",Data:"2026-09-03"}]);
  const catalog=A.catalog(a.rows,[a]);
  const payload=JSON.stringify(catalog);
  assert.ok(!payload.includes("12345678901"));
  assert.ok(!payload.includes("Pessoa particular"));
  assert.ok(payload.includes('"name":"CPF"'));
});
test("validacao remove fontes, colunas e blocos desconhecidos",()=>{
  const p=[{id:"a",columns:[{name:"Total"}]}];
  const out=A.validatePlan({summary:"teste",sources:[
    {id:"a",subject:"Estoque",metrics:[{name:"Saldo",operation:"sum",column:"Inexistente",unit:"itens"}]},
    {id:"falso",subject:"Inexistente"}],
    groups:[{sourceIds:["a","falso"],classification:"complementares",reason:"Sem evidencia"}],
    dashboard:{order:["metrics","fake","reading","metrics"]}},p);
  assert.equal(out.sources.length,1);
  assert.equal(out.sources[0].metrics[0].column,"");
  assert.deepEqual(out.groups,[]);
  assert.deepEqual(out.dashboard.order,["metrics","reading"]);
});
test("interface carrega o agente e usa o painel real",()=>{
  const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
  const dash=fs.readFileSync(path.join(base,"dashboard.js"),"utf8");
  assert.ok(html.indexOf("analysis/source-agent.js")>html.indexOf("michelle-ai-client.js"));
  assert.ok(html.indexOf("analysis/source-agent.js")<html.indexOf("dashboard.js"));
  assert.match(dash,/MCSourceAgent\?\.render/);
  assert.match(dash,/mc:source-plan-apply/);
});
