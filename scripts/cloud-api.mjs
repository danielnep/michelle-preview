import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ROOT = "power-bi-michelle/";
const SESSION = "mc_cloud_session";
const MAX_FILE = 50 * 1024 * 1024;
const MAX_JSON = 85 * 1024 * 1024;
const sha = value => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

function configured() {
  return ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_REGION", "STORAGE_ACCESS_KEY_ID",
    "STORAGE_SECRET_ACCESS_KEY", "BETTER_AUTH_SECRET", "MICHELLE_INITIAL_EMAIL",
    "MICHELLE_INITIAL_PASSWORD"].every(k => !!process.env[k]);
}
function send(res, status, value, extra = {}) {
  const payload = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store", "Content-Length": payload.length, ...extra });
  res.end(payload);
}
function fail(status, message) {
  const e = new Error(message); e.status = status; throw e;
}
async function readBody(req, limit) {
  const chunks = []; let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) fail(413, "Arquivo ou dados grandes demais para envio.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(req, max = MAX_JSON) {
  try { return JSON.parse((await readBody(req, max)).toString("utf8")); }
  catch (e) { if (e.status) throw e; fail(400, "Dados de envio inválidos."); }
}
function equal(a,b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x,y);
}
function signSession(email, expires) {
  const data = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  const mac = createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(data).digest("base64url");
  return data + "." + mac;
}
function isAuthorized(req) {
  try {
    const cookie = (req.headers.cookie || "").split(";").map(x => x.trim())
      .find(x => x.startsWith(SESSION + "="));
    if (!cookie) return false;
    const token = cookie.slice(SESSION.length + 1);
    const [data, mac] = token.split(".");
    if (!data || !mac) return false;
    const expected = createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(data).digest("base64url");
    if (!equal(mac, expected)) return false;
    const session = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return session.expires > Date.now() && equal(session.email.toLowerCase(),
      process.env.MICHELLE_INITIAL_EMAIL.toLowerCase());
  } catch (_) { return false; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return new URL(origin).host === String(host).split(",")[0].trim();
  } catch (_) { return false; }
}
const loginAttempts = new Map();
function loginRate(req) {
  const ip = String(req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown");
  const now = Date.now();
  const list = (loginAttempts.get(ip) || []).filter(t => now-t < 10*60*1000);
  if (list.length >= 10) fail(429, "Muitas tentativas. Aguarde alguns minutos.");
  list.push(now); loginAttempts.set(ip, list);
  if (loginAttempts.size > 3000) loginAttempts.clear();
}
function s3Url(key, query = "") {
  const endpoint = new URL(process.env.STORAGE_ENDPOINT);
  const bucket = process.env.STORAGE_BUCKET;
  const url = new URL(endpoint.href);
  // Railway Buckets atuais usam virtual-hosted style.
  url.hostname = bucket + "." + endpoint.hostname;
  url.pathname = "/" + key.split("/").map(encodeURIComponent).join("/");
  url.search = query;
  return url;
}
async function objectRequest(method, key, body = null, query = "") {
  const url = s3Url(key, query);
  const date = new Date(), amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0,8), region = process.env.STORAGE_REGION;
  const scope = day + "/" + region + "/s3/aws4_request";
  const content = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body);
  const hash = sha(content);
  const headers = { "host": url.host, "x-amz-date": amzDate, "x-amz-content-sha256": hash };
  const canonicalHeaders = Object.entries(headers).sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>k+":"+v+"\n").join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonical = [method, url.pathname, url.search.slice(1), canonicalHeaders,
    signedHeaders, hash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha(canonical)].join("\n");
  const kDate = hmac("AWS4"+process.env.STORAGE_SECRET_ACCESS_KEY, day);
  const kRegion = hmac(kDate, region), kService = hmac(kRegion,"s3");
  const signingKey = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const response = await fetch(url, {
    method, headers: {
      "x-amz-date": amzDate, "x-amz-content-sha256": hash,
      "Authorization": "AWS4-HMAC-SHA256 Credential=" +
        process.env.STORAGE_ACCESS_KEY_ID + "/" + scope +
        ", SignedHeaders=" + signedHeaders + ", Signature=" + signature,
      ...(body == null ? {} : { "Content-Type": "application/octet-stream" })
    },
    ...(body == null ? {} : { body: content }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) {
    if (response.status === 404) fail(404, "Arquivo não encontrado na nuvem.");
    console.error("Storage operation failed", method, response.status);
    fail(502, "O armazenamento em nuvem falhou (" + response.status + ").");
  }
  return response;
}
function decodeXml(s) {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<")
    .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
async function listKeys(prefix) {
  let token = "", all = [];
  do {
    const params = new URLSearchParams({ "list-type":"2", prefix });
    if (token) params.set("continuation-token",token);
    params.sort();
    const xml = await (await objectRequest("GET","",null,params.toString())).text();
    all.push(...[...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(x=>decodeXml(x[1])));
    const more = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    token = more ? decodeXml((xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)||[])[1]||"") : "";
    if (more && !token) fail(502, "Não foi possível concluir a listagem dos arquivos.");
  } while (token);
  return all;
}
const safeId = value => /^[a-f0-9-]{36}$/i.test(value);
const safeHash = value => /^[a-f0-9]{64}$/i.test(value);
const keyLot = id => ROOT + "lotes/" + id + ".json";
const keyFile = hash => ROOT + "originais/" + hash + ".bin";
async function listLots() {
  const keys = await listKeys(ROOT + "lotes/");
  const lots = [];
  for (let i=0;i<keys.length;i+=10) {
    const batch = await Promise.all(keys.slice(i,i+10).map(async k =>
      JSON.parse(await (await objectRequest("GET",k)).text())));
    lots.push(...batch);
  }
  return lots.sort((a,b)=>String(a.created).localeCompare(String(b.created)));
}
async function routeCloud(req, res) {
  const url = new URL(req.url, "http://internal.local");
  const path = url.pathname;
  if (path === "/health") { send(res,200,{ok:true}); return true; }
  if (!path.startsWith("/api/")) return false;
  try {
    if (path === "/api/cloud/status" && req.method === "GET") {
      send(res,200,{configured:configured(),authenticated:configured()&&isAuthorized(req)});
      return true;
    }
    if (path === "/api/michelle-ai" && req.method === "POST") {
      if (!sameOrigin(req)) fail(403,"Origem não autorizada.");
      const body = await readBody(req,2*1024*1024);
      const upstream = await fetch("https://powerbicompleto.netlify.app/api/michelle-ai",{
        method:"POST",headers:{"Content-Type":"application/json"},body,
        signal:AbortSignal.timeout(47000)
      });
      res.writeHead(upstream.status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
      res.end(Buffer.from(await upstream.arrayBuffer()));
      return true;
    }
    if (!configured()) fail(503,"O armazenamento em nuvem ainda não está configurado.");
    if (req.method !== "GET" && !sameOrigin(req)) fail(403,"Origem não autorizada.");
    if (path === "/api/cloud/login" && req.method === "POST") {
      loginRate(req);
      const credentials = await readJson(req,4096);
      if (!equal(String(credentials.email||"").toLowerCase(),process.env.MICHELLE_INITIAL_EMAIL.toLowerCase()) ||
          !equal(credentials.password||"",process.env.MICHELLE_INITIAL_PASSWORD))
        fail(401,"Email ou senha incorretos.");
      const expires = Date.now()+7*86400000;
      send(res,200,{ok:true},{"Set-Cookie":SESSION+"="+signSession(process.env.MICHELLE_INITIAL_EMAIL,expires)+
        "; Max-Age=604800; Path=/; Secure; HttpOnly; SameSite=Lax"});
      return true;
    }
    if (path === "/api/cloud/logout" && req.method === "POST") {
      send(res,200,{ok:true},{"Set-Cookie":SESSION+"=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax"});
      return true;
    }
    if (!isAuthorized(req)) fail(401,"Sessão encerrada. Entre novamente para salvar os arquivos.");
    if (path === "/api/cloud/lots" && req.method === "GET") {
      send(res,200,{lots:await listLots()}); return true;
    }
    const lot = path.match(/^\/api\/cloud\/lots\/([a-f0-9-]{36})$/i);
    if (lot && req.method === "PUT") {
      const data = await readJson(req);
      if (data.id !== lot[1] || !Array.isArray(data.rows) || !data.hash ||
          !safeHash(data.hash) || typeof data.name !== "string")
        fail(400,"Lote inválido.");
      await objectRequest("PUT",keyLot(lot[1]),JSON.stringify(data));
      send(res,200,{ok:true,id:lot[1]}); return true;
    }
    const file = path.match(/^\/api\/cloud\/files\/([a-f0-9]{64})$/i);
    if (file && req.method === "PUT") {
      const data = await readBody(req, MAX_FILE);
      if (sha(data)!==file[1].toLowerCase()) fail(400,"Assinatura do arquivo não corresponde ao conteúdo.");
      await objectRequest("PUT",keyFile(file[1].toLowerCase()),data);
      send(res,200,{ok:true,hash:file[1]}); return true;
    }
    if (file && req.method === "GET") {
      const response=await objectRequest("GET",keyFile(file[1].toLowerCase()));
      const data=Buffer.from(await response.arrayBuffer());
      res.writeHead(200,{"Content-Type":"application/octet-stream","Content-Length":data.length,
        "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"});
      res.end(data); return true;
    }
    fail(404,"Rota não encontrada.");
  } catch (error) {
    send(res,error.status||502,{error:error.status?error.message:"Falha de comunicação com a nuvem."});
    return true;
  }
}
export { routeCloud };
