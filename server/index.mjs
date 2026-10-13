import express from "express";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { getMigrations } from "better-auth/db/migration";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3000);
const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY", "STORAGE_BUCKET"];
for (const key of required) if (!process.env[key]) throw new Error("Configuração obrigatória ausente: " + key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:" + port,
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:" + port],
});
const s3 = new S3Client({
  region: process.env.STORAGE_REGION || "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID, secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY },
  forcePathStyle: false
});
const bucket = process.env.STORAGE_BUCKET;
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});
app.get("/health", (_req,res) => res.json({ok:true, service:"PowerBI CompletoMC"}));
app.get("/api/status", (_req,res) => res.json({ready:true, login:"email", registration:"restricted"}));

// Registration is server-side only. Do not expose public email sign-up.
app.use("/api/auth", (req,res,next) => {
  if (/^\/sign-up(?:\/|$)/.test(req.path)) return res.status(403).json({error:"Cadastro desabilitado. Solicite acesso ao administrador."});
  next();
});
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json({limit:"100mb"}));

async function session(req) {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(()=>null);
}
async function protectedRoute(req,res,next) {
  try {
    const active = await session(req);
    if (!active?.user?.id) return res.status(401).json({error:"Faça login para continuar."});
    req.auth = active;
    next();
  } catch (error) { next(error); }
}
const namespaces = new Set(["lots","presentations","meta"]);
app.get("/api/me", protectedRoute, (req,res)=>res.json({id:req.auth.user.id,email:req.auth.user.email,name:req.auth.user.name}));
app.get("/api/store/:namespace", protectedRoute, async (req,res,next)=>{
 try {
   const store=req.params.namespace;
   if (!namespaces.has(store)) return res.status(404).json({error:"Recurso inválido."});
   const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace=$1 ORDER BY created_at ASC", [store]);
   res.json(rows.map(x=>x.content));
 } catch(err){next(err)}
});
app.get("/api/store/:namespace/:id", protectedRoute, async(req,res,next)=>{
 try {
  if (!namespaces.has(req.params.namespace)) return res.status(404).json({error:"Recurso inválido."});
  const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace=$1 AND id=$2",[req.params.namespace,req.params.id]);
  res.json(rows[0]?.content??null);
 }catch(err){next(err)}
});
app.post("/api/store/batch", protectedRoute, async(req,res,next)=>{
 const ops=req.body?.ops;
 if(!Array.isArray(ops)||ops.length>500) return res.status(400).json({error:"Lote inválido."});
 let client;
 try {
  client=await pool.connect(); await client.query("BEGIN");
  for(const op of ops){
   if(!namespaces.has(op.store)) throw Object.assign(new Error("Coleção não permitida."),{status:400});
   const id=String(op.remove?op.id:op.value?.id||"");
   if(!id||id.length>200) throw Object.assign(new Error("Identificador inválido."),{status:400});
   if(op.remove) await client.query("DELETE FROM mc_records WHERE namespace=$1 AND id=$2",[op.store,id]);
   else await client.query("INSERT INTO mc_records(namespace,id,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(namespace,id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()",[op.store,id,JSON.stringify(op.value)]);
  }
  await client.query("COMMIT"); res.json({saved:ops.length});
 }catch(err){if(client)await client.query("ROLLBACK").catch(()=>{});next(err)}
 finally{client?.release()}
});

const fileIdOk=id=>/^[a-f0-9]{64}$/.test(id);
const fileKey=id=>"originais/"+id;
app.get("/api/files", protectedRoute, async(_req,res,next)=>{
 try {const {rows}=await pool.query("SELECT id,name,mime_type AS mime,byte_size AS size,created_at AS created FROM mc_files ORDER BY created_at DESC");res.json(rows)}
 catch(err){next(err)}
});
app.put("/api/files/:id", protectedRoute, express.raw({type:"application/octet-stream",limit:"52mb"}), async(req,res,next)=>{
 try {
  const id=req.params.id;
  if(!fileIdOk(id)) return res.status(400).json({error:"Identificador de arquivo inválido."});
  const name=decodeURIComponent(String(req.headers["x-file-name"]||"")).slice(0,180).replace(/[/\\\x00-\x1f]/g,"_");
  if(!name||!/\.(xlsx|xls|csv)$/i.test(name)) return res.status(415).json({error:"Envie XLSX, XLS ou CSV."});
  if(!Buffer.isBuffer(req.body)||!req.body.length||req.body.length>50*1024*1024) return res.status(413).json({error:"Arquivo vazio ou maior que 50 MB."});
  const {createHash}=await import("node:crypto");
  if(createHash("sha256").update(req.body).digest("hex")!==id) return res.status(422).json({error:"Verificação de integridade do arquivo falhou."});
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:fileKey(id),Body:req.body,ContentType:"application/octet-stream"}));
  await pool.query("INSERT INTO mc_files(id,name,mime_type,byte_size) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,mime_type=EXCLUDED.mime_type,byte_size=EXCLUDED.byte_size",[id,name,"application/octet-stream",req.body.length]);
  res.status(201).json({id,name,size:req.body.length});
 }catch(err){next(err)}
});
app.get("/api/files/:id", protectedRoute, async(req,res,next)=>{
 try {
  if(!fileIdOk(req.params.id)) return res.status(400).json({error:"Arquivo inválido."});
  const {rows}=await pool.query("SELECT name FROM mc_files WHERE id=$1",[req.params.id]);
  if(!rows.length) return res.status(404).json({error:"Arquivo não encontrado."});
  const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:fileKey(req.params.id)}));
  const disposition=req.query.mode==="download"?"attachment":"inline";
  const safe=encodeURIComponent(rows[0].name);
  res.setHeader("Content-Type","application/octet-stream");
  res.setHeader("Content-Disposition", disposition+"; filename*=UTF-8''"+safe);
  res.setHeader("Cache-Control","private, no-store");
  if(result.ContentLength)res.setHeader("Content-Length",String(result.ContentLength));
  Readable.fromWeb(result.Body.transformToWebStream()).pipe(res);
 }catch(err){next(err)}
});
app.post("/api/michelle-ai", protectedRoute, async(req,res,next)=>{
 try {
  const {default:handler}=await import("./michelle-ai.mjs");
  const headers=new Headers({"Content-Type":"application/json"});
  const webRequest=new Request("http://localhost/api/michelle-ai",{method:"POST",headers,body:JSON.stringify(req.body??{})});
  const out=await handler(webRequest);
  res.status(out.status);
  for(const [k,v] of out.headers) if(["content-type","cache-control"].includes(k)) res.setHeader(k,v);
  res.send(await out.text());
 }catch(err){next(err)}
});
app.get("/api/michelle-ai", protectedRoute, async(_req,res)=>res.json({service:"Copiloto",backend:"Railway",keyConfigured:!!(process.env.POWER_BI_MICHELLE_IA||process.env.DEEPSEEK_API_KEY)}));

// Private source files and internal docs must never be served as static assets.
app.use((req,res,next)=>{
 if(/^\/(?:server|tests|scripts|netlify|docs|\.github|node_modules)(?:\/|$)/.test(req.path) ||
    /^\/(?:package(?:-lock)?\.json|README\.md|\.env|railway\.toml)/.test(req.path))
   return res.status(404).end();
 next();
});
app.get(["/","/index.html","/arquivos.html"],async(req,res,next)=>{
 try {
  const active=await session(req);
  if(!active?.user?.id) return res.redirect(302,"/login.html");
  if(req.path==="/arquivos.html")return res.sendFile(path.join(root,"arquivos.html"));
  return res.sendFile(path.join(root,"index.html"));
 }catch(err){next(err)}
});
app.use(express.static(root,{index:false,dotfiles:"deny",maxAge:0}));
app.use((err,req,res,_next)=>{
 console.error("Erro na API:",err?.message||err);
 res.status(err.status||500).json({error:err.status&&err.status<500?err.message:"Falha ao processar a solicitação."});
});
async function boot() {
 const {runMigrations}=await getMigrations(auth.options); await runMigrations();
 await pool.query("CREATE TABLE IF NOT EXISTS mc_records(namespace text NOT NULL,id text NOT NULL,content jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(namespace,id))");
 await pool.query("CREATE TABLE IF NOT EXISTS mc_files(id text PRIMARY KEY,name text NOT NULL,mime_type text NOT NULL,byte_size bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now())");
 const initialEmail=process.env.MICHELLE_INITIAL_EMAIL?.trim().toLowerCase();
 const initialPassword=process.env.MICHELLE_INITIAL_PASSWORD;
 if(initialEmail&&initialPassword) {
  const {rows}=await pool.query('SELECT COUNT(*)::integer AS count FROM "user"');
  if(rows[0].count===0) {
   await auth.api.signUpEmail({body:{name:"PowerBI CompletoMC",email:initialEmail,password:initialPassword}});
   console.log("Primeira conta de acesso criada. Defina uma rotina segura de troca de senha.");
  }
 }
 app.listen(port,"0.0.0.0",()=>console.log("PowerBI CompletoMC ouvindo na porta "+port));
}
boot().catch(error=>{console.error("Falha ao iniciar:",error?.message||error);process.exit(1)});
