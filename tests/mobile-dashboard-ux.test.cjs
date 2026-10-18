const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

function setup(filters = { sector: "comercial", type: "all", status: "all", period: "all", start: "", end: "", query: "" }) {
  const dom = new JSDOM(`<!doctype html><body><section id="interactive-dashboard">
    <details class="dash-filter-panel"><summary tabindex="0">Filtros e período</summary>
      <select id="dash-sector"><option value="geral">Todos</option><option value="comercial" selected>Comercial</option></select>
      <select id="dash-type"><option value="all">Todas</option></select>
      <select id="dash-status"><option value="all">Todos</option></select>
      <select id="dash-period"><option value="all">Tudo</option></select>
      <input id="dash-start"><input id="dash-end">
      <form id="dash-search"><input id="dash-query"></form>
    </details>
    <article data-dash-widget="status"><header class="dash-widget-head"><h2>Status dos registros</h2><div></div></header>
      <div class="dash-bars"><button class="dash-bar"><span class="dash-bar-name">Concluído</span><strong>1.234</strong></button></div>
    </article>
    <article data-dash-widget="trend"><header class="dash-widget-head"><h2>Registros por dia</h2><div></div></header>
      <details class="dash-values"><table><tbody><tr><td>01/10/2026</td><td>2,5</td></tr></tbody></table></details>
    </article></section></body>`, { runScripts: "outside-only" });
  const { window } = dom;
  let saved;
  window.MichelleDashboard = { getConfig: () => filters, getState: () => ({ focus: null }) };
  window.XLSX = { utils: {
    book_new: () => ({ sheets: {} }),
    aoa_to_sheet: data => data,
    book_append_sheet: (book, sheet, name) => { book.sheets[name] = sheet; }
  }, writeFile: (book, name) => { saved = { book, name }; } };
  for (const file of ["analysis/dashboard-mobile-ux.js", "analysis/dashboard-chart-export.js", "analysis/dashboard-mobile-watch.js"]) {
    window.eval(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
  }
  return { dom, window, saved: () => saved };
}
test("filtros ativos podem ser removidos sem alterar o restante", () => {
  const { dom, window } = setup();
  const chip = window.document.querySelector(".dash-mobile-chips button");
  assert.match(chip.textContent, /Comercial/);
  let changed = 0;
  window.document.querySelector("#dash-sector").addEventListener("change", () => changed++);
  chip.click();
  assert.equal(window.document.querySelector("#dash-sector").value, "geral");
  assert.equal(changed, 1);
  assert.ok(window.document.querySelector(".dash-mobile-clear"));
  dom.window.close();
});
test("exporta os valores exibidos do gráfico, não o conjunto bruto", () => {
  const { dom, window, saved } = setup();
  const button = window.document.querySelector('[data-dash-widget="status"] [data-mc-chart-export]');
  assert.ok(button);
  assert.equal(window.MCDashboardChartExport.rows("trend", window.document.querySelector('[data-dash-widget="trend"]'))[0][1], 2.5);
  button.click();
  assert.equal(saved().name, "michelle-grafico-status.xlsx");
  assert.deepEqual(Array.from(saved().book.sheets["Gráfico"].at(-1)), ["Concluído", 1234]);
  dom.window.close();
});
test("não adiciona barra local sem painel de filtros", () => {
  const { dom, window } = setup();
  window.document.querySelector(".dash-mobile-strip").remove();
  window.document.querySelector(".dash-filter-panel").remove();
  window.MCDashboardMobileUX.render();
  assert.equal(window.document.querySelector(".dash-mobile-strip"), null);
  dom.window.close();
});
