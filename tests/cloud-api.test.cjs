const {test}=require("node:test");
const assert=require("node:assert/strict");
const {Readable}=require("node:stream");
const {createHash}=require("node:crypto");

test("API Railway: exige sessão, salva originais e recupera lotes da nuvem", async()=>{
  const keys=["STORAGE_ENDPOINT","STORAGE_BUCKET","STORAGE_REGION","STORAGE_ACCESS_KEY_ID","STORAGE_SECRET_ACCESS_KEY","BETTER_AUTH_SECRET","MICHELLE_INITIAL_EMAIL","MICHELLE_INITIAL_PASSWORD"];
  const before=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
  Object.assign(process.env,{STORAGE_ENDPOINT:"https://storage.example.test",STORAGE_BUCKET:"teste-michelle",STORAGE_REGION:"auto",STORAGE_ACCESS_KEY_ID:"TESTE",STORAGE_SECRET_ACCESS_KEY:"segredo-testes",BETTER_AUTH_SECRET:"sessao-testes",MICHELLE_INITIAL_EMAIL:"teste@example.com",MICHELLE_INITIAL_PASSWORD:"senha-apenas-teste"});
  const oldFetch=global.fetch,store=new Map();
  global.fetch=async(url,options)=>{
    const parsed=new URL(url),key=decodeURIComponent(parsed.pathname.slice(1));
    if(options.method==="GET" && parsed.searchParams.has("list-type")){
      const prefix=parsed.searchParams.get("prefix");
      const items=[...store.keys()].filter(x=>x.startsWith(prefix)).map(x=>"<Contents><Key>"+x+"</Key></Contents>").join("");
      return new Response("<ListBucketResult><IsTruncated>false</IsTruncated>"+items+"</ListBucketResult>",{status:200});
    }
    if(options.method==="PUT"){store.set(key,Buffer.from(options.body));return new Response("",{status:200});}
    if(options.method==="GET"&&store.has(key))return new Response(store.get(key),{status:200});
    return new Response("missing",{status:404});
  };
  const {routeCloud}=await import("../scripts/cloud-api.mjs");
  const call=async(method,url,body,cookie)=>{
    const bytes=body===undefined?Buffer.alloc(0):Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));
    const req=Readable.from(bytes.length?[bytes]:[]);
    req.method=method;req.url=url;
    req.headers={host:"powerbi-completo-mc.up.railway.app",origin:"https://powerbi-completo-mc.up.railway.app",...(cookie?{cookie}:{})};
    req.socket={remoteAddress:"127.0.0.1"};
    let status,headers,out=Buffer.alloc(0);
    const res={writeHead:(s,h)=>{status=s;headers=h;},end:(data)=>{out=data?Buffer.from(data):Buffer.alloc(0);}};
    assert.equal(await routeCloud(req,res),true);
    return {status,headers,data:out,json:()=>JSON.parse(out.toString("utf8"))};
  };
  try{
    assert.equal((await call("GET","/api/cloud/lots")).status,401);
    assert.equal((await call("POST","/api/cloud/login",{email:"teste@example.com",password:"errada"})).status,401);
    const login=await call("POST","/api/cloud/login",{email:"teste@example.com",password:"senha-apenas-teste"});
    assert.equal(login.status,200);
    const cookie=login.headers["Set-Cookie"].split(";")[0];
    const original=Buffer.from("arquivo de teste"),hash=createHash("sha256").update(original).digest("hex");
    assert.equal((await call("PUT","/api/cloud/files/"+hash,original,cookie)).status,200);
    assert.deepEqual((await call("GET","/api/cloud/files/"+hash,undefined,cookie)).data,original);
    const lot={id:"3e0d8eab-4173-4a4f-bd73-74d485c80f29",name:"teste.xlsx",hash,rows:[{id:"linha"}],created:"2026-10-13T00:00:00Z"};
    assert.equal((await call("PUT","/api/cloud/lots/"+lot.id,lot,cookie)).status,200);
    assert.equal((await call("GET","/api/cloud/lots",undefined,cookie)).json().lots[0].id,lot.id);
    assert.equal((await call("PUT","/api/cloud/files/"+"0".repeat(64),original,cookie)).status,400);
  }finally{
    global.fetch=oldFetch;
    for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
  }
});
