import express from "express";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { getMigrations } from "better-auth/db/migration";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { mailConfigured, sendTransactionalEmail } from "./mail.mjs";
import { SECTORS, CAPABILITIES, allRights, normalizeRights, normalizeSectors, can, anyRights } from "./acl.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3000);
const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY", "STORAGE_BUCKET"];
for (const key of required) if (!process.env[key]) throw new Error("Configuração obrigatória ausente: " + key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:" + port,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({user,url}) => {
      await sendTransactionalEmail({
        to:user.email,
        subject:"Redefinição de senha | PowerBI CompletoMC",
        text:"Para definir ou recuperar sua senha, abra o link dentro de 1 hora:\n"+url+"\n\nSe você não solicitou o acesso, ignore esta mensagem."
      });
    },
    onPasswordReset: async ({user}) => {
      await pool.query("UPDATE mc_collaborators SET active=true,updated_at=now() WHERE user_id=$1",[user.id]);
    }
  },
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
app.use("/api",(req,res,next)=>{
 if(["POST","PUT","PATCH","DELETE"].includes(req.method)){
  const origin=req.get("origin");
  if(origin && origin!==process.env.BETTER_AUTH_URL) return res.status(403).json({error:"Origem não autorizada."});
 }
 next();
});


async function session(req) {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(()=>null);
}
async function protectedRoute(req,res,next) {
 try {
  const active=await session(req);
  if(!active?.user?.id)return res.status(401).json({error:"Faça login para continuar."});
  const initial=(process.env.MICHELLE_INITIAL_EMAIL||"").trim().toLowerCase();
  let access;
  if(initial && active.user.email?.toLowerCase()===initial) {
   access={owner:true,rights:allRights(),sectors:Object.keys(SECTORS),active:true};
  } else {
   const result=await pool.query("SELECT active,rights,sectors FROM mc_collaborators WHERE user_id=$1",[active.user.id]);
   if(!result.rows.length||!result.rows[0].active)return res.status(403).json({error:"Usuário ainda não ativado ou sem permissão de acesso."});
   access={owner:false,rights:normalizeRights(result.rows[0].rights),sectors:normalizeSectors(result.rows[0].sectors),active:true};
  }
  req.auth=active;
  req.access=access;
  next();
 } catch(error){next(error)}
}
function hasSector(req,sector){return req.access.owner || req.access.sectors.includes(sector);}
function requireRight(...rights){return(req,res,next)=>{
 if(!anyRights(req.access,rights))return res.status(403).json({error:"Você não tem permissão para esta operação."});
 next();
}}
const namespaces = new Set(["lots","presentations","meta"]);
const isReadable=(req,store)=>req.access.owner||
  (store==="lots"&&anyRights(req.access,["dashboard","analyses","filesView","filesUpload","reportsExport","presentationsView","ai"]))||
  (store==="presentations"&&anyRights(req.access,["presentationsView","presentationsEdit"]))||
  store==="meta";
const isWritable=(req,store)=>(req.access.owner||
  (store==="lots"&&can(req.access,"filesUpload"))||
  (store==="presentations"&&can(req.access,"presentationsEdit")));
app.get("/api/me", protectedRoute, (req,res)=>res.json({
 id:req.auth.user.id,email:req.auth.user.email,name:req.auth.user.name,
 owner:req.access.owner,rights:req.access.rights,sectors:req.access.sectors
}));
app.get("/api/permissions",protectedRoute,(req,res)=>res.json({capabilities:CAPABILITIES,sectors:SECTORS}));

app.get("/api/store/:namespace",protectedRoute,async(req,res,next)=>{
 try {
  const store=req.params.namespace;
  if(!namespaces.has(store))return res.status(404).json({error:"Recurso inválido."});
  if(!isReadable(req,store))return res.status(403).json({error:"Sem permissão para visualizar."});
  if(store==="lots"&&!req.access.owner){
   const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace='lots' AND content->>'sector'=ANY($1::text[]) ORDER BY created_at ASC",[req.access.sectors]);
   return res.json(rows.map(x=>x.content));
  }
  const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace=$1 ORDER BY created_at ASC",[store]);
  res.json(rows.map(x=>x.content));
 }catch(err){next(err)}
});
app.get("/api/store/:namespace/:id",protectedRoute,async(req,res,next)=>{
 try {
  const store=req.params.namespace;
  if(!namespaces.has(store))return res.status(404).json({error:"Recurso inválido."});
  if(!isReadable(req,store))return res.status(403).json({error:"Sem permissão para visualizar."});
  const {rows}=await pool.query("SELECT content FROM mc_records WHERE namespace=$1 AND id=$2",[store,req.params.id]);
  if(store==="lots"&&rows.length&&!hasSector(req,rows[0].content.sector))return res.status(403).json({error:"Setor não autorizado."});
  res.json(rows[0]?.content??null);
 }catch(err){next(err)}
});
app.post("/api/store/batch",protectedRoute,async(req,res,next)=>{
 const ops=req.body?.ops;
 if(!Array.isArray(ops)||ops.length>500)return res.status(400).json({error:"Lote inválido."});
 let client;
 try {
  client=await pool.connect();await client.query("BEGIN");
  for(const op of ops){
   if(!namespaces.has(op.store))throw Object.assign(new Error("Coleção inválida."),{status:400});
   if(!isWritable(req,op.store))throw Object.assign(new Error("Ação não autorizada."),{status:403});
   const id=String(op.remove?op.id:op.value?.id||"");
   if(!id||id.length>200)throw Object.assign(new Error("Identificador inválido."),{status:400});
   if(op.store==="lots"){
    const previous=await client.query("SELECT content FROM mc_records WHERE namespace='lots' AND id=$1",[id]);
    if(previous.rows.length&&!hasSector(req,previous.rows[0].content.sector))
      throw Object.assign(new Error("Arquivo pertence a setor não autorizado."),{status:403});
    if(!op.remove&&!hasSector(req,op.value?.sector))
      throw Object.assign(new Error("Setor não autorizado."),{status:403});
   }
   if(op.remove)await client.query("DELETE FROM mc_records WHERE namespace=$1 AND id=$2",[op.store,id]);
   else await client.query("INSERT INTO mc_records(namespace,id,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(namespace,id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()",[op.store,id,JSON.stringify(op.value)]);
  }
  await client.query("COMMIT");res.json({saved:ops.length});
 }catch(err){if(client)await client.query("ROLLBACK").catch(()=>{});next(err)}
 finally{client?.release()}
});

const administrator=(req,res,next)=>req.access?.owner?next():res.status(403).json({error:"Somente a administradora pode gerenciar colaboradores."});
app.get("/api/collaborators",protectedRoute,administrator,async(_req,res,next)=>{
 try{
  const {rows}=await pool.query("SELECT user_id AS id,name,email,active,rights,sectors,created_at AS created,updated_at AS updated FROM mc_collaborators ORDER BY created_at DESC");
  res.json({users:rows,capabilities:CAPABILITIES,sectors:SECTORS,mailReady:mailConfigured()});
 }catch(error){next(error)}
});
app.get("/api/mail-status",protectedRoute,administrator,(_req,res)=>res.json({configured:mailConfigured()}));
app.post("/api/collaborators",protectedRoute,administrator,async(req,res,next)=>{
 try{
  const name=String(req.body?.name||"").trim().slice(0,120);
  const email=String(req.body?.email||"").trim().toLowerCase().slice(0,254);
  const rights=normalizeRights(req.body?.rights);
  const sectors=normalizeSectors(req.body?.sectors);
  if(name.length<2||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Informe nome e e-mail válido."});
  if(email===process.env.MICHELLE_INITIAL_EMAIL?.trim().toLowerCase())return res.status(409).json({error:"Este e-mail é da administradora."});
  if(!sectors.length)return res.status(400).json({error:"Selecione pelo menos um setor."});
  if(!Object.values(rights).some(Boolean))return res.status(400).json({error:"Selecione pelo menos uma permissão."});
  if(!mailConfigured())return res.status(503).json({error:"Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD e SMTP_FROM no Railway para enviar convites."});
  const present=await pool.query('SELECT 1 FROM "user" WHERE lower(email)=$1',[email]);
  if(present.rows.length)return res.status(409).json({error:"Este e-mail já tem cadastro no aplicativo."});
  const temporaryPassword=randomBytes(36).toString("base64url");
  const account=await auth.api.signUpEmail({body:{name,email,password:temporaryPassword}});
  const userId=account?.user?.id;
  if(!userId)throw Error("A autenticação não confirmou a criação do usuário.");
  await pool.query("INSERT INTO mc_collaborators(user_id,name,email,active,rights,sectors) VALUES($1,$2,$3,false,$4::jsonb,$5::jsonb)",
   [userId,name,email,JSON.stringify(rights),JSON.stringify(sectors)]);
  let invited=false;
  try {
   await auth.api.requestPasswordReset({body:{email,redirectTo:(process.env.BETTER_AUTH_URL||"")+"/redefinir-senha.html"}});
   invited=true;
  }catch(error){console.error("Falha ao convidar:",error?.message||error)}
  res.status(201).json({id:userId,name,email,active:false,invited,
   message:invited?"Conta criada. O colaborador receberá um link para definir a própria senha.":"Conta criada, mas o convite não foi enviado. Use Reenviar convite."});
 }catch(error){next(error)}
});
app.patch("/api/collaborators/:id",protectedRoute,administrator,async(req,res,next)=>{
 try {
  const id=String(req.params.id);
  const rights=normalizeRights(req.body?.rights);
  const sectors=normalizeSectors(req.body?.sectors);
  const active=req.body?.active===true;
  const exists=await pool.query("SELECT 1 FROM mc_collaborators WHERE user_id=$1",[id]);
  if(!exists.rows.length)return res.status(404).json({error:"Colaborador não encontrado."});
  await pool.query("UPDATE mc_collaborators SET rights=$2::jsonb,sectors=$3::jsonb,active=$4,updated_at=now() WHERE user_id=$1",
   [id,JSON.stringify(rights),JSON.stringify(sectors),active]);
  if(!active)await pool.query('DELETE FROM "session" WHERE "userId"=$1',[id]);
  res.json({saved:true});
 }catch(error){next(error)}
});
app.post("/api/collaborators/:id/reinvite",protectedRoute,administrator,async(req,res,next)=>{
 try{
  if(!mailConfigured())return res.status(503).json({error:"Configure o serviço de e-mail no Railway antes de enviar convites."});
  const {rows}=await pool.query("SELECT email FROM mc_collaborators WHERE user_id=$1",[String(req.params.id)]);
  if(!rows.length)return res.status(404).json({error:"Colaborador não encontrado."});
  await auth.api.requestPasswordReset({body:{email:rows[0].email,redirectTo:(process.env.BETTER_AUTH_URL||"")+"/redefinir-senha.html"}});
  res.json({sent:true});
 }catch(error){next(error)}
});

const fileIdOk=id=>/^[a-f0-9]{64}$/.test(id);
const fileKey=id=>"originais/"+id;
async function accessibleFile(req,id){
 if(req.access.owner)return true;
 const result=await pool.query("SELECT 1 FROM mc_records WHERE namespace='lots' AND content->>'fileId'=$1 AND content->>'sector'=ANY($2::text[]) LIMIT 1",[id,req.access.sectors]);
 if(result.rows.length)return true;
 const pending=await pool.query("SELECT 1 FROM mc_files WHERE id=$1 AND uploaded_by=$2 AND NOT EXISTS(SELECT 1 FROM mc_records WHERE namespace='lots' AND content->>'fileId'=$1) LIMIT 1",[id,req.auth.user.id]);
 return pending.rows.length>0;
}
app.get("/api/files",protectedRoute,requireRight("filesView","filesUpload","filesDownload"),async(req,res,next)=>{
 try{
  let result;
  if(req.access.owner)result=await pool.query("SELECT id,name,mime_type AS mime,byte_size AS size,created_at AS created FROM mc_files ORDER BY created_at DESC");
  else result=await pool.query("SELECT f.id,f.name,f.mime_type AS mime,f.byte_size AS size,f.created_at AS created FROM mc_files f WHERE (f.uploaded_by=$1 AND NOT EXISTS(SELECT 1 FROM mc_records z WHERE z.namespace='lots' AND z.content->>'fileId'=f.id)) OR EXISTS(SELECT 1 FROM mc_records l WHERE l.namespace='lots' AND l.content->>'fileId'=f.id AND l.content->>'sector'=ANY($2::text[])) ORDER BY f.created_at DESC",[req.auth.user.id,req.access.sectors]);
  res.json(result.rows);
 }catch(err){next(err)}
});
app.put("/api/files/:id",protectedRoute,requireRight("filesUpload"),express.raw({type:"application/octet-stream",limit:"52mb"}),async(req,res,next)=>{
 try {
  const id=req.params.id;
  if(!fileIdOk(id))return res.status(400).json({error:"Identificador de arquivo inválido."});
  if(!await accessibleFile(req,id)){
    const exists=await pool.query("SELECT 1 FROM mc_files WHERE id=$1",[id]);
    if(exists.rows.length)return res.status(403).json({error:"Você não tem permissão sobre esse arquivo."});
  }
  const name=decodeURIComponent(String(req.headers["x-file-name"]||"")).slice(0,180).replace(/[/\\\x00-\x1f]/g,"_");
  if(!name||!/\.(xlsx|xls|csv)$/i.test(name))return res.status(415).json({error:"Envie XLSX, XLS ou CSV."});
  if(!Buffer.isBuffer(req.body)||!req.body.length||req.body.length>50*1024*1024)return res.status(413).json({error:"Arquivo vazio ou maior que 50 MB."});
  const {createHash}=await import("node:crypto");
  if(createHash("sha256").update(req.body).digest("hex")!==id)return res.status(422).json({error:"Verificação de integridade falhou."});
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:fileKey(id),Body:req.body,ContentType:"application/octet-stream"}));
  await pool.query("INSERT INTO mc_files(id,name,mime_type,byte_size,uploaded_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING",[id,name,"application/octet-stream",req.body.length,req.auth.user.id]);
  res.status(201).json({id,name,size:req.body.length});
 }catch(err){next(err)}
});
app.get("/api/files/:id",protectedRoute,requireRight("filesDownload"),async(req,res,next)=>{
 try {
  if(!fileIdOk(req.params.id))return res.status(400).json({error:"Arquivo inválido."});
  if(!await accessibleFile(req,req.params.id))return res.status(403).json({error:"Arquivo não autorizado."});
  const {rows}=await pool.query("SELECT name FROM mc_files WHERE id=$1",[req.params.id]);
  if(!rows.length)return res.status(404).json({error:"Arquivo não encontrado."});
  const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:fileKey(req.params.id)}));
  const disposition=req.query.mode==="download"?"attachment":"inline";
  res.setHeader("Content-Type","application/octet-stream");
  res.setHeader("Content-Disposition",disposition+"; filename*=UTF-8''"+encodeURIComponent(rows[0].name));
  res.setHeader("Cache-Control","private, no-store");
  if(result.ContentLength)res.setHeader("Content-Length",String(result.ContentLength));
  Readable.fromWeb(result.Body.transformToWebStream()).pipe(res);
 }catch(err){next(err)}
});
app.post("/api/michelle-ai", protectedRoute, requireRight("ai"), async(req,res,next)=>{
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
app.get("/api/michelle-ai", protectedRoute, requireRight("ai"), async(_req,res)=>res.json({service:"Copiloto",backend:"Railway",keyConfigured:!!(process.env.POWER_BI_MICHELLE_IA||process.env.DEEPSEEK_API_KEY)}));

// Private source files and internal docs must never be served as static assets.
app.use((req,res,next)=>{
 if(/^\/(?:server|tests|scripts|netlify|docs|\.github|node_modules)(?:\/|$)/.test(req.path) ||
    /^\/(?:package(?:-lock)?\.json|README\.md|\.env|railway\.toml)/.test(req.path))
   return res.status(404).end();
 next();
});
app.get(["/","/index.html","/arquivos.html","/colaboradores.html"],async(req,res,next)=>{
 try {
  const active=await session(req);
  if(!active?.user?.id) return res.redirect(302,"/login.html");
  if(req.path==="/colaboradores.html"){
   if(!process.env.MICHELLE_INITIAL_EMAIL||active.user.email?.toLowerCase()!==process.env.MICHELLE_INITIAL_EMAIL.trim().toLowerCase())return res.status(403).send("Somente a administradora pode gerenciar colaboradores.");
   return res.sendFile(path.join(root,"colaboradores.html"));
  }
  if(req.path==="/arquivos.html"){
   const {rows}=await pool.query("SELECT active,rights FROM mc_collaborators WHERE user_id=$1",[active.user.id]);
   const owner=process.env.MICHELLE_INITIAL_EMAIL&&active.user.email?.toLowerCase()===process.env.MICHELLE_INITIAL_EMAIL?.toLowerCase();
   if(!owner && (!rows[0]?.active || !anyRights({rights:normalizeRights(rows[0]?.rights)},["filesView","filesDownload"])))return res.status(403).send("Sem permissão.");
   return res.sendFile(path.join(root,"arquivos.html"));
  }
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
 await pool.query("CREATE TABLE IF NOT EXISTS mc_files(id text PRIMARY KEY,name text NOT NULL,mime_type text NOT NULL,byte_size bigint NOT NULL,uploaded_by text,created_at timestamptz NOT NULL DEFAULT now())");
 await pool.query("ALTER TABLE mc_files ADD COLUMN IF NOT EXISTS uploaded_by text");
 await pool.query("CREATE TABLE IF NOT EXISTS mc_collaborators(user_id text PRIMARY KEY,email text UNIQUE NOT NULL,name text NOT NULL,active boolean NOT NULL DEFAULT false,rights jsonb NOT NULL DEFAULT '{}'::jsonb,sectors jsonb NOT NULL DEFAULT '[]'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())");
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
