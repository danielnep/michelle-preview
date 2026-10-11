const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");
const { JSDOM, VirtualConsole } = require("jsdom");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");
const X = require("../vendor/xlsx.full.min.js");
const root = path.join(__dirname, "..");
const wait = async (fn) => {
  for (let n = 0; n < 200; n++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("Operação não concluiu");
};
async function boot(db = new IDBFactory()) {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    {
      url: "https://example.test/",
      runScripts: "outside-only",
      virtualConsole: vc,
      pretendToBeVisual: true,
    },
  );
  const w = dom.window;
  Object.defineProperty(w, "indexedDB", { value: db });
  w.IDBKeyRange = IDBKeyRange;
  Object.defineProperty(w, "crypto", { value: webcrypto });
  w.structuredClone = structuredClone;
  w.scrollTo = () => {};
  w.setImmediate = setImmediate;
  w.clearImmediate = clearImmediate;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.URL.createObjectURL = () => "blob:test";
  w.URL.revokeObjectURL = () => {};
  for (const file of [
    "vendor/xlsx.full.min.js",
    "vendor/jszip.min.js",
    "data-core.js",
    "pptx.js",
    "app.js",
    "studio.js",
  ])
    w.eval(fs.readFileSync(path.join(root, file), "utf8"));
  await wait(
    () =>
      w.MichelleBridge.getState().ready && w.MichelleStudio.getState().ready,
  );
  return {
    dom,
    w,
    errors,
    db,
    click: (s) => {
      const el = w.document.querySelector(s);
      assert.ok(el, s);
      el.click();
    },
    input: (s, v) => {
      const el = w.document.querySelector(s);
      assert.ok(el, s);
      el.value = v;
      el.dispatchEvent(new w.Event("input", { bubbles: true }));
      el.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
  };
}
function file(w, name, bytes) {
  const a = new w.Uint8Array(bytes);
  return { name, size: a.length, arrayBuffer: async () => a.buffer };
}
function workbook() {
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(
    wb,
    X.utils.aoa_to_sheet([
      ["Rótulos de Linha", "Contagem de Número da OS"],
      ["Técnico", 3],
    ]),
    "Resumo",
  );
  X.utils.book_append_sheet(
    wb,
    X.utils.aoa_to_sheet([
      [
        "Empresa",
        "Número da OS",
        "Status da OS",
        "Data de abertura da OS",
        "Solicitação",
      ],
      ["Horizon", "001", "aberta", "01/09/2026", "Instalação"],
      ["Horizon", "002", "fechada", "02/09/2026", "Manutenção"],
      ["Horizon", "003", "cancelada", "03/09/2026", "Revisão"],
    ]),
    "Registros",
  );
  return X.write(wb, { type: "buffer", bookType: "xlsx" });
}
test("fluxo integrado: Excel → relatório/exportação → slides → edição → TV → recarga", async () => {
  const t = await boot();
  const { w, click, input } = t,
    b = w.MichelleBridge,
    studio = w.MichelleStudio;
  assert.equal(b.getAll().length, 0);
  await b.handleFile(file(w, "operacao.xlsx", workbook()));
  assert.equal(b.getState().pending.sheet, "Registros");
  assert.equal(b.getState().pending.type, "ordens");
  await b.confirmImport();
  assert.equal(b.getAll().length, 3);
  assert.equal(b.D.stats(b.getAll()).cancelled, 1);
  await b.handleFile(file(w, "operacao.xlsx", workbook()));
  await b.confirmImport();
  assert.equal(b.getAll().length, 3);
  b.navigate("report");
  assert.equal(
    w.document.querySelector('[data-export="report"]').disabled,
    true,
  );
  click("[data-generate-report]");
  assert.equal(b.getState().report.rows.length, 3);
  assert.equal(
    w.document.querySelector('[data-export="report"]').disabled,
    false,
  );
  const content = w.document.querySelector(".content");
  assert.match(
    content.querySelector(".overview-head").nextElementSibling.textContent,
    /Insights operacionais/,
  );
  let saved;
  w.XLSX.writeFile = (wb) => {
    saved = wb;
  };
  click('[data-export="report"]');
  assert.equal(w.XLSX.utils.sheet_to_json(saved.Sheets.Dados).length, 3);
  input("#report-start", "2026-09-02");
  assert.equal(b.getState().report, null);
  assert.equal(
    w.document.querySelector('[data-export="report"]').disabled,
    true,
  );
  click("[data-generate-report]");
  assert.equal(b.getState().report.rows.length, 2);
  b.navigate("present");
  click("[data-studio-generate]");
  await studio.persist();
  assert.ok(studio.getSlides().length >= 7);
  assert.equal(studio.getState().config.theme, "graphite");
  assert.ok(studio.getSlides().every((s) => s.transition === "fade"));
  assert.ok(studio.getSlides().some((s) => s.insights.length));
  input("#studio-slide-title", "Reunião validada");
  click("[data-element-add]");
  input('[data-element-field="text"]', "Texto de teste");
  click(".element-editor [data-element-position]");
  input("#position-x", "99");
  input("#position-y", "99");
  click("[data-position-save]");
  await studio.persist();
  assert.equal(studio.getSlides()[0].elements[0].x, 60);
  assert.equal(studio.getSlides()[0].elements[0].y, 85);
  click(".element-editor [data-element-position]");
  input("#position-x", "0");
  click("[data-position-cancel]");
  assert.equal(studio.getSlides()[0].elements[0].x, 60);
  click('[data-element-position="required-title"]');
  input("#position-x", "8");
  input("#position-y", "20");
  click("[data-position-save]");
  assert.equal(studio.getSlides()[0].layout.title.x, 8);
  assert.equal(w.document.querySelectorAll("[data-element-delete]").length, 1);
  input("#studio-theme-select", "horizon");
  input("#studio-background", "#e1f0fa");
  input("#studio-transition", "zoom");
  click("[data-transition-all]");
  input("#signature-text", "Michelle Cândido");
  await studio.persist();
  assert.ok(studio.getSlides().every((s) => s.transition === "zoom"));
  click("[data-studio-present]");
  assert.ok(w.document.querySelector("#tv-presenter"));
  assert.equal(w.document.querySelectorAll("#tv-presenter button").length, 0);
  for (const key of ["ArrowRight", " ", "Enter"])
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", { key, bubbles: true }),
    );
  assert.equal(studio.getState().position, 3);
  for (const key of ["ArrowLeft", "Backspace"])
    w.document.dispatchEvent(
      new w.KeyboardEvent("keydown", { key, bubbles: true }),
    );
  assert.equal(studio.getState().position, 1);
  w.document.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(w.document.querySelector("#tv-presenter"), null);
  const id = studio.getState().currentId,
    second = await boot(t.db);
  assert.equal(second.w.MichelleBridge.getAll().length, 3);
  await second.w.MichelleStudio.openPresentation(id);
  assert.equal(
    second.w.MichelleStudio.getSlides()[0].title,
    "Reunião validada",
  );
  assert.equal(
    second.w.MichelleStudio.getSlides()[0].elements[0].text,
    "Texto de teste",
  );
  assert.equal(
    second.w.MichelleStudio.getState().config.signature.text,
    "Michelle Cândido",
  );
  assert.equal(second.w.MichelleBridge.getAll()[0].title, "Instalação");
  assert.equal(t.errors.length, 0);
  assert.equal(second.errors.length, 0);
  w.close();
  second.w.close();
});
test("PPTX real: conteúdo/imagem/gráfico, proporção, original e biblioteca persistentes", async () => {
  const t = await boot(),
    bytes = fs.readFileSync(path.join(__dirname, "fixtures/presentation.pptx")),
    f = file(t.w, "presentation.pptx", bytes);
  const result = await t.w.MCPowerPoint.importFile(f);
  assert.equal(result.slides.length, 2);
  assert.equal(result.width / result.height, 4 / 3);
  const decode = (s) => Buffer.from(s.split(",")[1], "base64").toString();
  assert.match(decode(result.slides[0].svg), /Validação Horizon/);
  assert.match(decode(result.slides[0].svg), /data:image\/png;base64/);
  assert.match(decode(result.slides[1].svg), /Concluídos/);
  assert.match(decode(result.slides[1].svg), /<rect/);
  await t.w.MichelleStudio.importPptx(f);
  const state = t.w.MichelleStudio.getState();
  assert.equal(state.origin, "imported");
  assert.equal(state.library.length, 1);
  assert.equal(state.slides.length, 2);
  const original = await t.w.MCStore.read("files", state.fileId);
  assert.deepEqual(Buffer.from(original.bytes), bytes);
  const second = await boot(t.db);
  assert.equal(second.w.MichelleStudio.getState().library.length, 1);
  await second.w.MichelleStudio.openPresentation(state.currentId);
  assert.equal(second.w.MichelleStudio.getSlides().length, 2);
  assert.equal(
    second.w.MichelleStudio.getState().width /
      second.w.MichelleStudio.getState().height,
    4 / 3,
  );
  assert.equal(t.errors.length, 0);
  t.w.close();
  second.w.close();
});
test("persistência falha sem contabilizar uma importação como salva", async () => {
  const t = await boot(),
    b = t.w.MichelleBridge;
  await b.handleFile(file(t.w, "operacao.xlsx", workbook()));
  const batch = t.w.MCStore.batch;
  t.w.MCStore.batch = async () => {
    throw Error("Sem espaço");
  };
  await b.confirmImport();
  assert.equal(b.getAll().length, 0);
  assert.ok(b.getState().pending);
  assert.match(t.w.document.querySelector(".toast").textContent, /Sem espaço/);
  t.w.MCStore.batch = batch;
  t.w.close();
});
