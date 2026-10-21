const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const id = "a".repeat(64);

function cloudSession(fetch) {
  const dom = new JSDOM("", { url: "https://example.test/", runScripts: "outside-only" });
  dom.window.fetch = fetch;
  Object.defineProperty(dom.window, "indexedDB", { get() { throw Error("Persistência local indevida"); } });
  dom.window.MCStore = { batch() { throw Error("Fallback local indevido"); } };
  dom.window.eval(fs.readFileSync(path.join(__dirname, "../mc-cloud-store.js"), "utf8"));
  return dom;
}

test("envio salva original e dados pela API; outra sessão recupera a mesma base sem armazenamento local", async () => {
  const files = new Map(), records = new Map(), calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === "/api/me") return Response.json({ owner: true });
    if (url === "/api/files") return Response.json([...files.values()].map(file => ({ id: file.id, name: file.name })));
    if (url === "/api/files/" + id && options.method === "PUT") {
      files.set(id, { id, name: decodeURIComponent(options.headers["X-File-Name"]), bytes: Buffer.from(options.body) });
      return Response.json({ id }, { status: 201 });
    }
    if (url === "/api/store/batch") {
      assert.ok(files.has(id), "O original deve ser salvo antes dos registros");
      for (const op of JSON.parse(options.body).ops) records.set(op.store + "/" + op.value.id, op.value);
      return Response.json({ saved: true });
    }
    if (url === "/api/store/lots/lote") return Response.json(records.get("lots/lote"));
    if (url === "/api/files/" + id) return new Response(files.get(id).bytes);
    throw Error("Requisição inesperada: " + url);
  };
  const first = cloudSession(fetch), second = cloudSession(fetch);
  try {
    await first.window.MCStore.open();
    const bytes = new first.window.Uint8Array([10, 20, 30]).buffer;
    await first.window.MCStore.batch([
      { store: "files", value: { id, name: "Michelle.csv", bytes } },
      { store: "lots", value: { id: "lote", fileId: id, rows: [{ value: 42 }] } }
    ]);
    assert.equal(first.window.MCCloudFiles.list()[0].id, id);
    await second.window.MCStore.open();
    assert.equal((await second.window.MCStore.read("lots", "lote")).rows[0].value, 42);
    const original = await second.window.MCStore.read("files", id);
    assert.equal(original.name, "Michelle.csv");
    assert.deepEqual([...new Uint8Array(original.bytes)], [10, 20, 30]);
    assert.equal(first.window.localStorage.length, 0);
    assert.equal(second.window.localStorage.length, 0);
    assert.ok(calls.every(call => call.options.credentials === "same-origin" && call.options.cache === "no-store"));
  } finally { first.window.close(); second.window.close(); }
});

test("falha no envio à nuvem não confirma registros nem recorre ao armazenamento do navegador", async () => {
  const calls = [];
  const dom = cloudSession(async url => {
    calls.push(url);
    return Response.json({ error: "Armazenamento indisponível" }, { status: 503 });
  });
  try {
    await assert.rejects(dom.window.MCStore.batch([
      { store: "files", value: { id, name: "Michelle.csv", bytes: new dom.window.Uint8Array([10]).buffer } },
      { store: "lots", value: { id: "lote", fileId: id } }
    ]), /Armazenamento indisponível/);
    assert.deepEqual(calls, ["/api/files/" + id]);
    assert.equal(dom.window.MCCloudFiles.list().length, 0);
    assert.equal(dom.window.localStorage.length, 0);
  } finally { dom.window.close(); }
});

test("falha depois de salvar o original reconcilia catálogo e mantém erro real", async () => {
  const saved = new Map(), calls=[];
  const dom=cloudSession(async (url,options) => {
    calls.push(url);
    if(url==="/api/me")return Response.json({owner:true});
    if(url==="/api/files")return Response.json([...saved.values()]);
    if(url==="/api/files/"+id && options.method==="PUT"){
      saved.set(id,{id,name:"teste.xlsx"});return Response.json({id},{status:201});
    }
    if(url==="/api/store/batch")return Response.json({error:"Falha na gravação das abas"},{status:503});
    throw Error("Chamada inesperada "+url);
  });
  try{
    await dom.window.MCStore.open();
    const bytes=new dom.window.Uint8Array([1,2,3]).buffer;
    await assert.rejects(dom.window.MCStore.batch([
      {store:"files",value:{id,name:"teste.xlsx",bytes}},
      {store:"lots",value:{id:"aba",fileId:id,rows:[{id:"A"}]}}
    ]),/Falha na gravação das abas/);
    assert.equal(dom.window.MCCloudFiles.list()[0].id,id);
    assert.deepEqual(calls,["/api/me","/api/files","/api/files/"+id,"/api/store/batch","/api/files"]);
    assert.equal(dom.window.localStorage.length,0);
  }finally{dom.window.close();}
});

test("originais novos são enviados à pasta do Power BI MC e preservam bytes e chaves próprias", async () => {
  const { uploadOriginal, downloadOriginal } = await import("../server/file-storage.mjs");
  const objects = new Map(), commands = [];
  const s3 = { async send(command) {
    commands.push(command);
    if (command.constructor.name === "PutObjectCommand") {
      objects.set(command.input.Key, command.input.Body); return {};
    }
    return { Body: objects.get(command.input.Key) };
  } };
  const bytes = Buffer.from("coluna\n42");
  const firstKey = await uploadOriginal(s3, "bucket-do-projeto", id, bytes);
  const nextKey = await uploadOriginal(s3, "bucket-do-projeto", id, bytes);
  assert.match(firstKey, /^power-bi-mc\/arquivos-enviados\/originais\//);
  assert.notEqual(firstKey, nextKey, "Reimportação precisa de chave própria para não sofrer uma limpeza anterior");
  assert.ok(commands.every(command => command.input.Bucket === "bucket-do-projeto"));
  assert.equal(objects.size, 2);
  const downloaded = await downloadOriginal(s3, "bucket-do-projeto", { id, object_key: firstKey });
  assert.deepEqual(downloaded.Body, bytes);
  assert.equal(commands.at(-1).input.Key, firstKey);
});

test("leitura e exclusão continuam usando as chaves dos originais anteriores e o caminho legado", async () => {
  const { downloadOriginal } = await import("../server/file-storage.mjs");
  const { deleteFiles } = await import("../server/file-library.mjs");
  const files = [
    { id, object_key: "originais/" + id + "-envio-anterior" },
    { id: "b".repeat(64), object_key: null },
    { id: "c".repeat(64), object_key: "power-bi-mc/arquivos-enviados/originais/chave-atual" }
  ];
  const downloaded = [], cleanup = [];
  const s3 = { async send(command) { downloaded.push(command.input.Key); return {}; } };
  for (const file of files) await downloadOriginal(s3, "bucket-do-projeto", file);
  const expected = [files[0].object_key, "originais/" + files[1].id, files[2].object_key];
  assert.deepEqual(downloaded, expected);
  const pool = { async connect() { return {
    async query(sql, values) {
      if (sql.startsWith("SELECT id,")) return { rows: files };
      if (sql.startsWith("INSERT INTO mc_file_cleanup")) cleanup.push(values[0]);
      return { rows: [], rowCount: 0 };
    }, release() {}
  }; } };
  await deleteFiles(pool, { owner: true }, "michelle", files.map(file => file.id));
  assert.deepEqual(cleanup, expected, "A limpeza deve excluir exatamente os mesmos objetos que são lidos");
});
