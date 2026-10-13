/* Três contextos de leitura em um único Painel Michelle.
   Esta camada organiza a interface, NÃO implementa controle de acesso seguro.
   Autorização por usuário necessita backend autenticado.
*/
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MCProfiles = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const STORAGE_KEY = "michelle.experience.v1";
  const profiles = Object.freeze({
    operacao: Object.freeze({
      id: "operacao",
      title: "Ronda / Vigia",
      description: "Importação, conferência dos arquivos e acompanhamento dos registros.",
      heading: "Central operacional",
      subheading: "Confira os dados recebidos e atualize a base para os outros setores.",
      icon: "data",
      quick: Object.freeze([
        ["data", "Importar e conferir planilhas", "up"],
        ["sectors", "Consultar setores", "coi"],
        ["report", "Extrair relatório", "report"],
      ]),
      widgets: Object.freeze(["reading", "records", "metrics", "status", "insights", "sectors", "trend", "crossings", "ranking"]),
      focus: Object.freeze(["imported", "quality", "records"]),
    }),
    supervisora: Object.freeze({
      id: "supervisora",
      title: "Supervisão",
      description: "Acompanhamento dos setores, situação das demandas e exceções.",
      heading: "Acompanhamento da supervisão",
      subheading: "Veja situações em aberto, setores e registros que precisam ser conferidos.",
      icon: "check",
      quick: Object.freeze([
        ["sectors", "Acompanhar setores", "coi"],
        ["insight", "Pontos de atenção", "insight"],
        ["dashboard", "Ver indicadores", "chart"],
      ]),
      widgets: Object.freeze(["insights", "status", "sectors", "metrics", "records", "reading", "trend", "crossings", "ranking"]),
      focus: Object.freeze(["open", "quality", "sectors"]),
    }),
    gerente: Object.freeze({
      id: "gerente",
      title: "Gestão",
      description: "Indicadores, comparativos, prioridades e relatórios gerenciais.",
      heading: "Visão gerencial",
      subheading: "Analise resultados, identifique prioridades e aprofunde os indicadores.",
      icon: "chart",
      quick: Object.freeze([
        ["dashboard", "Dashboard completo", "chart"],
        ["insight", "Análise gerencial", "insight"],
        ["report", "Gerar relatório", "report"],
      ]),
      widgets: Object.freeze(["metrics", "insights", "crossings", "trend", "status", "sectors", "ranking", "reading", "records"]),
      focus: Object.freeze(["quality", "open", "insights"]),
    }),

  });
  const ids = Object.freeze(Object.keys(profiles));
  function valid(id) { return Object.hasOwn(profiles, id); }
  function currentId() {
    try {
      const value = root.localStorage?.getItem(STORAGE_KEY);
      return valid(value) ? value : "gerente";
    } catch (_) { return "gerente"; }
  }
  function current() { return profiles[currentId()]; }
  function set(id) {
    if (!valid(id)) return false;
    if (id === active().id) return true;
    try {
      if (root.localStorage) {
        root.localStorage.setItem(STORAGE_KEY, id);
        session = null;
      } else session = id;
    } catch (_) { /* A experiência continua ativa só nesta sessão. */ session = id; }
    if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function")
      root.dispatchEvent(new root.CustomEvent("mc:profile-changed", { detail: { id } }));
    return true;
  }
  let session = null;
  function active() { return profiles[session && valid(session) ? session : currentId()]; }
  function activeId() { return active().id; }
  function orderWidgets(currentOrder) {
    const source = Array.isArray(currentOrder) ? currentOrder : [];
    const recommended = active().widgets;
    return [...new Set([...recommended, ...source])].filter(id => source.includes(id));
  }
  function summary(rows = [], lots = []) {
    const activeLots = lots.filter(l => !l.archived && !l.deleted && !l.supersededBy);
    const types = {};
    for (const r of rows) {
      const id = r.type || "geral";
      if (!types[id]) types[id] = { rows: 0, total: 0 };
      types[id].rows++;
      types[id].total += ["deslocamentos", "cuc"].includes(id) ? (Number(r.value) || 0) : 1;
    }
    const missingDates = rows.filter(r => !r.date && !r.periodStart && !r.periodEnd).length;
    const orders = rows.filter(r => r.type === "ordens");
    const openOrders = orders.filter(r => ["Pendente", "Em andamento"].includes(r.status)).length;
    const qualityWarnings = activeLots.reduce((n, l) => n + (l.quality?.issues?.length || 0), 0);
    const latest = activeLots.map(l => l.created).filter(Boolean).sort().at(-1) || "";
    return { importedFiles: activeLots.length, records: rows.length, types, missingDates, openOrders, qualityWarnings, latest };
  }
  function focusItems(rows = [], lots = []) {
    const s = summary(rows, lots);
    const item = (label, value, description, page, status = "") => ({ label, value, description, page, status });
    const common = {
      imported: item("Arquivos ativos", s.importedFiles, "Planilhas importadas e disponíveis no painel", "data"),
      quality: item("Alertas de qualidade", s.qualityWarnings, "Avisos registrados na conferência dos arquivos", "data", s.qualityWarnings ? "warning" : ""),
      records: item("Linhas no recorte", s.records, "Contagem de linhas das fontes, sem somar unidades distintas", "dashboard"),
      open: item("OS em aberto", s.openOrders, "Status pendente ou em andamento, não representa atraso", "sectors", s.openOrders ? "attention" : ""),
      sectors: item("Setores", 8, "Acesse cada departamento e consulte seus indicadores", "sectors"),
      insights: item("Fontes identificadas", Object.keys(s.types).length, "Tipos de fonte presentes no recorte", "insight"),
      presentation: item("Apresentações", "Estúdio", "Prepare slides usando dados efetivamente importados", "present"),
    };
    return active().focus.map(k => common[k]);
  }
  return Object.freeze({ profiles, ids, valid, currentId:activeId, current:active, set, orderWidgets, summary, focusItems });
});