const {test}=require("node:test");
const assert=require("node:assert/strict");
const map=new Map();
global.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
const P=require("../profiles.js");
test("o aplicativo tem três contextos sem Direção",()=>{
 assert.deepEqual(P.ids,["operacao","supervisora","gerente"]);
 assert.equal(P.current().title,"Gestão");
});
test("alternância de experiência preserva todas as informações",()=>{
 const input=[{type:"ordens",status:"Pendente"},{type:"cuc",value:14}];
 assert.equal(P.set("supervisora"),true);
 assert.equal(P.current().title,"Supervisão");
 assert.equal(P.summary(input,[]).openOrders,1);
 assert.equal(P.summary(input,[]).types.cuc.total,14);
 assert.equal(input.length,2);
 assert.equal(P.set("direcao"),false);
 assert.equal(P.current().title,"Supervisão");
});
test("experiências sugerem prioridades sem perder widgets",()=>{
 const arr=["records","metrics","trend","status"];
 P.set("operacao");
 assert.deepEqual(P.orderWidgets(arr),["records","metrics","status","trend"]);
 P.set("gerente");
 assert.deepEqual(P.orderWidgets(arr),["metrics","trend","status","records"]);
});
test("rótulos inválidos nunca são aceitos",()=>{
 assert.equal(P.set("administrador"),false);
 assert.equal(P.current().title,"Gestão");
});
test("análises não somam grandezas incompatíveis",()=>{
 const stats=P.summary([{type:"cuc",value:12},{type:"deslocamentos",value:3},{type:"ligacoes",value:1}]);
 assert.equal(stats.types.cuc.total,12);
 assert.equal(stats.types.deslocamentos.total,3);
 assert.equal(stats.types.ligacoes.total,1);
});

test("uma preferência antiga de Direção cai em Gestão sem excluir layouts salvos",()=>{
 map.set("michelle.experience.v1","direcao");
 map.set("michelle.dashboard.v2.direcao","preferências antigas");
 assert.equal(P.currentId(),"gerente");
 assert.equal(map.get("michelle.dashboard.v2.direcao"),"preferências antigas");
});
