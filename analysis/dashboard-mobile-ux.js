/* Painel Michelle: resumo dos filtros ativos. */
(function (root) {
  "use strict";
  const base = { sector: "geral", type: "all", status: "all", period: "all" };
  function resetFilter(key) { return Object.hasOwn(base, key) ? { [key]: base[key] } : null; }
  function activeFilters(config) { return Object.keys(base).filter(key => config[key] !== base[key]); }
  function render() {
    const panel = document.querySelector(".dash-filter-panel");
    if (!panel || document.querySelector(".dash-mobile-strip")) return;
    const bar = document.createElement("section");
    bar.className = "dash-mobile-strip";
    bar.setAttribute("aria-label", "Filtros ativos");
    bar.textContent = activeFilters(root.MichelleDashboard.getConfig()).join(", ") || "Sem filtros ativos";
    panel.before(bar);
  }
  root.MCDashboardMobileUX = { resetFilter, activeFilters, render };
})(typeof window !== "undefined" ? window : globalThis);
