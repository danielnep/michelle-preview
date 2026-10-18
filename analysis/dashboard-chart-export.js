/* Exportação contextual dos valores exibidos em cada gráfico. */
(function (root) {
  "use strict";
  const ids = ["trend", "status", "sectors", "ranking"];
  function number(text) {
    const value = Number(String(text).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }
  function rows(id, node) {
    if (!ids.includes(id) || !node) return [];
    if (id === "trend") return Array.from(node.querySelectorAll(".dash-values tbody tr")).map(tr => {
      const cells = tr.querySelectorAll("td");
      return cells.length === 2 ? [cells[0].textContent.trim(), number(cells[1].textContent)] : null;
    }).filter(row => row && row[1] !== null);
    return Array.from(node.querySelectorAll(".dash-bars .dash-bar")).map(bar => {
      const label = bar.querySelector(".dash-bar-name");
      const value = bar.querySelector("strong");
      return label && value ? [label.textContent.trim(), number(value.textContent)] : null;
    }).filter(row => row && row[1] !== null);
  }
  function button(id, parent, label) {
    const el = document.createElement("button");
    el.type = "button"; el.className = "dash-chart-download";
    el.dataset.mcChartExport = id;
    el.textContent = "↓";
    el.title = "Exportar dados deste gráfico";
    el.setAttribute("aria-label", "Exportar dados do gráfico " + label);
    parent.append(el);
  }
  function render() {
    const rootEl = document.getElementById("interactive-dashboard");
    if (!rootEl) return;
    for (const id of ids) {
      const node = rootEl.querySelector('[data-dash-widget="' + id + '"]');
      const actions = node?.querySelector(".dash-widget-head > div");
      if (actions && !actions.querySelector("[data-mc-chart-export]") && rows(id, node).length) {
        button(id, actions, node.querySelector("h2")?.textContent.trim() || id);
      }
    }
    const focus = rootEl.querySelector("#dashboard-focus");
    const id = root.MichelleDashboard?.getState?.().focus;
    if (focus && ids.includes(id) && rows(id, focus).length && !focus.querySelector("[data-mc-chart-export]")) {
      button(id, focus.querySelector("header"), "ampliado");
    }
  }
  document.addEventListener("click", event => {
    const el = event.target.closest?.("[data-mc-chart-export]");
    if (!el) return;
    const id = el.dataset.mcChartExport;
    const node = el.closest("[data-dash-widget], #dashboard-focus");
    const data = rows(id, node);
    if (!data.length || !root.XLSX?.utils) return;
    const title = node.querySelector("h2")?.textContent.trim() || id;
    const safe = value => typeof value === "string" && /^[=+\-@]/.test(value) ? "'" + value : value;
    const config = root.MichelleDashboard?.getConfig?.() || {};
    const filters = root.MCDashboardMobileUX?.activeFilters(config).map(key => key + ": " + config[key]).join(" | ") || "Nenhum";
    const values = [["Gráfico", safe(title)], ["Filtros", safe(filters)], [],
      [id === "trend" ? "Data / intervalo" : "Categoria", "Valor"], ...data.map(row => row.map(safe))];
    const book = root.XLSX.utils.book_new();
    root.XLSX.utils.book_append_sheet(book, root.XLSX.utils.aoa_to_sheet(values), "Gráfico");
    root.XLSX.writeFile(book, "michelle-grafico-" + id + ".xlsx");
  });
  root.MCDashboardChartExport = { render, rows };
})(window);
