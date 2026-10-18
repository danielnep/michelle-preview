/* Painel Michelle: filtros ativos, removíveis e acessíveis. */
(function (root) {
  "use strict";
  const base = { sector: "geral", type: "all", status: "all", period: "all", start: "", end: "", query: "" };
  function resetFilter(key) { return Object.hasOwn(base, key) ? { [key]: base[key] } : null; }
  function activeFilters(config) { return Object.keys(base).filter(key => config[key] && config[key] !== base[key]); }
  function render() {
    const panel = document.querySelector("#interactive-dashboard .dash-filter-panel");
    if (!panel || document.querySelector(".dash-mobile-strip")) return;
    const bar = document.createElement("section");
    bar.className = "dash-mobile-strip";
    bar.setAttribute("aria-label", "Filtros ativos");
    const open = document.createElement("button");
    open.type = "button"; open.textContent = "Filtros";
    open.onclick = () => { panel.open = true; panel.querySelector("summary")?.focus(); };
    bar.append(open);
    const chips = document.createElement("div");
    chips.className = "dash-mobile-chips";
    const config = root.MichelleDashboard.getConfig();
    for (const key of activeFilters(config)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = key + ": " + config[key] + " ×";
      button.setAttribute("aria-label", "Remover filtro " + key);
      button.onclick = () => {
        const input = document.getElementById("dash-" + key);
        if (!input) return;
        input.value = base[key];
        if (key === "query") document.getElementById("dash-search")?.requestSubmit();
        else input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      chips.append(button);
    }
    if (!chips.children.length) chips.textContent = "Sem filtros ativos";
    bar.append(chips);
    panel.before(bar);
  }
  root.MCDashboardMobileUX = { resetFilter, activeFilters, render };
})(typeof window !== "undefined" ? window : globalThis);
