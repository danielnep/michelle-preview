/* Painel Michelle: filtros ativos, removíveis e acessíveis. */
(function (root) {
  "use strict";
  const base = { sector: "geral", type: "all", status: "all", period: "all", start: "", end: "", query: "" };
  const names = { sector: "Setor", type: "Fonte", status: "Status", period: "Período", start: "De", end: "Até", query: "Busca" };
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
    open.setAttribute("aria-expanded", String(panel.open));
    open.onclick = () => { panel.open = true; panel.querySelector("summary")?.focus(); };
    panel.addEventListener("toggle", () => open.setAttribute("aria-expanded", String(panel.open)));
    bar.append(open);
    const chips = document.createElement("div");
    chips.className = "dash-mobile-chips";
    const config = root.MichelleDashboard.getConfig();
    const active = activeFilters(config);
    for (const key of active) {
      const button = document.createElement("button");
      button.type = "button";
      const control = document.getElementById("dash-" + key);
      const label = control?.selectedOptions?.[0]?.textContent?.trim() || config[key];
      button.textContent = names[key] + ": " + label + " ×";
      button.setAttribute("aria-label", "Remover filtro " + names[key] + ": " + label);
      button.onclick = () => {
        const input = document.getElementById("dash-" + key);
        if (!input) return;
        input.value = base[key];
        if (key === "query") document.getElementById("dash-search")?.requestSubmit();
        else input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      chips.append(button);
    }
    if (!active.length) chips.textContent = "Sem filtros ativos";
    bar.append(chips);
    if (active.length) {
      const clear = document.createElement("button");
      clear.type = "button"; clear.textContent = "Limpar tudo";
      clear.className = "dash-mobile-clear";
      clear.setAttribute("data-dash-clear", "");
      bar.append(clear);
    }
    panel.before(bar);
  }
  root.MCDashboardMobileUX = { resetFilter, activeFilters, render };
})(typeof window !== "undefined" ? window : globalThis);
