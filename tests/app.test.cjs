const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");
const { JSDOM, VirtualConsole } = require("jsdom");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");
const X = require("../vendor/xlsx.full.min.js");
const root = path.join(__dirname, "..");
test("COI abre importação no destino escolhido e exclusão sai da base, persiste e pode ser restaurada", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  b.navigate("coi"); t.click("[data-import-coi]");
  assert.equal(b.getState().page, "data");
  await b.handleFile(file(t.w, "ordens.xlsx", workbook()));
  assert.equal(b.getImports()[0].sector, "coi");
  await b.confirmImport();
  assert.equal(b.getAll().length, 3);
  const id = b.getImports()[0].id;
  t.click("[data-delete-lot]");
  await wait(() => b.getAll().length === 0);
  assert.equal(b.getImports()[0].deleted, true);
  assert.equal(t.w.document.querySelectorAll("#dropzone .is-imported").length, 0);
  assert.match(t.w.document.querySelector(".deleted-files").textContent, /Restaurar arquivo/);
  const reopened = await boot(t.db);
  assert.equal(reopened.w.MichelleBridge.getAll().length, 0);
  reopened.w.MichelleBridge.navigate("data");
  reopened.click("[data-restore-lot]");
  await wait(() => reopened.w.MichelleBridge.getAll().length === 3);
  assert.equal(reopened.w.MichelleBridge.getImports()[0].id, id);
  assert.equal(reopened.w.MichelleBridge.getImports()[0].rows[0].raw["Número da OS"], "001");
  reopened.w.MichelleBridge.navigate("coi"); reopened.click("[data-dashboard-coi]");
  assert.equal(reopened.w.MichelleDashboard.getConfig().sector, "coi");
  assert.equal(reopened.w.MichelleDashboard.model().rows.length, 3);
  assert.equal(t.errors.length + reopened.errors.length, 0);
  t.w.close(); reopened.w.close();
});
test("importação automática em janela aceita arquivo sem datas e oferece relatório, dashboard e nova apresentação", async () => {
  const t = await boot(), b = t.w.MichelleBridge, w = t.w;
  b.navigate("data");
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["CUC", "Número de Eventos"], ["Restauração", 100], ["Teste", 50]]), "Eventos");
  await b.handleFiles([file(w, "eventos.xlsx", X.write(wb, { type: "buffer", bookType: "xlsx" })), file(w, "ordens.xlsx", workbook())]);
  assert.equal(w.document.querySelector("#import-review"), null);
  assert.equal(b.getImports().find(l=>l.type==="cuc").periodStart, null);
  await wait(() => b.getImports().length === 2 && !b.getState().importBusy);
  assert.equal(w.document.querySelector("#import-review"), null);
  assert.equal(b.getImports().find(l => l.type === "cuc").periodStart, null);
  assert.equal(b.D.stats(b.getAll()).byType.cuc.value, 150);
  assert.ok(b.getImports().every(l => l.mapping && l.interpretationVersion >= 2));
  t.click("[data-quick-report]");
  assert.equal(b.getState().page, "report");
  assert.equal(b.getState().report.rows.length, 5);
  b.navigate("data");
  t.click('.data-next-actions [data-nav="dashboard"]');
  assert.equal(w.MichelleDashboard.model().intelligence.profiles.find(p => p.type === "cuc").total, 150);
  assert.match(w.document.querySelector('[data-dash-widget="reading"]').textContent, /Número de Eventos/);
  const lot = b.getImports().find(l => l.type === "cuc"), row = lot.rows[0];
  assert.equal(row.date, null);
  assert.equal(row.raw["CUC"], "Restauração");
  assert.match(w.document.querySelector('[data-dash-widget="records"]').textContent, /Ver linha/);
  b.navigate("data");
  t.click("[data-create-presentation]");
  await wait(() => w.MichelleStudio.getState().library.length === 1);
  const firstId = w.MichelleStudio.getState().currentId;
  b.navigate("data"); t.click("[data-create-presentation]");
  await wait(() => w.MichelleStudio.getState().library.length === 2);
  assert.notEqual(w.MichelleStudio.getState().currentId, firstId);
  assert.equal(t.errors.length, 0);
  t.w.close();
});
test("dashboard cruza contas, expõe ausência de período e aplica o filtro sem misturar empresas", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  const row = (id, type, company, extra = {}) => ({ id, type, company, account: "0010", client: "Cliente", sector: "tec", value: 1, status: "Pendente", title: "Atendimento", raw: { Empresa: company, Conta: "0010" }, line: 2, ...extra });
  b.getImports().push({ id: "orders", rows: [row("1", "ordens", "Empresa A", { date: "2026-09-03" }), row("2", "ordens", "Empresa B", { date: "2026-09-03" })] }, { id: "trips", rows: [row("3", "deslocamentos", "Empresa A", { value: 10 })] });
  b.navigate("dashboard");
  assert.match(t.w.document.querySelector('[data-dash-widget="crossings"]').textContent, /Não informado · vínculo só pela conta/);
  t.click("[data-dash-account]");
  assert.equal(t.w.MichelleDashboard.model().rows.length, 2);
  assert.ok(t.w.MichelleDashboard.model().rows.every(r => r.company === "Empresa A"));
  assert.ok(t.w.document.querySelector("[data-dash-clear-account]"));
  t.click("[data-dash-clear-account]");
  assert.equal(t.w.MichelleDashboard.model().rows.length, 3);
  assert.equal(t.errors.length, 0);
  t.w.close();
});
test("Power BI seguro: validação do link, persistência, troca de origem e tela cheia sem recriar relatório", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  b.navigate("dashboard");
  t.click("[data-dash-connect]");
  const submit = value => {
    t.w.document.querySelector("#dash-powerbi-url").value = value;
    t.w.document.querySelector("#dash-powerbi-form").dispatchEvent(new t.w.Event("submit", { bubbles: true, cancelable: true }));
  };
  const report = "https://app.powerbi.com/reportEmbed?reportId=aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb";
  for (const url of ["javascript:alert(1)", report.replace("app.powerbi.com", "app.powerbi.com.evil.test"), report + "&access_token=secret", "https://app.powerbi.com/reportEmbed?reportId=bad"]) {
    submit(url);
    assert.match(t.w.document.querySelector("#dash-powerbi-error").textContent, /link seguro/);
    assert.equal(t.w.MichelleDashboard.getConfig().reportUrl, "");
  }
  submit(report + "&pageName=ReportSection2");
  const frame = t.w.document.querySelector(".dash-native-report iframe");
  assert.ok(frame);
  assert.equal(new URL(frame.src).searchParams.get("autoAuth"), "true");
  assert.equal(new URL(frame.src).searchParams.get("pageName"), "ReportSection2");
  await t.w.MichelleDashboard.expand();
  assert.equal(t.w.document.querySelector(".dash-native-report iframe"), frame);
  assert.ok(t.w.document.body.classList.contains("dashboard-expanded"));
  t.w.MichelleDashboard.collapse();
  assert.equal(t.w.document.querySelector(".dash-native-report iframe"), frame);
  const reopened = await boot(t.db, t.w.localStorage.getItem("michelle.dashboard.v2.gerente"));
  reopened.w.MichelleBridge.navigate("dashboard");
  assert.ok(reopened.w.document.querySelector(".dash-native-report iframe"));
  t.click('[data-dash-engine="local"]');
  assert.ok(t.w.document.querySelector(".dash-grid"));
  t.click("[data-dash-connect]");
  t.click("[data-dash-disconnect]");
  assert.equal(t.w.MichelleDashboard.getConfig().reportUrl, "");
  assert.equal(t.errors.length, 0);
  t.w.close(); reopened.w.close();
});
function dashboardLots(t) {
  const row = (id, sector, type, date, status, extra = {}) => ({ id, sector, type, date, status, value: 1, title: "Atendimento " + id, client: "Conta " + id, ...extra });
  const lots = [
    { id: "dash-orders", name: "ordens.xlsx", type: "ordens", sector: "tec", created: "2026-10-01T12:00:00Z", rows: [row("A", "tec", "ordens", "2026-09-01", "Pendente"), row("B", "tec", "ordens", "2026-09-28", "Concluído")] },
    { id: "dash-calls", name: "ligacoes.xlsx", type: "ligacoes", sector: "port", created: "2026-10-02T12:00:00Z", rows: [row("C", "port", "ligacoes", "2026-09-28", "Concluído", { duration: 2 }), row("D", "port", "ligacoes", "2026-09-28", "Não atendido", { duration: 4 })] },
    { id: "dash-cuc", name: "cuc.xlsx", type: "cuc", sector: "coi", created: "2026-10-03T12:00:00Z", rows: [row("E", "coi", "cuc", null, "Não informado", { value: 100, periodStart: "2026-09-01", periodEnd: "2026-09-30" })] },
  ];
  t.w.MichelleBridge.getImports().push(...lots);
  return lots;
}
test("dashboard: filtros de fonte, status e competência preservam as unidades e o período real", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  dashboardLots(t); b.navigate("dashboard");
  let m = t.w.MichelleDashboard.model();
  assert.equal(m.rows.length, 5);
  assert.equal(m.metrics.find(x => x.id === "cuc").value, 100);
  assert.ok(!m.metrics.some(x => ["done", "pending", "rate", "duration"].includes(x.id)));
  t.input("#dash-type", "ordens");
  m = t.w.MichelleDashboard.model();
  assert.equal(m.rows.length, 2);
  assert.equal(m.metrics.find(x => x.id === "rate").value, 50);
  t.input("#dash-period", "7");
  m = t.w.MichelleDashboard.model();
  assert.equal(m.end, "2026-09-28");
  assert.equal(m.rows.length, 1);
  t.input("#dash-status", "Pendente");
  assert.equal(t.w.MichelleDashboard.model().rows.length, 0);
  t.click("[data-dash-clear]");
  t.input("#dash-type", "cuc");
  t.input("#dash-start", "2026-09-02");
  assert.equal(t.w.MichelleDashboard.model().rows.length, 0);
  t.input("#dash-start", "2026-09-01");
  t.input("#dash-end", "2026-09-30");
  assert.equal(t.w.MichelleDashboard.model().metrics.find(x => x.id === "cuc").value, 100);
  t.click("[data-dash-clear]");
  t.click('[data-dash-sector="tec"]');
  assert.equal(t.w.MichelleDashboard.model().rows.length, 2);
  assert.equal(t.errors.length, 0); t.w.close();
});
test("dashboard: composição, indicadores, filtros e ampliação sobrevivem à reabertura", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  dashboardLots(t); b.navigate("dashboard");
  t.click("[data-dash-edit]");
  t.click('[data-dash-visible="status"]');
  t.input('[data-dash-size="trend"]', "12");
  t.click('[data-dash-move="ranking:-1"]');
  t.click('[data-dash-metric="records"]');
  t.input("#dash-zoom", "150");
  t.input("#dash-type", "ordens");
  const preference = t.w.localStorage.getItem("michelle.dashboard.v2.gerente");
  const reopened = await boot(t.db, preference);
  reopened.w.MichelleBridge.navigate("dashboard");
  const c = reopened.w.MichelleDashboard.getConfig();
  assert.ok(c.hidden.includes("status"));
  assert.equal(c.sizes.trend, 12);
  assert.ok(c.order.indexOf("ranking") < c.order.indexOf("sectors"));
  assert.ok(!c.metrics.includes("records"));
  assert.equal(c.zoom, 150); assert.equal(c.type, "ordens");
  assert.equal(reopened.w.document.querySelector('[data-dash-widget="status"]'), null);
  assert.equal(t.errors.length + reopened.errors.length, 0);
  t.w.close(); reopened.w.close();
});
test("dashboard: tela cheia conserva filtros, amplia blocos e oferece alternativa quando a API falha", async () => {
  const t = await boot(), b = t.w.MichelleBridge, d = t.w.document;
  dashboardLots(t); b.navigate("dashboard");
  let fullscreen = null;
  Object.defineProperty(d, "fullscreenElement", { get: () => fullscreen });
  d.documentElement.requestFullscreen = async () => { fullscreen = d.documentElement; };
  d.exitFullscreen = async () => { fullscreen = null; };
  await t.w.MichelleDashboard.expand();
  assert.equal(fullscreen, d.documentElement);
  t.input("#dash-type", "ordens");
  assert.equal(fullscreen, d.documentElement);
  assert.ok(d.body.classList.contains("dashboard-expanded"));
  assert.equal(t.w.MichelleDashboard.model().rows.length, 2);
  t.click('[data-dash-focus="trend"]');
  assert.ok(d.querySelector("#dashboard-focus").open);
  t.w.dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "Escape" }));
  assert.equal(d.querySelector("#dashboard-focus"), null);
  t.w.MichelleDashboard.collapse();
  assert.ok(!d.body.classList.contains("dashboard-expanded"));
  d.documentElement.requestFullscreen = async () => { throw Error("Sem permissão"); };
  await t.w.MichelleDashboard.expand();
  assert.ok(d.body.classList.contains("dashboard-expanded"));
  assert.equal(t.w.MichelleDashboard.getState().native, false);
  b.navigate("overview");
  assert.ok(!d.body.classList.contains("dashboard-expanded"));
  assert.equal(t.errors.length, 0); t.w.close();
});
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
async function boot(db = new IDBFactory(), dashboardPreference) {
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
  w.localStorage.setItem("michelle.ai.automatic-review.v2","1");
  w.localStorage.setItem("michelle.ai.behavior.v1",JSON.stringify({automaticInsights:false}));
  if (dashboardPreference) w.localStorage.setItem("michelle.dashboard.v2.gerente", dashboardPreference);
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
    "analysis/mc-analysis.js",
    "analysis/preferences.js",
    "data-core.js",
    "data-intelligence.js",
    "pptx.js",
    "install.js",
    "profiles.js",
    "motion.js",
    "analysis/workbook-sheets.js",
    "analysis/source-visuals.js",
    "analysis/source-agent.js",
    "michelle-ai-dock.js",
    "michelle-ai-client.js",
    "analysis/automatic-review.js",
    "app.js",
    "studio.js",
    "dashboard.js",
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
  click('.sidebar [data-nav="data"]');
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
  assert.equal(b.getState().uploadQueue.length, 5); // 2 abas de ligações + arquivo inválido + 2 abas de ordens
  assert.equal(b.getImports().find(l=>l.type==="ligacoes").sheet,"Sheet1");
  assert.match(
    w.document.querySelector("#dropzone").textContent,
    /invalido.txt/,
  );
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
    /Formato não permitido/,
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
  assert.equal(b.getImports()[0].sheet, "Registros");
  assert.equal(b.getImports()[0].type, "ordens");
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
    /O que os dados mostram/,
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
  const batch = t.w.MCStore.batch;
  t.w.MCStore.batch = async () => {
    throw Error("Sem espaço");
  };
  await b.handleFile(file(t.w, "operacao.xlsx", workbook()));
  assert.equal(b.getAll().length, 0);
  assert.ok(b.getState().uploadQueue.some(p=>p.status==="error"));
  b.navigate("data");
  assert.match(t.w.document.querySelector("#dropzone").textContent, /Sem espaço/);
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

test("o painel remove o seletor de experiências e mantém dados e contextos compatíveis", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  assert.equal(t.w.MCProfiles.currentId(), "gerente");
  assert.match(t.w.document.querySelector(".mc-role-home").textContent, /Visão gerencial/);
  const records = [{id:"001",type:"ordens",sector:"tec",status:"Pendente",title:"Atendimento",value:1,source:"os.xlsx"}];
  b.getImports().push({id:"teste",name:"os.xlsx",filename:"os.xlsx",sector:"tec",type:"ordens",rows:records,created:"2026-10-11T12:00:00.000Z"});
  b.render();
  assert.equal(t.w.document.querySelector("#mc-profile"),null);
  t.w.MCProfiles.set("supervisora"); b.render();
  assert.equal(t.w.MCProfiles.currentId(), "supervisora");
  assert.match(t.w.document.querySelector(".mc-role-home").textContent, /Acompanhamento da supervisão/);
  assert.equal(b.getAll().length, 1);
  t.w.MCProfiles.set("operacao"); b.render();
  assert.match(t.w.document.querySelector(".mc-role-home").textContent, /Central operacional/);
  assert.equal(t.w.MCProfiles.set("direcao"),false);
  assert.equal(t.w.document.querySelector(".mc-role-bar"),null);
  assert.equal(b.getAll().length, 1);
  assert.equal(t.errors.length, 0);
  t.w.close();
});

test("dashboard possui alças de arrastar funcionais e fallback por setas", async () => {
  const t = await boot(), b = t.w.MichelleBridge;
  b.navigate("dashboard");
  t.click("[data-dash-edit]");
  const handles = t.w.document.querySelectorAll("[data-dash-touch-drag]");
  assert.ok(handles.length >= 9);
  assert.ok(t.w.document.querySelectorAll("[data-dash-editor-row]").length >= 9);
  assert.match(t.w.document.querySelector(".dash-editor-tips").textContent, /arrastando/i);
  const initial = t.w.MichelleDashboard.getConfig().order;
  t.click('[data-dash-move="ranking:-1"]');
  const later = t.w.MichelleDashboard.getConfig().order;
  assert.notDeepEqual(later, initial);
  assert.ok(t.w.document.querySelector('[data-dash-touch-drag="ranking"]'));
  assert.equal(t.errors.length,0);
  t.w.close();
});


test("importação multiaba mantém fontes separadas e não seleciona resumos por padrão", async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge;
  w.eval(fs.readFileSync(path.join(root,"analysis/workbook-sheets.js"),"utf8"));
  b.navigate("data");
  await b.handleFile(file(w,"ordens.xlsx",workbook()));
  const queued=b.getState().uploadQueue.filter(p=>p.grid);
  assert.equal(queued.length,2);
  assert.equal(queued.find(p=>p.sheet==="Resumo").selected,false);
  assert.equal(queued.find(p=>p.sheet==="Registros").selected,true);
  assert.equal(b.getImports()[0].sheet,"Registros");
  assert.equal(w.document.querySelectorAll("[data-include-sheet]").length,0);
  await b.confirmImport();
  assert.equal(b.getImports().length,1);
  assert.equal(b.getImports()[0].sheet,"Registros");
  assert.equal(b.getAll().length,3);
  assert.equal(t.errors.length,0);
  t.w.close();
});
test("duas abas de dados do mesmo arquivo podem ser importadas em lotes independentes", async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge;
  w.eval(fs.readFileSync(path.join(root,"analysis/workbook-sheets.js"),"utf8"));
  b.navigate("data");
  const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([["Tipo","Categoria"],["A","Risco"],["B","Plano"]]),"Dados A");
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([["Tipo","Categoria"],["C","Risco"],["D","Plano"]]),"Dados B");
  await b.handleFile(file(w,"fontes.xlsx",X.write(wb,{type:"buffer",bookType:"xlsx"})));
  const queued=b.getState().uploadQueue.filter(p=>p.grid);
  assert.equal(queued.length,2);
  assert.deepEqual(Array.from(queued,x=>x.selected),[true,true]);

  await wait(()=>b.getImports().length===2&&!b.getState().importBusy);
  assert.deepEqual(Array.from(b.getImports(),l=>l.sheet),["Dados A","Dados B"]);
  assert.equal(b.getImports()[0].hash,b.getImports()[1].hash);
  assert.notEqual(b.getImports()[0].id,b.getImports()[1].id);
  assert.equal(b.getImports()[0].rows.length,2);
  assert.equal(b.getImports()[1].rows.length,2);
  assert.equal(t.errors.length,0);
  t.w.close();
});


test("dashboard real apresenta fontes em aba própria e gráficos por fonte",async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge;
  const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([
    ["Data","Status","Chamado"],["01/09/2026","Aberto","A1"],["02/09/2026","Fechado","A2"],["03/09/2026","Aberto","A3"]
  ]),"Chamados");
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([
    ["Data","Categoria","Produto"],["01/09/2026","Almoxarifado","P1"],["02/09/2026","Patrimônio","P2"],["03/09/2026","Almoxarifado","P3"]
  ]),"Inventario");
  b.navigate("data");
  await b.handleFile(file(w,"operacao.xlsx",X.write(wb,{type:"buffer",bookType:"xlsx"})));

  await wait(()=>b.getImports().length===2&&!b.getState().importBusy);
  b.navigate("dashboard");
  t.click('[data-mc-dash-tab="sources"]');
  assert.ok(w.document.querySelector(".mc-source-workspace"));
  assert.equal(w.document.querySelectorAll(".mc-source-tab").length,2);
  const tabs=Array.from(w.document.querySelectorAll(".mc-source-tab"));
  assert.match(tabs[0].textContent,/Chamados/);
  assert.match(tabs[1].textContent,/Inventario/);
  assert.ok(w.document.querySelector(".mc-source-visual svg"));
  t.click(".mc-source-tab:last-child");
  assert.match(w.document.querySelector(".mc-source-canvas-head").textContent,/Inventario/);
  assert.equal(w.document.querySelector(".mc-source-facts strong").textContent,"3");
  t.click('[data-mc-source-view="table"]');
  assert.ok(w.document.querySelector(".mc-source-visual table"));
  t.click('[data-mc-dash-tab="overview"]');
  assert.ok(w.document.querySelector(".dash-grid"));
  assert.equal(t.errors.length,0);
  t.w.close();
});
test("fontes gerais distintas com mesmo período não bloqueiam importação",async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge;
  const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([
    ["Data","Status","Chamado"],["01/09/2026","Aberto","A"],["02/09/2026","Fechado","B"]
  ]),"Ocorrencias");
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([
    ["Data","Produto","Setor"],["01/09/2026","Mouse","TI"],["02/09/2026","Monitor","RH"]
  ]),"Inventario");
  await b.handleFile(file(w,"independentes.xlsx",X.write(wb,{type:"buffer",bookType:"xlsx"})));

  await wait(()=>b.getImports().length===2&&!b.getState().importBusy);
  assert.equal(b.getImports().length,2);
  assert.deepEqual(Array.from(b.getImports(),p=>p.sheet),["Ocorrencias","Inventario"]);
  assert.equal(t.errors.length,0);
  t.w.close();
});

test("Copiloto abre como barra fixável, sem bolinha, e recolhe sem espaço reservado",async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge;
  assert.equal(w.document.querySelector(".assistant-fab"),null);
  assert.equal(w.document.querySelector("#mc-ai-return"),null);
  t.click(".sidebar [data-assistant-open]");
  assert.equal(b.getState().assistantOpen,true);
  assert.ok(w.document.body.classList.contains("mc-chat-pinned"));
  assert.ok(w.document.querySelector(".assistant-layer.open .assistant-form button[type=submit]"));
  const width=w.MCDock.dimensions().width;
  w.document.querySelector('[data-mc-ai-resize]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  assert.equal(w.MCDock.dimensions().width,width+16);
  t.click('[data-mc-ai-pin]');assert.equal(w.document.body.classList.contains('mc-chat-pinned'),false);
  t.click('.mc-chat-back');await wait(()=>!w.document.body.classList.contains('mc-chat-open'));
  assert.equal(b.getState().assistantOpen,false);assert.equal(w.document.querySelector('.mc-chat-edge').hidden,false);
  t.click('.mc-chat-edge');assert.equal(b.getState().assistantOpen,true);
  t.click('.sidebar [data-close-nav]');await wait(()=>w.document.body.classList.contains('mc-nav-collapsed'));
  assert.equal(b.getState().navCollapsed,true);assert.equal(w.document.getElementById('mc-nav-edge').hidden,false);
  t.click('#mc-nav-edge');assert.equal(b.getState().navCollapsed,false);
  Object.defineProperty(w,'innerWidth',{value:390,writable:true});w.dispatchEvent(new w.Event('resize'));
  t.click('.mc-chat-back');await wait(()=>!w.document.body.classList.contains('mc-chat-open'));
  t.click('.sidebar [data-assistant-open]');assert.equal(b.getState().assistantOpen,true);
  assert.equal(w.MCDock.dimensions().width,390);assert.equal(w.document.querySelector('.assistant-window').getAttribute('aria-modal'),'true');
  assert.equal(w.document.body.classList.contains('mc-chat-pinned'),false);
  assert.equal(w.MCDock.gestureDecision('right',90,2,true),'close');
  assert.equal(w.MCDock.gestureDecision('left',90,2,false),'open');
  assert.equal(w.MCDock.gestureDecision('left',3,90,true),null);
  assert.equal(t.errors.length,0);w.close();
});

test("barra superior executa envio, importações, tema e IA; biblioteca exclui só dados daquele original",async()=>{
 const t=await boot(),b=t.w.MichelleBridge;
 t.w.MCAccess={owner:true};t.w.MCCloudFiles={list:()=>[{id:'a'.repeat(64)}]};
 b.getImports().push({id:'aba1',fileId:'a'.repeat(64),rows:[{id:'1',sector:'tec',type:'ordens',value:1}]},{id:'aba2',fileId:'a'.repeat(64),rows:[{id:'2',sector:'tec',type:'ordens',value:1}]},{id:'outro',fileId:'b'.repeat(64),rows:[{id:'3',sector:'tec',type:'ordens',value:1}]});
 b.render();
 for(const selector of ['[data-cloud-upload]','[data-toggle-theme]','.mc-header-imports'])assert.ok(t.w.document.querySelector('.topbar '+selector),selector);
 for(const selector of ['[data-cloud-library]','[data-cloud-export]','[data-mc-install]'])assert.ok(t.w.document.querySelector('.sidebar '+selector),selector);
 assert.equal(t.w.document.querySelectorAll('#mc-cloud-upload').length,1);
 let picked=0;t.w.document.getElementById('mc-cloud-upload').click=()=>picked++;
 t.click('.topbar [data-cloud-upload]');assert.equal(picked,1);
 t.click('.topbar [data-toggle-theme]');assert.equal(t.w.document.documentElement.dataset.theme,'light');
 await wait(()=>t.w.localStorage.getItem('horizon.appearance')==='light');
 t.click('.topbar [data-toggle-theme]');assert.equal(t.w.document.documentElement.dataset.theme,'dark');
 await wait(()=>t.w.localStorage.getItem('horizon.appearance')==='dark');
 t.click('.sidebar [data-assistant-open]');assert.equal(b.getState().assistantOpen,true);
 t.click('.topbar .mc-header-imports');assert.equal(b.getState().page,'data');
 t.click('.topbar .mob-toggle');assert.equal(b.getState().navCollapsed,true);
 await wait(()=>t.w.document.body.classList.contains('mc-nav-collapsed'));t.click('.topbar .mob-toggle');assert.equal(b.getState().navCollapsed,false);
 b.navigate('geral');
 assert.ok(t.w.document.querySelector('.mc-home-library [data-cloud-library]'));
 assert.equal(t.w.document.querySelector('.mc-cloud-toolbar'),null);
 b.applyDeletedFiles(['a'.repeat(64)]);assert.equal(b.getAll().length,1);assert.equal(b.getAll()[0].id,'3');
 t.w.MCAccess={owner:false,rights:{filesView:true,ai:false,filesUpload:false},sectors:[]};b.render();
 assert.equal(t.w.document.querySelector('.topbar [data-cloud-upload]'),null);
 assert.equal(t.w.document.querySelector('.sidebar [data-assistant-open]'),null);
 assert.ok(t.w.document.querySelector('.topbar [data-toggle-theme]'));
 t.w.MCAccess.rights.filesUpload=true;t.w.MCAccess.rights.ai=true;b.render();
 assert.ok(t.w.document.querySelector('.topbar [data-cloud-upload]'));
 assert.ok(t.w.document.querySelector('.sidebar [data-assistant-open]'));
 assert.equal(t.errors.length,0);t.w.close();
});

test("gestos das duas barras respeitam direção e cancelamento; atualizações preservam o rascunho",async()=>{
 const t=await boot(),w=t.w,b=w.MichelleBridge;
 Object.defineProperty(w,'innerWidth',{value:390,writable:true});w.MCDock.sync();
 const event=(name,x,y=200)=>new w.MouseEvent(name,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
 const swipe=async(selector,x,z,cancel=false)=>{
  w.document.querySelector(selector).dispatchEvent(event('pointerdown',x));
  w.dispatchEvent(event('pointermove',z));w.dispatchEvent(event(cancel?'pointercancel':'pointerup',z));
 };
 await swipe('#mc-nav-edge',5,110);assert.equal(b.getState().sidebar,true);
 await swipe('.sidebar .brand',130,20,true);assert.equal(b.getState().sidebar,true);
 await swipe('.sidebar .brand',130,20);await wait(()=>!w.document.body.classList.contains('mc-nav-open'));
 assert.equal(b.getState().sidebar,false);
 await swipe('.mc-chat-edge',385,270);assert.equal(b.getState().assistantOpen,true);
 const input=w.document.querySelector('.assistant-window textarea');input.value='Comparar os arquivos sem perder este texto';input.focus();input.setSelectionRange(7,7);
 b.render();const updated=w.document.querySelector('.assistant-window textarea');
 assert.equal(updated.value,'Comparar os arquivos sem perder este texto');assert.equal(updated.selectionStart,7);assert.equal(w.document.activeElement,updated);
 await swipe('.assistant-window-header',90,220,true);assert.equal(b.getState().assistantOpen,true);
 await swipe('.assistant-window-header',90,220);await wait(()=>!w.document.body.classList.contains('mc-chat-open'));
 assert.equal(b.getState().assistantOpen,false);
 assert.equal(t.errors.length,0);w.close();
});


test("chat do setor envia o recorte visível e mantém histórico separado",async()=>{
 const t=await boot(),w=t.w,b=w.MichelleBridge;
 try{
  b.getImports().push({id:'port-ai',name:'Chamadas.xlsx',sector:'port',type:'ligacoes',rows:[
   {id:'p1',sector:'port',type:'ligacoes',status:'Concluído',title:'Recebida'}]},
   {id:'coi-ai',name:'Eventos.xlsx',sector:'coi',type:'cuc',rows:[
   {id:'c1',sector:'coi',type:'cuc',status:'Não informado',title:'Evento',value:999}]});
  b.getState().period='all';
  let captured;
  w.fetch=async()=>({ok:true});
  w.MCAI={context:(selected,imports,sectors,options)=>{
   captured={selected,all:options.allRows};return {};
  },request:async()=>({answer:'Resposta sintética'}),rememberQuestion:()=>{}};
  b.navigate('port');
  t.click('.sidebar [data-assistant-open]');
  const form=w.document.querySelector('.assistant-window form');
  form.querySelector('textarea').value='Analise esta tela';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await wait(()=>!!captured&&!b.getState().assistantBusy);
  assert.equal(captured.selected.length,1);
  assert.equal(captured.selected[0].sector,'port');
  assert.equal(captured.all.length,2);
 }finally{w.close();}
});


test('importação consulta Groq por aba após falha de lote e mantém título, unidade e dados originais',async()=>{
  const t=await boot(),w=t.w,b=w.MichelleBridge,calls=[];
  w.MCAI.request=async(mode,{context})=>{
    calls.push(mode);
    if(mode==='interpret-batch')throw Error('Falha temporária na interpretação conjunta');
    if(mode==='interpret')return {interpretation:{type:'ligacoes',sector:'port',headerRow:0,
      mapping:{date:0,client:1},confidence:'Alta',reason:'Nome do arquivo e dados da aba'}};
    throw Error('Consulta inesperada: '+mode);
  };
  const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([
    ['Data','Cliente','Observação'],
    ['11/10/2026','Conta A','Atendida'],
    ['12/10/2026','Conta B','Não atendida'],
  ]),'Dados');
  await b.handleFile(file(w,'Relatório de ligações.xlsx',X.write(wb,{type:'buffer',bookType:'xlsx'})));
  assert.deepEqual(calls.slice(0,2),['interpret-batch','interpret']);
  assert.equal(b.getImports().length,1);
  const lot=b.getImports()[0];
  assert.equal(lot.type,'ligacoes');
  assert.equal(lot.sector,'port');
  assert.equal(lot.rows.length,2);
  assert.equal(lot.rows[0].value,1);
  assert.equal(lot.rows[0].raw.Cliente,'Conta A');
  assert.equal(lot.name,'Relatório de ligações.xlsx');
  assert.equal(t.errors.length,0);
  w.close();
});
