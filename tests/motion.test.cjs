const {test}=require("node:test");
const assert=require("node:assert/strict");
const M=require("../motion.js");
test("reordenação por arraste mantém todos os widgets",()=>{
 const ids=["metrics","insights","trend","status","records"];
 assert.deepEqual(M.orderAfter(ids,"status","insights"),["metrics","status","insights","trend","records"]);
 assert.deepEqual(ids,["metrics","insights","trend","status","records"]);
});
test("soltar fora de um bloco válido não altera a ordem",()=>{
 const ids=["metrics","insights","trend"];
 assert.deepEqual(M.orderAfter(ids,"invalid","trend"),ids);
 assert.deepEqual(M.orderAfter(ids,"metrics","not-found"),ids);
 assert.deepEqual(M.orderAfter(ids,"metrics","metrics"),ids);
});
test("reorder pode ser repetido em experiências diferentes, sem estado global",()=>{
 const initial=["metrics","insights","trend","records"];
 const supervisora=M.orderAfter(initial,"records","insights");
 const gerente=M.orderAfter(initial,"trend","metrics");
 assert.deepEqual(supervisora,["metrics","records","insights","trend"]);
 assert.deepEqual(gerente,["trend","metrics","insights","records"]);
});
test("preferência de redução de movimento acessível",()=>{assert.equal(typeof M.reduced(),"boolean");assert.equal(typeof M.bindDashboardDrag,"function");});
