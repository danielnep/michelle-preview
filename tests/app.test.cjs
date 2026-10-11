const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");
const { JSDOM, VirtualConsole } = require("jsdom");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");
const X = require("../vendor/xlsx.full.min.js");
const root = path.join(__dirname, "..");
const blobText = (w, blob) =>
  new Promise((resolve, reject) => {
    const reader = new w.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
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
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.setImmediate = setImmediate;
  w.clearImmediate = clearImmediate;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.URL.createObjectURL = (blob) => {
    w.lastDownloadedBlob = blob;
    return "blob:test";
  };
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
test("múltiplos arquivos: ligações, erro independente, deduplicação e lista permanente no quadro", async () => {
  const t = await boot();
  const { w, click } = t;
  const b = w.MichelleBridge;
  b.navigate("data");
  assert.equal(w.document.querySelector("#file-upload").multiple, true);
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(
    wb,
    X.utils.aoa_to_sheet([
      ["Rótulos de Linha", "Contagem de Ligações"],
      ["Total Geral", 3],
    ]),
    "Resumo",
  );
  X.utils.book_append_sheet(
    wb,
    X.utils.aoa_to_sheet([
      [
        "Data / Hora",
        "Duração",
        "Origem",
        "Tipo",
        "Completada",
        "Número",
        "Nome",
        "Usuário",
      ],
      [
        "01/09/2026 10:00:00",
        "00:01:30",
        "123",
        "Saída",
        "Sim",
        "555",
        "Cliente A",
        "Equipe",
      ],
      [
        "01/09/2026 10:05:00",
        "00:00:00",
        "123",
        "Saída",
        "Não",
        "556",
        "Cliente B",
        "Equipe",
      ],
    ]),
    "Sheet1",
  );
  const calls = X.write(wb, { type: "buffer", bookType: "xlsx" });
  await b.handleFiles([
    file(w, "ligações.xlsx", calls),
    file(w, "invalido.txt", [1, 2, 3]),
    file(w, "ordens.xlsx", workbook()),
  ]);
  assert.equal(b.getState().uploadQueue.length, 3);
  assert.equal(b.getState().pending.sheet, "Sheet1");
  assert.equal(b.getState().pending.type, "ligacoes");
  assert.match(
    w.document.querySelector("#dropzone").textContent,
    /invalido.txt/,
  );
  click("[data-import-queue]");
  await wait(() => b.getImports().length === 2 && !b.getState().importBusy);
  assert.equal(b.getAll().length, 5);
  assert.equal(b.D.stats(b.getAll()).unanswered, 1);
  assert.equal(w.document.querySelectorAll("#dropzone .is-imported").length, 2);
  assert.match(
    w.document.querySelector("#dropzone").textContent,
    /Importado e salvo/,
  );
  assert.match(
    w.document.querySelector("#dropzone").textContent,
    /Selecione um arquivo XLSX/,
  );
  await b.handleFile(file(w, "ligações.xlsx", calls));
  await b.confirmImport();
  assert.equal(b.getAll().length, 5);
  const reopened = await boot(t.db);
  reopened.w.MichelleBridge.navigate("data");
  assert.equal(
    reopened.w.document.querySelectorAll("#dropzone .is-imported").length,
    2,
  );
  assert.match(
    reopened.w.document.querySelector("#dropzone").textContent,
    /ligações.xlsx/,
  );
  assert.equal(
    reopened.w.document.querySelectorAll("#dropzone [data-original]").length,
    2,
  );
  assert.deepEqual(t.errors, []);
  t.dom.window.close();
  reopened.dom.window.close();
});
test("modo escuro: alternância salva e reaberta sem mudar o tema dos slides", async () => {
  const t = await boot();
  assert.equal(t.w.document.documentElement.dataset.theme, "dark");
  t.click("[data-toggle-theme]");
  await wait(() => t.w.MichelleBridge.getSettings().appearance === "light");
  t.click("[data-toggle-theme]");
  await wait(
    () =>
      t.w.MichelleBridge.getSettings().appearance === "dark" &&
      t.w.document.querySelector('[aria-label="Ativar modo claro"]'),
  );
  assert.equal(t.w.document.documentElement.dataset.theme, "dark");
  assert.equal(t.w.MichelleStudio.getState().config.theme, "graphite");
  const reopened = await boot(t.db);
  assert.equal(reopened.w.document.documentElement.dataset.theme, "dark");
  reopened.click("[data-toggle-theme]");
  await wait(() =>
    reopened.w.document.querySelector('[aria-label="Ativar modo escuro"]'),
  );
  assert.equal(reopened.w.document.documentElement.dataset.theme, "light");
  t.dom.window.close();
  reopened.dom.window.close();
});
test("busca no menu filtra o relatório e pode ser limpa sem exportar um resultado antigo", async () => {
  const t = await boot();
  const b = t.w.MichelleBridge;
  await b.handleFile(file(t.w, "operacao.xlsx", workbook()));
  await b.confirmImport();
  b.navigate("report");
  t.click("[data-generate-report]");
  t.input("#global-search", "Instalação");
  assert.equal(b.getState().report, null);
  assert.equal(
    t.w.document.querySelector('[data-export="report"]').disabled,
    true,
  );
  t.click("[data-generate-report]");
  assert.equal(b.getState().report.rows.length, 1);
  assert.match(
    t.w.document.querySelector(".active-search").textContent,
    /Instalação/,
  );
  t.click("[data-clear-query]");
  assert.equal(b.getState().query, "");
  assert.equal(b.getState().report, null);
  t.click("[data-generate-report]");
  assert.equal(b.getState().report.rows.length, 3);
  assert.equal(t.w.document.querySelectorAll("#global-search").length, 1);
  t.dom.window.close();
});
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
  assert.equal(studio.getSlides()[0].elements[0].color, "#eef3f6");
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

test("backup restaura dados, originais e biblioteca; arquivamento é reversível", async () => {
  const t = await boot(),
    b = t.w.MichelleBridge,
    s = t.w.MichelleStudio;
  await b.handleFile(file(t.w, "operacao.xlsx", workbook()));
  await b.confirmImport();
  b.navigate("present");
  s.generate();
  await s.persist();
  b.navigate("data");
  t.click("[data-archive-lot]");
  await wait(() => b.getAll().length === 0);
  t.click("[data-archive-lot]");
  await wait(() => b.getAll().length === 3);
  t.click("[data-backup]");
  await wait(() => t.w.lastDownloadedBlob);
  const content = await blobText(t.w, t.w.lastDownloadedBlob),
    json = JSON.parse(content);
  assert.equal(json.files.length, 1);
  assert.equal(json.presentations.length, 1);
  const target = await boot();
  target.w.MichelleBridge.navigate("data");
  const input = target.w.document.querySelector("#restore-backup");
  Object.defineProperty(input, "files", {
    value: [{ size: content.length, text: async () => content }],
  });
  input.dispatchEvent(new target.w.Event("change", { bubbles: true }));
  await wait(() => target.w.MichelleBridge.getAll().length === 3);
  assert.equal(target.w.MichelleStudio.getState().library.length, 1);
  assert.deepEqual(
    Buffer.from((await target.w.MCStore.all("files"))[0].bytes),
    Buffer.from(workbook()),
  );
  t.w.close();
  target.w.close();
});

test("seleção de indicadores é respeitada, quantidades são cumpridas e os modelos permanecem disponíveis", async () => {
  const t = await boot(),
    b = t.w.MichelleBridge,
    s = t.w.MichelleStudio;
  await b.handleFile(file(t.w, "operacao.xlsx", workbook()));
  await b.confirmImport();
  b.navigate("present");
  t.input("#studio-quantity", "20");
  s.generate();
  await s.persist();
  assert.equal(s.getSlides().length, 20);
  const models = [
    "executivo",
    "operacional",
    "resultados",
    "comparativo",
    "diretoria",
  ];
  for (const template of models) {
    t.input("#studio-template", template);
    t.input("#studio-quantity", "7");
    s.generate();
    await s.persist();
    assert.ok(s.getSlides().some((x) => x.kind === "cover"));
    assert.ok(s.getSlides().some((x) => x.kind === "final"));
  }
  const before = s.getState().currentId;
  for (const box of t.w.document.querySelectorAll("[data-studio-metric]")) {
    box.checked = false;
    box.dispatchEvent(new t.w.Event("input", { bubbles: true }));
  }
  s.generate();
  assert.equal(s.getState().currentId, before);
  assert.match(
    t.w.document.querySelector(".toast").textContent,
    /Selecione ao menos/,
  );
  t.w.close();
});
