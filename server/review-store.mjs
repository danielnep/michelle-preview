const fail=(message,status)=>Object.assign(Error(message),{status});
const idsFor=value=>[...new Set((value?.result?.sources||[]).map(s=>String(s?.id||"")))];
async function accessible(pool,access,ids){
  const {rows}=await pool.query("SELECT id,content->>'sector' AS sector FROM mc_records WHERE namespace='lots' AND id=ANY($1::text[])",[ids]);
  return rows.length===ids.length && (access.owner||rows.every(row=>(access.sectors||[]).includes(row.sector)));
}
export async function readReview(pool,access,userId){
  const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace='analysis-review' AND id=$1",[userId]);
  const value=rows[0]?.content;
  return value&&await accessible(pool,access,idsFor(value))?value:null;
}
export async function writeReview(pool,access,userId,body){
  if(!body||typeof body.signature!=="string"||!Array.isArray(body.result?.sources)||!Array.isArray(body.registry)||JSON.stringify(body).length>500000)
    throw fail("Revisão inválida ou muito extensa.",400);
  const ids=idsFor(body);
  if(!ids.length||ids.length>1000||ids.some(id=>!id||id.length>100))throw fail("Fontes inválidas.",400);
  if(!await accessible(pool,access,ids))throw fail("As fontes mudaram ou não estão autorizadas. Revise os arquivos novamente.",409);
  const value={signature:body.signature,result:body.result,registry:body.registry};
  await pool.query("INSERT INTO mc_records(namespace,id,content) VALUES('analysis-review',$1,$2::jsonb) ON CONFLICT(namespace,id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()",[userId,JSON.stringify(value)]);
  return {saved:true};
}
