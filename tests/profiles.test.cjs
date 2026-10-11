const {test}=require("node:test");
const assert=require("node:assert/strict");
const map=new Map();
global.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
const P=require("../profiles.js");
test("o aplicativo tem exatamente quatro experiências configuradas",()=>{
 assert.deepEqual(P.ids,["operacao","supervisora","gerente","direcao"]);
 assert.equal(P.current().title,"Gerente");
});
test("alternância de experiência preserva todas as informações",()=>{
 const input=[{type:"ordens",status:"Pendente"},{type:"cuc",value:14}];
 assert.equal(P.set("supervisora"),true);
 assert.equal(P.current().title,"Supervisora");
 assert.equal(P.summary(input,[]).openOrders,1);
 assert.equal(P.summary(input,[]).types.cuc.total,14);
 assert.equal(input.length,2);
 assert.equal(P.set("direcao"),true);
 assert.equal(P.current().title,"Direção");
});
test("experiências sugerem prioridades sem perder widgets",()=>{
 const arr=["records","metrics","trend","status"];
 P.set("operacao");
 assert.deepEqual(P.orderWidgets(arr),["records","metrics","status","trend"]);
 P.set("direcao");
 assert.deepEqual(P.orderWidgets(arr),["metrics","trend","status","records"]);
});
test("rótulos inválidos nunca são aceitos",()=>{
 assert.equal(P.set("administrador"),false);
 assert.equal(P.current().title,"Direção");
});
test("análises não somam grandezas incompatíveis",()=>{
 const stats=P.summary([{type:"cuc",value:12},{type:"deslocamentos",value:3},{type:"ligacoes",value:1}]);
 assert.equal(stats.types.cuc.total,12);
 assert.equal(stats.types.deslocamentos.total,3);
 assert.equal(stats.types.ligacoes.total,1);
});
