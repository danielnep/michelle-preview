/* Filtros ativos no dashboard mobile. */
(function (root) {
  "use strict";
  function resetFilter(key) {
    const filters = { sector: { sector: "geral" }, type: { type: "all" }, status: { status: "all" }, period: { period: "all" } };
    return filters[key] || null;
  }
  function activeFilters(config) {
    return Object.entries({ sector: "geral", type: "all", status: "all", period: "all" })
      .filter(([key, value]) => config[key] !== value)
      .map(([key]) => key);
  }
  root.MCDashboardMobileUX = { resetFilter, activeFilters };
})(typeof window !== "undefined" ? window : globalThis);
