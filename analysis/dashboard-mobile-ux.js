/* Painel Michelle: filtros compactos e acessíveis. */
(function (root) {
  "use strict";
  function resetFilter(key) {
    const filters = { sector: { sector: "geral" }, type: { type: "all" }, status: { status: "all" } };
    return filters[key] || null;
  }
  root.MCDashboardMobileUX = { resetFilter };
})(typeof window !== "undefined" ? window : globalThis);
