(() => {
  "use strict";
  const I = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 5-5 4 3 5-8"/>',
    coi: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 11l3-3 3 3 4-4"/>',
    fac: '<path d="M4 21h16M6 21V5l6-2 6 2v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4"/>',
    rh: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 7h5M18.5 4.5v5M16 20h5"/>',
    com: '<path d="M3 3v18h18"/><path d="m6 15 5-5 4 3 5-8"/>',
    tec: '<path d="M14 7a5 5 0 0 0-6 6L3 18l3 3 5-5a5 5 0 0 0 6-6l-4 2-3-3z"/>',
    impl: '<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    qual: '<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>',
    port: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 13V8h8v5M10 17h4"/>',
    data: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3"/>',
    report: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    insight:
      '<path d="M9 18h6M10 21h4M8 14a7 7 0 1 1 8 0c-1 1-1 3-4 3s-3-2-4-3z"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5M4 18v3h16v-3"/>',
    down: '<path d="M12 4v12m-5-5 5 5 5-5M4 18v3h16v-3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    alert: '<path d="m12 3 10 18H2L12 3zM12 10v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    files:
      '<rect x="4" y="6" width="12" height="15" rx="2"/><path d="M9 3h9l3 3v13"/>',
    trash: '<path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    target:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    spark:
      '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    moon: '<path d="M20.5 13a9 9 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 1.5 1.5M5 19l1.5-1.5M17.5 6.5 1.5-1.5"/>',
  };
  const icon = (id, size = 18) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[id] || I.grid}</svg>`;
  const sectors = [
    {
      id: "coi",
      name: "COI",
      long: "Central de Operações Integradas",
      short: "Chamados monitorados",
      unit: "eventos",
      metric: "Tempo médio de resposta",
    },
    {
      id: "fac",
      name: "Facilities",
      long: "Facilities",
      short: "Solicitações de manutenção",
      unit: "solicitações",
      metric: "SLA de manutenção",
    },
    {
      id: "rh",
      name: "RH",
      long: "Recursos Humanos",
      short: "Registros de RH",
      unit: "registros",
      metric: "Participação em treinamentos",
    },
    {
      id: "com",
      name: "Comercial",
      long: "Comercial",
      short: "Oportunidades comerciais",
      unit: "oportunidades",
      metric: "Taxa de conversão",
    },
    {
      id: "tec",
      name: "Técnico",
      long: "Técnico",
      short: "Ordens de serviço",
      unit: "OS",
      metric: "Deslocamentos realizados",
    },
    {
      id: "impl",
      name: "Implementação",
      long: "Implementação",
      short: "Projetos de implantação",
      unit: "projetos",
      metric: "Entregas no prazo",
    },
    {
      id: "qual",
      name: "Qualidade",
      long: "Qualidade",
      short: "Auditorias realizadas",
      unit: "registros",
      metric: "Índice de conformidade",
    },
    {
      id: "port",
      name: "Portaria Remota",
      long: "Portaria Remota",
      short: "Ligações e acessos",
      unit: "registros",
      metric: "Tempo médio de atendimento",
    },
  ];
  const D = window.MCData,
    S = window.MCStore;
  const current = new Date();
  let imports = [],
    settings = { operation: "Operação Michelle", goals: {} };
  const panelWelcome =
    "Olá! Posso consultar os oito setores, resumir resultados e ajudar a interpretar indicadores. Escolha uma sugestão ou pergunte livremente.";
  const generalWelcome =
    "Bem-vinda à conversa geral! Posso ajudar com ideias, organização, textos e dúvidas simples com respostas locais. Para conversas abertas com IA generativa, será necessária a integração online.";
  function loadChats() {
    try {
      let saved = JSON.parse(
        localStorage.getItem("michelle.assistant.chats.v1") || "{}",
      );
      return {
        dados:
          Array.isArray(saved.dados) && saved.dados.length
            ? saved.dados.slice(-50)
            : [{ role: "bot", text: panelWelcome }],
        geral:
          Array.isArray(saved.geral) && saved.geral.length
            ? saved.geral.slice(-50)
            : [{ role: "bot", text: generalWelcome }],
      };
    } catch (e) {
      return {
        dados: [{ role: "bot", text: panelWelcome }],
        geral: [{ role: "bot", text: generalWelcome }],
      };
    }
  }
  const state = {
    page: location.hash.replace("#/", "") || "geral",
    period: "all",
    rangeStart: "",
    rangeEnd: "",
    ready: false,
    query: "",
    pending: null,
    uploadQueue: [],
    readingFiles: false,
    chatModes: loadChats(),
    assistantMode: "dados",
    assistantOpen: false,
    assistantBusy: false,
    reportSector: "geral",
    reportPeriod: "all",
    reportStart: "",
    reportEnd: "",
    report: null,
    tablePage: 0,
    sidebar: false,
  };
  function saveChats() {
    try {
      localStorage.setItem(
        "michelle.assistant.chats.v1",
        JSON.stringify(state.chatModes),
      );
    } catch (e) {
      /* Armazenamento opcional, conversa funciona sem persistência */
    }
  }

  const idSector = (id) => sectors.find((s) => s.id === id);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const fmtNum = (n) => new Intl.NumberFormat("pt-BR").format(n || 0);
  const fmtDate = (d) => {
    if (!d) return "-";
    let a = String(d).slice(0, 10).split("-");
    return a.length === 3 ? `${a[2]}/${a[1]}/${a[0]}` : esc(d);
  };
  function getAll() {
    return D.allRows(imports);
  }
  function recordsFor(sector = "geral", days = state.period, range) {
    const all = getAll(),
      dates = all.flatMap((r) => [r.date, r.periodEnd].filter(Boolean)).sort(),
      end = dates.at(-1) || "",
      start =
        days === "all"
          ? ""
          : end
            ? new Date(Date.parse(end) - (Number(days) - 1) * 86400000)
                .toISOString()
                .slice(0, 10)
            : "";
    return D.select(all, {
      sector,
      start:
        range?.start ??
        (days === state.period ? state.rangeStart || start : start),
      end:
        range?.end ??
        (days === state.period
          ? state.rangeEnd || (!start ? "" : end)
          : !start
            ? ""
            : end),
      query: state.query,
    });
  }
  const counts = D.counts;
  const percent = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const rate = (rs) =>
    D.stats(rs).rate == null ? null : Math.round(D.stats(rs).rate);
  function statusBadge(status) {
    return `<span class="badge ${status === "Concluído" ? "ok" : status === "Pendente" ? "danger" : "warning"}">${esc(status)}</span>`;
  }
  function nav(item, label) {
    return `<button type="button" class="nav ${state.page === item ? "active" : ""}" data-nav="${item}">${icon(item === "geral" ? "grid" : item)} <span>${esc(label)}</span></button>`;
  }
  function shell() {
    let sec = idSector(state.page);
    let title = sec
      ? sec.name
      : {
          geral: "Visão Geral",
          data: "Enviar Dados Excel",
          report: "Relatórios",
          insight: "Insights e análises",
          present: "Estúdio de apresentações",
          settings: "Configurações",
        }[state.page] || "Visão geral";
    return `<div class="app"><div class="backdrop ${state.sidebar ? "open" : ""}" data-close="1"></div><aside class="sidebar ${state.sidebar ? "open" : ""}"><div class="brand"><div class="brand-logo-plate"><img src="assets/horizon-logo.png" alt="Horizon" class="brand-logo" width="208" height="72"></div><div class="brand-sub">OPERAÇÕES E INDICADORES</div></div><label class="searchbox sidebar-search">${icon("search", 18)}<input aria-label="Pesquisar registros" id="global-search" placeholder="Buscar registros..." value="${esc(state.query)}" /></label><div class="nav-scroll"><div class="nav-group"><div class="side-label">PRINCIPAL</div>${nav("geral", "Visão Geral")}${nav("present", "Estúdio de Apresentações")}</div><div class="nav-group"><div class="side-label">DEPARTAMENTOS</div>${sectors.map((s) => nav(s.id, s.name)).join("")}</div><div class="nav-group"><div class="side-label">GESTÃO E DADOS</div>${nav("data", "Enviar Dados Excel")}${nav("report", "Relatórios")}${nav("insight", "Insights e análises")}${nav("settings", "Configurações")}</div></div><div class="side-bottom"><div class="side-status"><span class="online-dot"></span> ${state.ready ? "Dados salvos neste navegador" : "Carregando armazenamento"}</div><div class="side-credit">MC Power BI Painel Completo • v3.1.3</div></div></aside><div class="main"><header class="topbar"><div class="header-identity"><button aria-label="Abrir menu" class="small-icon-btn mob-toggle" data-toggle="1">${icon("menu", 19)}</button><div class="header-brand"><img src="assets/horizon-logo.png" alt="Horizon" width="96" height="34"></div><div class="crumb"><span class="owner-name">Michelle Cândido<small>Gerente Central de Operações Integradas</small></span><span class="app-caption">MC Power BI Painel Completo<span class="crumb-page"> · ${esc(title)}</span></span></div></div><div class="head-actions">${themeButton()}<button aria-label="Estúdio de Apresentações" class="btn studio-top-button" data-nav="present">${icon("report", 15)} Estúdio de Apresentações</button><button type="button" class="top-assistant" data-assistant-open="1" aria-label="Abrir assistente">${icon("spark", 15)} <span>Assistente</span></button><span class="badge info" style="white-space:nowrap">${imports.length ? "Dados reais" : "Aguardando dados"}</span><div class="avatar">M</div></div></header><main class="content"><div class="print-header">POWER BI PAINEL COMPLETO | MICHELLE</div>${body()}</main><footer class="footer"><span>MC Power BI Painel Completo © 2026 • ${state.ready ? "Dados salvos neste navegador" : "Carregando armazenamento"}</span><span>Desenvolvido por Horizon</span></footer></div><nav class="mobile-nav" aria-label="Navegação principal">${[
      ["geral", "Visão Geral", "grid"],
      ["data", "Enviar Dados", "up"],
      ["report", "Relatórios", "report"],
      ["present", "Estúdio", "files"],
    ]
      .map(
        ([id, label, ico]) =>
          `<button class="${state.page === id ? "active" : ""}" data-nav="${id}" ${state.page === id ? 'aria-current="page"' : ""}>${icon(ico, 22)}<span>${label}</span></button>`,
      )
      .join("")}</nav></div>${assistantDock()}`;
  }
  const periodButtons = () =>
    `<div class="filter-row"><div class="period" role="group" aria-label="Selecionar período">${["all", 7, 30, 90, 365].map((n) => `<button data-period="${n}" class="${state.period === n ? "selected" : ""}">${n === "all" ? "Todos" : n === 365 ? "12m" : n + "d"}</button>`).join("")}</div><label>De <input type="date" class="control compact" id="range-start" value="${esc(state.rangeStart)}"></label><label>Até <input type="date" class="control compact" id="range-end" value="${esc(state.rangeEnd)}"></label></div>`;
  const header = (
    title,
    desc = "Visão centralizada dos seus indicadores e resultados.",
  ) =>
    `<section class="overview-head"><div><div class="eyebrow">HORIZON / OPERAÇÕES</div><h1 class="title">${esc(title)}</h1><p class="subtitle">${esc(desc)}</p>${state.query ? `<div class="active-search">Busca nos registros: <strong>${esc(state.query)}</strong><button class="btn" data-clear-query>Limpar busca</button></div>` : ""}</div><div class="header-buttons">${state.page === "geral" || state.page === "insight" || idSector(state.page) ? periodButtons() : ""}${["geral", ...sectors.map((s) => s.id)].includes(state.page) ? `<button class="btn" data-nav="report">${icon("report", 14)} Gerar relatório</button><button class="btn btn-primary" data-nav="data">${icon("up", 14)} Importar dados</button>` : ""}</div></section>`;
  const hero = (title, desc, rs) => {
    let c = counts(rs);
    return `<div class="hero"><div class="hero-left"><span class="hero-tag"><span class="online-dot" style="background:#8de6e2"></span> CENTRAL DE INDICADORES</span><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><div class="hero-right"><div class="hero-metric"><b>${rate(rs) == null ? "—" : rate(rs) + "%"}</b><small>Índice de conclusão</small></div><div style="height:42px;width:1px;background:#ffffff30"></div><div class="hero-metric"><b>${fmtNum(c.total)}</b><small>Linhas no recorte</small></div></div></div>`;
  };
  function statCards(rs, sector) {
    const ms = D.metricOptions(rs);
    if (!ms.length || !rs.length)
      return `<div class="empty-state card"><h3>${state.ready ? "Pronto para receber seus dados" : "Carregando seus dados"}</h3><p>Envie uma planilha Excel para alimentar os indicadores, análises e relatórios.</p><button class="btn btn-primary" data-nav="data">Enviar Dados Excel</button></div>`;
    return `<div class="stats">${ms.map((m, i) => `<article class="card stat"><div class="stat-top"><span class="stat-label">${esc(m.label)}</span><span class="stat-icon">${icon(i === 0 ? "files" : "chart", 17)}</span></div><div class="stat-value">${fmtNum(Math.round(m.value * 100) / 100)}${m.id === "rate" ? "%" : ""}</div><div class="stat-footer">${m.id === "rate" ? "Somente status reconhecidos" : m.id === "duration" ? "Somente durações informadas" : "Dados importados neste recorte"}</div></article>`).join("")}</div>`;
  }
  function histogram(rs) {
    let data = D.series(rs);
    if (!data.length)
      return [
        { label: "Sem data", value: 0 },
        { label: "", value: 0 },
      ];
    if (data.length === 1) data.push({ ...data[0], label: "" });
    if (data.length > 30) {
      const step = Math.ceil(data.length / 30);
      data = Array.from({ length: Math.ceil(data.length / step) }, (_, i) => ({
        label: data[i * step].label,
        value: data
          .slice(i * step, (i + 1) * step)
          .reduce((n, v) => n + v.value, 0),
      }));
    }
    return data;
  }
  function lineChart(rs) {
    if (!D.series(rs).length)
      return '<div class="empty">A fonte não informa datas individuais para exibir evolução temporal.</div>';
    let d = histogram(rs),
      max = Math.max(4, ...d.map((x) => x.value)),
      W = 800,
      H = 260,
      pl = 42,
      pr = 16,
      pt = 16,
      pb = 32,
      iw = W - pl - pr,
      ih = H - pt - pb;
    let pos = (v, i) => ({
      x: pl + (i / (d.length - 1)) * iw,
      y: pt + (1 - v / max) * ih,
    });
    let pts = d.map((e, i) => pos(e.value, i)),
      line = pts
        .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" "),
      area = line + ` L${pts.at(-1).x} ${H - pb} L${pts[0].x} ${H - pb} Z`;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfico temporal com ${d.length} períodos"> <defs><linearGradient id="linefill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3b9be5" stop-opacity=".21"/><stop offset="1" stop-color="#3b9be5" stop-opacity=".008"/></linearGradient></defs>${[
      0, 0.25, 0.5, 0.75, 1,
    ]
      .map((t) => {
        let y = pt + (1 - t) * ih;
        return `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#e8eef5" stroke-dasharray="4 5"/><text x="${pl - 12}" y="${y + 4}" fill="#9babba" font-size="11" text-anchor="end">${Math.round(max * t)}</text>`;
      })
      .join(
        "",
      )}<path d="${area}" fill="url(#linefill)"/><path d="${line}" fill="none" stroke="#2b8ce0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" stroke="#328ee0" stroke-width="2"><title>${d[i].label}: ${d[i].value} registros</title></circle>`).join("")}${d.map((e, i) => `<text x="${pts[i].x}" y="${H - 8}" fill="#9cabb9" font-size="10.5" text-anchor="middle">${esc(e.label)}</text>`).join("")}</svg></div>`;
  }
  function bars(rs) {
    let d = sectors.map((s) => ({
        name: s.name,
        short: s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name,
        count: rs.filter((r) => r.sector === s.id).length,
      })),
      max = Math.max(...d.map((x) => x.count), 1),
      W = 650,
      H = 250,
      margin = 90,
      iw = W - margin - 30,
      row = 29;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Comparação por setor">${d
      .map((e, i) => {
        let y = i * row + 6,
          w = (iw * e.count) / max;
        return `<text x="${margin - 12}" y="${y + 13}" text-anchor="end" fill="#71869a" font-size="11">${esc(e.short)}</text><rect x="${margin}" y="${y}" width="${iw}" height="18" rx="4" fill="#f1f5f9"/><rect x="${margin}" y="${y}" width="${w}" height="18" rx="4" fill="${i % 2 ? "#72b8ed" : "#398fd5"}"><title>${esc(e.name)}: ${e.count} registros</title></rect><text x="${margin + w + 7}" y="${y + 13}" fill="#436480" font-size="11" font-weight="700">${e.count}</text>`;
      })
      .join("")}</svg></div>`;
  }
  function donut(rs) {
    let c = counts(rs),
      data = [
        { name: "Concluídos", value: c.done, color: "#219f85" },
        { name: "Em andamento", value: c.open, color: "#388ddb" },
        { name: "Pendentes", value: c.pending, color: "#f3ae59" },
        { name: "Cancelados", value: c.cancelled, color: "#9ba3ad" },
        { name: "Não atendidos", value: c.unanswered, color: "#dc6a69" },
      ],
      sum = Math.max(1, c.known),
      acc = 0,
      cir = 2 * Math.PI * 67;
    return `<div class="donut-block"><div class="donut"><svg viewBox="0 0 180 180" aria-label="Distribuição de status"><circle cx="90" cy="90" r="67" fill="none" stroke="#eef3f7" stroke-width="22"/>${data
      .map((d) => {
        let len = (d.value / sum) * cir,
          a = `<circle cx="90" cy="90" r="67" fill="none" stroke="${d.color}" stroke-width="22" stroke-dasharray="${len} ${cir - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 90 90)"><title>${d.name}: ${d.value}</title></circle>`;
        acc += len;
        return a;
      })
      .join(
        "",
      )}</svg><div class="donut-center"><strong>${c.known ? percent(c.done, c.known) + "%" : "—"}</strong><span>Concluídos</span></div></div><div class="donut-legend">${data.map((d) => `<div><div class="line"><span class="legend-dot" style="background:${d.color}"></span>${d.name}</div><strong>${fmtNum(d.value)}</strong></div>`).join("")}</div></div>`;
  }
  function insights(rs, sector, detailed = false, range = {}) {
    return D.insights(rs, {
      sector: sector || "geral",
      goals: settings.goals,
      all: getAll(),
      start: range.start ?? state.rangeStart,
      end: range.end ?? state.rangeEnd,
      detailed,
    });
  }
  const insightsPanel = (rs, sector, detailed = false, range = {}) =>
    `<section class="card panel"><div class="panel-head"><div><h3 class="panel-title">Insights operacionais</h3><p class="panel-sub">Pontos de atenção por regras locais</p></div>${icon("insight", 18)}</div>${insights(
      rs,
      sector,
      detailed,
      range,
    )
      .map(
        (a) =>
          `<div class="insight"><span class="insight-mark">${icon(a.ico, 16)}</span><div><h4>${esc(a.title)}</h4><p>${esc(a.text)}</p></div></div>`,
      )
      .join(
        "",
      )}<button class="btn btn-quiet" data-nav="insight" style="margin-top:14px;width:100%">Explorar análises ${icon("arrow", 13)}</button></section>`;
  function table(rs, limit = 8, offset = 0) {
    let items = [...rs]
      .sort(
        (a, b) =>
          String(b.date || b.periodEnd || "").localeCompare(
            String(a.date || a.periodEnd || ""),
          ) || a.id.localeCompare(b.id),
      )
      .slice(offset, offset + limit);
    if (!items.length)
      return `<div class="empty">Nenhum registro encontrado no período selecionado.</div>`;
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Identificação</th><th>Descrição / Conta</th><th>Setor</th><th>Data / competência</th><th>Quantidade</th><th>Status</th></tr></thead><tbody>${items.map((r) => `<tr><td><strong>${esc(r.id)}</strong></td><td><strong>${esc(r.title)}</strong><div style="font-size:10px;color:#a0acba;margin-top:4px">${esc(r.client)}</div></td><td>${esc(idSector(r.sector)?.name || r.sector)}</td><td>${r.date ? fmtDate(r.date) : fmtDate(r.periodStart) + " a " + fmtDate(r.periodEnd)}</td><td>${fmtNum(r.value)}</td><td>${statusBadge(r.status)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function graphPanels(rs, sec) {
    return `<div class="chart-area"><section class="card panel"><div class="panel-head"><div><h3 class="panel-title">Evolução do volume</h3><div class="panel-sub">Volume de registros no período selecionado</div></div><span class="badge info">${state.period === "all" ? "Todos os dados" : state.period + " dias"}</span></div>${lineChart(rs)}<div class="legend"><span class="legend-item"><span class="legend-dot" style="background:#398ddb"></span> Volume informado por data</span></div></section><section class="card panel"><div class="panel-head"><div><h3 class="panel-title">Distribuição de status</h3><div class="panel-sub">Situação das demandas</div></div>${icon("more", 18)}</div>${donut(rs)}</section></div>`;
  }
  function pageOverview() {
    const rs = recordsFor();
    return (
      header(
        "Visão Geral",
        "Indicadores, prioridades e ferramentas da sua operação.",
      ) +
      insightsPanel(rs) +
      hero(
        "Central de Indicadores",
        "Resultados calculados a partir das suas planilhas.",
        rs,
      ) +
      statCards(rs) +
      `<section class="studio-promo"><div class="studio-promo-icon">${icon("report", 22)}</div><div><strong>Estúdio de Apresentações</strong><span>Transforme os resultados em slides para suas reuniões.</span></div><button class="btn btn-primary" data-nav="present">Criar Apresentação ${icon("arrow", 15)}</button></section>` +
      graphPanels(rs) +
      `<div class="sector-grid">${sectors
        .map((sec) => {
          let rows = rs.filter((r) => r.sector === sec.id);
          return `<button class="sector-tile" data-nav="${sec.id}"><div class="tile-top">${icon(sec.id, 16)} ${esc(sec.name)}</div><div class="tile-bottom"><strong>${fmtNum(rows.length)}</strong><small>${rows.length ? "linhas importadas" : "Aguardando dados"}</small></div></button>`;
        })
        .join(
          "",
        )}</div><section class="card panel"><h3>Atividade recente</h3>${table(rs)}<button class="btn" data-export="geral" ${rs.length ? "" : "disabled"}>Exportar Excel (.xlsx)</button></section>`
    );
  }
  function pageSector(sec) {
    const rs = recordsFor(sec.id),
      rank = new Map();
    rs.filter((r) => r.type === "deslocamentos").forEach((r) => {
      let k = [r.company, r.account, r.client].filter(Boolean).join(" / ");
      rank.set(k, (rank.get(k) || 0) + Number(r.value));
    });
    return (
      header(sec.name, sec.long + " · Resultados das planilhas deste setor.") +
      insightsPanel(rs, sec.id) +
      statCards(rs, sec.id) +
      (rank.size
        ? `<section class="card panel"><h3>Contas com maior número de deslocamentos</h3>${[
            ...rank,
          ]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(
              ([label, value]) =>
                `<div class="ranking-row"><span>${esc(label)}</span><b>${fmtNum(value)}</b></div>`,
            )
            .join("")}</section>`
        : "") +
      graphPanels(rs, sec.id) +
      `<section class="card panel"><div class="panel-head"><h3>Registros do setor</h3><button class="btn" data-export="${sec.id}" ${rs.length ? "" : "disabled"}>Exportar Excel (.xlsx)</button></div>${table(rs, 30, state.tablePage * 30)}<div class="pagination"><button class="btn" data-table-page="-1" ${state.tablePage ? "" : "disabled"}>Anterior</button><span>${state.tablePage + 1} / ${Math.max(1, Math.ceil(rs.length / 30))} · ${rs.length} linhas</span><button class="btn" data-table-page="1" ${(state.tablePage + 1) * 30 >= rs.length ? "disabled" : ""}>Próximo</button></div></section>`
    );
  }
  function uploadBox() {
    const queued = state.uploadQueue.filter((p) => !p.lotId);
    const statuses = {
      reading: "Lendo arquivo",
      ready: "Pronto para importar",
      error: "Precisa de atenção",
    };
    return `<div class="dropzone" id="dropzone"><div class="upload-prompt"><div class="drop-symbol">${icon("up", 25)}</div><h3>Suas planilhas, em um só lugar</h3><p>Arraste arquivos aqui ou selecione no seu dispositivo.</p><p class="upload-formats">XLSX, XLS ou CSV · até 50 MB por arquivo</p><label for="file-upload" class="btn btn-primary">${icon("plus", 18)} Selecionar arquivos</label><input class="file-input" type="file" id="file-upload" accept=".csv,.xlsx,.xls" multiple ${state.ready && !state.readingFiles && !state.importBusy ? "" : "disabled"}></div><div class="upload-file-list" aria-live="polite"><div class="upload-list-heading"><strong>Arquivos selecionados e importados</strong><span>${queued.length + imports.length}</span></div>${queued.map((p) => `<article class="upload-file ${p.status === "error" ? "has-error" : ""} ${state.pending === p ? "is-selected" : ""}"><span class="upload-file-icon">${icon("files", 20)}</span><div class="upload-file-info"><strong>${esc(p.name)}</strong><small>${esc(statuses[p.status] || p.status)}${p.grid ? ` · ${esc(idSector(p.sector)?.name)} · ${esc(D.types[p.type])}` : ""}</small>${p.error ? `<p class="upload-file-error">${esc(p.error)}</p>` : ""}<div class="upload-file-actions">${p.grid ? `<button class="btn" data-configure-file="${p.queueId}">Conferir dados</button>` : ""}${p.status !== "reading" ? `<button class="btn btn-quiet" data-remove-queued="${p.queueId}">Remover da seleção</button>` : ""}</div></div></article>`).join("")}${[
      ...imports,
    ]
      .reverse()
      .map(
        (l) =>
          `<article class="upload-file is-imported"><span class="upload-file-icon">${icon("check", 20)}</span><div class="upload-file-info"><strong>${esc(l.name)}</strong><small>${l.archived ? "Arquivado" : l.supersededBy ? "Versão anterior" : "Importado e salvo"} · ${fmtNum(l.rows.length)} linhas · ${esc(idSector(l.sector)?.name || l.sector)}</small><small>${esc(l.sheet)} · ${fmtDate(l.periodStart)} a ${fmtDate(l.periodEnd)}</small><div class="upload-file-actions"><button class="btn" data-view-lot="${l.id}">Consultar dados</button><button class="btn btn-quiet" data-original="${l.fileId || ""}" ${l.fileId ? "" : "disabled"}>${icon("down", 15)} Original</button></div></div></article>`,
      )
      .join(
        "",
      )}${queued.length || imports.length ? "" : '<p class="upload-empty">Os arquivos aparecerão aqui e continuarão disponíveis depois da importação.</p>'}</div>${queued.length ? `<button class="btn btn-primary upload-confirm" data-import-queue ${state.importBusy || state.readingFiles || !queued.some((p) => p.grid) ? "disabled" : ""}>${icon("up", 18)} ${state.readingFiles ? "Lendo arquivos…" : state.importBusy ? "Importando…" : `Importar arquivos (${queued.filter((p) => p.grid).length})`}</button><p class="upload-hint">Confira o setor e a competência de cada arquivo. Erros ficam nesta lista para correção.</p>` : ""}</div>`;
  }
  function pageData() {
    const p = state.pending;
    return (
      header(
        "Enviar Dados Excel",
        "As planilhas alimentam os indicadores, análises e relatórios do sistema.",
      ) +
      `<div class="notice">Os dados e arquivos ficam salvos neste navegador. Use o backup para transferir sua base ou guardar uma cópia.</div><div class="page-grid"><section class="card panel"><h3>Importar Dados</h3><p class="panel-sub">Selecione um ou mais arquivos e confira o destino de cada planilha.</p>${uploadBox()}<div class="backup-actions"><button class="btn" data-backup>Exportar backup completo</button><label class="btn">Restaurar backup<input type="file" id="restore-backup" accept=".json" hidden></label><button class="btn" data-export="geral" ${getAll().length ? "" : "disabled"}>Exportar Excel (.xlsx)</button></div></section><section id="import-configuration" class="card panel"><h3>${p ? "Configurar importação" : "Seu fluxo de dados"}</h3>${p ? importWizard(p) : `<ol class="flow-list"><li>Escolha um ou mais arquivos Excel.</li><li>Confira a aba, as colunas e o setor.</li><li>Valide os dados e confirme o envio.</li><li>Consulte indicadores, insights e relatórios atualizados.</li></ol>`}</section></div><section class="card panel section-space"><h3>Histórico de importações</h3>${
        imports.length
          ? `<div class="file-list">${[...imports]
              .reverse()
              .map(
                (l) =>
                  `<div class="file-row"><div><strong>${esc(l.name)}</strong><small>${esc(l.sheet)} · ${esc(idSector(l.sector)?.name || l.sector)} · ${l.rows.length} linhas · ${fmtDate(l.periodStart)} a ${fmtDate(l.periodEnd)} · ${l.archived ? "Arquivado" : l.supersededBy ? "Versão anterior" : "Ativo"}</small><small>${l.legacy ? "Importação antiga: dados originais para reconferência disponíveis no backup." : l.errors?.length ? l.errors.length + " linhas inválidas registradas" : ""}</small></div><div class="row"><button class="btn" data-view-lot="${l.id}">Consultar</button>${!l.supersededBy ? `<button class="btn" data-archive-lot="${l.id}">${l.archived ? "Reativar" : "Arquivar"}</button>` : ""}<button class="btn" data-original="${l.fileId || ""}" ${l.fileId ? "" : "disabled"}>Original</button></div></div>`,
              )
              .join("")}</div>`
          : '<div class="empty">Nenhuma planilha importada.</div>'
      }</section>${state.viewLot ? `<section id="lot-preview" class="card panel section-space"><h3>Dados do lote</h3>${table(imports.find((l) => l.id === state.viewLot)?.rows || [], 100)}</section>` : ""}`
    );
  }
  function previewRows(rows) {
    let cols = Object.keys(rows[0] || {}).slice(0, 6);
    return `<table class="tbl"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
      .slice(0, 10)
      .map(
        (r) =>
          `<tr>${cols.map((c) => `<td>${esc(String(r[c] ?? "").slice(0, 55))}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table>`;
  }
  function pageReport() {
    const r = state.report;
    return (
      header(
        "Relatórios",
        "Gere relatórios com os dados disponíveis e exporte o mesmo resultado.",
      ) +
      (r
        ? insightsPanel(r.rows, state.reportSector, false, {
            start: r.start,
            end: r.end,
          })
        : "") +
      `<section class="card panel"><h3>Gerar Relatório</h3><p class="panel-sub">Escolha os setores e o período dos dados.</p><div class="report-controls"><label>Setor<select id="report-sector" class="control"><option value="geral">Todos os setores</option>${sectors.map((s) => `<option value="${s.id}" ${state.reportSector === s.id ? "selected" : ""}>${s.name}</option>`).join("")}</select></label><label>De<input type="date" id="report-start" class="control" value="${esc(state.reportStart)}"></label><label>Até<input type="date" id="report-end" class="control" value="${esc(state.reportEnd)}"></label><button class="btn btn-primary" data-generate-report>Gerar Relatório</button><button class="btn" data-export="report" ${r?.rows.length ? "" : "disabled"}>Exportar Excel (.xlsx)</button><button class="btn" data-print ${r ? "" : "disabled"}>Imprimir / PDF</button></div></section>${r ? statCards(r.rows) + `<section class="card panel report-meta"><h3>Resultado gerado</h3><p>${esc(r.sectorName)} · ${fmtDate(r.start)} a ${fmtDate(r.end)} · ${r.rows.length} linhas · fontes reais</p></section>` + graphPanels(r.rows) + `<section class="card panel"><h3>Dados do relatório</h3><p class="panel-sub">Prévia de 100 linhas. O Excel contém todas as ${r.rows.length} linhas.</p>${table(r.rows, 100)}</section>` : `<div class="empty card section-space">Gere o relatório para visualizar o resultado e liberar a exportação.</div>`}`
    );
  }
  function assistantSuggestions() {
    return state.assistantMode === "dados"
      ? [
          "Resumo dos indicadores",
          "Qual setor tem mais registros?",
          "Quantas pendências temos?",
          "Como está a eficiência?",
        ]
      : [
          "Olá, tudo bem?",
          "Me dê ideias para melhorar a equipe",
          "Ajude a organizar meu dia",
          "Como escrever uma mensagem profissional?",
        ];
  }
  function assistantChat(full = false) {
    const messages = state.chatModes[state.assistantMode] || [];
    return `<div class="assistant-modes" role="tablist" aria-label="Tipo de assistente"><button type="button" role="tab" aria-selected="${state.assistantMode === "dados"}" class="assistant-mode ${state.assistantMode === "dados" ? "is-current" : ""}" data-assistant-mode="dados">${icon("chart", 16)}<span>Análises do painel</span></button><button type="button" role="tab" aria-selected="${state.assistantMode === "geral"}" class="assistant-mode ${state.assistantMode === "geral" ? "is-current" : ""}" data-assistant-mode="geral">${icon("spark", 16)}<span>Conversa geral</span></button></div><p class="assistant-context" role="status">${state.assistantMode === "dados" ? icon("check", 14) + " Respostas baseadas nos registros do painel" : '<span class="assistant-context-dot"></span> IA externa aguardando integração'}</p><div class="assistant-messages" data-assistant-messages="1" role="log" aria-live="polite" aria-label="Conversa">${messages.map((m, i) => `<div class="assistant-line ${m.role}" style="--message-delay:${Math.min(i, 5) * 35}ms"><div class="assistant-mini-avatar">${m.role === "user" ? "M" : icon("spark", 15)}</div><div class="assistant-bubble">${esc(m.text)}</div></div>`).join("")}</div><div class="assistant-bottom"><div class="assistant-quick">${assistantSuggestions()
      .map(
        (q) =>
          `<button type="button" data-assistant-suggest="${esc(q)}">${esc(q)}</button>`,
      )
      .join(
        "",
      )}</div><form class="assistant-form" data-assistant-form="1"><label class="sr-only" for="${full ? "assistant-text-full" : "assistant-text-dock"}">Mensagem ao assistente</label><textarea id="${full ? "assistant-text-full" : "assistant-text-dock"}" data-assistant-input="1" rows="1" maxlength="1800" placeholder="${state.assistantMode === "dados" ? "Pergunte sobre seus indicadores..." : "Escreva sua mensagem..."}" aria-label="Mensagem ao assistente"></textarea><button type="submit" aria-label="Enviar mensagem">${icon("arrow", 18)}</button></form><p class="assistant-disclaimer">${state.assistantMode === "dados" ? "Respostas calculadas com os dados importados." : "Respostas gerais limitadas sem integração com IA generativa."}</p></div>`;
  }
  function assistantDock() {
    return `<div class="assistant-layer ${state.assistantOpen ? "open" : ""}"><button type="button" class="assistant-dismiss" data-assistant-close="1" aria-label="Fechar assistente" tabindex="${state.assistantOpen ? "0" : "-1"}"></button><section class="assistant-window" role="dialog" aria-modal="false" aria-label="Assistente Michelle" aria-hidden="${!state.assistantOpen}"><div class="assistant-window-header"><div class="assistant-identity"><span class="assistant-emblem">${icon("spark", 20)}</span><span><strong>Assistente Michelle</strong><small>Seu espaço para análises e conversas</small></span></div><div class="assistant-header-actions"><button type="button" data-assistant-clear="1" title="Limpar conversa deste modo" aria-label="Limpar conversa">${icon("trash", 15)}</button><button type="button" data-assistant-expand="1" title="Abrir em página inteira" aria-label="Abrir assistente em página inteira">${icon("grid", 15)}</button><button type="button" data-assistant-close="1" title="Fechar" aria-label="Fechar assistente">${icon("close", 16)}</button></div></div><div class="assistant-chat-root" data-assistant-root="dock">${assistantChat()}</div></section></div><button type="button" class="assistant-fab ${state.assistantOpen ? "active" : ""}" data-assistant-toggle="1" aria-expanded="${state.assistantOpen}" aria-label="${state.assistantOpen ? "Fechar assistente" : "Abrir assistente Michelle"}"><span class="fab-emblem">${icon(state.assistantOpen ? "close" : "spark", 20)}</span><span class="fab-label">${state.assistantOpen ? "Fechar assistente" : "Assistente"}</span><span class="fab-presence"></span></button>`;
  }
  function pageInsight() {
    return (
      header(
        "Insights e Análises",
        "Diagnósticos gerenciais calculados com os dados disponíveis.",
      ) +
      insightsPanel(recordsFor(), null, true) +
      `<div class="insight-actions"><button class="btn btn-primary" data-refresh-insights>Gerar Insights com Dados Atuais</button><button class="btn" data-nav="data">Importar Novos Dados</button><button class="btn" data-nav="report">Gerar Relatório</button></div><section class="card panel assistant-full-card section-space"><div class="panel-head"><div><h3>Assistente Michelle</h3><p class="panel-sub">Consultas locais ao painel. IA externa aguardando integração.</p></div><button class="btn" data-assistant-clear>Limpar conversa</button></div><div class="assistant-chat-root assistant-chat-full" data-assistant-root="full">${assistantChat(true)}</div></section>`
    );
  }
  function pageSettings() {
    return (
      header(
        "Configurações",
        "Personalize metas, identificação e preferências do seu painel.",
      ) +
      `<div class="page-grid"><section class="card panel"><div class="panel-head"><div><h3 class="panel-title">Identidade do painel</h3><p class="panel-sub">Informações desta operação</p></div>${icon("settings", 19)}</div><div class="field appearance-field"><label for="appearance-select">Aparência do aplicativo</label><select id="appearance-select" class="control"><option value="light" ${appearance() === "light" ? "selected" : ""}>Claro · cinza e grafite</option><option value="dark" ${appearance() === "dark" ? "selected" : ""}>Escuro · grafite</option></select><p class="panel-sub">A preferência fica salva. Os temas dos slides são configurados no Estúdio.</p></div><div class="field"><label>Nome da operação</label><input class="control" id="operation" value="${esc(settings.operation)}" /></div><button class="btn btn-primary section-space" data-save="1">Salvar configurações</button><div class="info-box section-space"><strong>Seus dados operacionais</strong><p>Exporte as planilhas do sistema de origem e importe por Enviar Dados Excel. O painel preserva os arquivos originais e o histórico de atualização.</p></div></section><section class="card panel"><div class="panel-head"><div><h3 class="panel-title">Metas por departamento</h3><p class="panel-sub">Percentual de conclusão desejado</p></div>${icon("target", 18)}</div><div class="settings-list section-space">${sectors.map((s) => `<div class="settings-item"><div><strong>${s.name}</strong><small>Meta de conclusão (percentual)</small><div class="progress"><div style="width:${settings.goals?.[s.id] ?? 0}%"></div></div></div><div class="row" style="gap:4px"><input class="control" type="number" min="0" max="100" step="1" data-goal="${s.id}" value="${settings.goals?.[s.id] ?? ""}" placeholder="Sem meta"/><span>%</span></div></div>`).join("")}</div><button class="btn btn-primary section-space" data-save="1">${icon("check", 14)} Aplicar metas</button></section></div>`
    );
  }
  function body() {
    let sec = idSector(state.page);
    if (sec) return pageSector(sec);
    if (state.page === "data") return pageData();
    if (state.page === "report") return pageReport();
    if (state.page === "insight") return pageInsight();
    if (state.page === "present")
      return window.MichelleStudio
        ? window.MichelleStudio.page()
        : '<section class="card panel">Preparando o estúdio...</section>';
    if (state.page === "settings") return pageSettings();
    return pageOverview();
  }
  function render() {
    applyAppearance();
    document.getElementById("app").innerHTML = shell();
    document
      .querySelectorAll("[data-assistant-messages]")
      .forEach((el) => (el.scrollTop = el.scrollHeight));
    wire();
  }
  function appearance() {
    if (["light", "dark"].includes(settings.appearance))
      return settings.appearance;
    try {
      const stored = localStorage.getItem("horizon.appearance");
      if (["light", "dark"].includes(stored)) return stored;
    } catch (_) {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  function applyAppearance() {
    const theme = appearance();
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#171c23" : "#e6e9ed");
  }
  function themeButton() {
    const dark = appearance() === "dark";
    return `<button type="button" class="theme-toggle small-icon-btn" data-toggle-theme aria-label="${dark ? "Ativar modo claro" : "Ativar modo escuro"}" title="${dark ? "Ativar modo claro" : "Ativar modo escuro"}">${icon(dark ? "sun" : "moon", 20)}</button>`;
  }
  async function setAppearance(value) {
    const previous = settings.appearance;
    settings.appearance = value;
    applyAppearance();
    try {
      await S.put("meta", { id: "settings", value: settings });
      try {
        localStorage.setItem("horizon.appearance", value);
      } catch (_) {}
    } catch (e) {
      settings.appearance = previous;
      notify("Não foi possível salvar a aparência: " + e.message, true);
    }
    render();
  }
  function notify(t, error = false) {
    document.querySelector(".toast")?.remove();
    let node = document.createElement("div");
    node.className = "toast" + (error ? " error" : "");
    node.textContent = t;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3400);
  }
  function navigate(page) {
    state.page = page;
    state.sidebar = false;
    location.hash = "#/" + page;
    window.scrollTo({ top: 0, behavior: "instant" });
    render();
  }
  function answer(q) {
    const rows = recordsFor(),
      v = D.norm(q),
      s = D.stats(rows);
    if (!rows.length)
      return "Não há dados no recorte atual. Importe uma planilha ou ajuste os filtros.";
    if (/pend|aberto|atras/.test(v))
      return `${s.pending} pendentes e ${s.open} em andamento. Cancelados (${s.cancelled}) e não atendidos (${s.unanswered}) ficam separados.`;
    if (/setor|departamento|maior volume/.test(v))
      return (
        sectors
          .map((sec) => ({
            name: sec.name,
            n: rows.filter((r) => r.sector === sec.id).length,
          }))
          .filter((x) => x.n)
          .sort((a, b) => b.n - a.n)
          .map((x) => `${x.name}: ${x.n} linhas`)
          .join(" · ") +
        ". São fontes com unidades diferentes; volume não mede desempenho."
      );
    if (/efici|conclus|percent/.test(v))
      return s.rate == null
        ? "A fonte não informa status suficientes para calcular conclusão."
        : `Conclusão: ${s.rate.toFixed(1)}%, com ${s.done} concluídos entre ${s.known} registros de status reconhecido. Não representa SLA.`;
    return insights(rows, null, true)
      .map((x) => x.title + " — " + x.text)
      .join("\n\n");
  }
  function generalAnswer(q) {
    let v = q
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (
      /^(oi|ola|opa|bom dia|boa tarde|boa noite|e ai|tudo bem)[!?. ]*$/.test(v)
    )
      return "Olá! Tudo bem por aqui. Podemos conversar, organizar ideias ou trabalhar em textos. Que assunto você quer explorar?";
    if (/seu nome|quem e voce|o que voce faz|como funciona/.test(v))
      return "Sou o Assistente Michelle do painel. No modo Análises consulto os indicadores do painel. Aqui na Conversa geral posso apoiar tarefas simples e ideias, mas não sou um modelo generativo conectado nesta versão.";
    if (/obrigad|valeu|agradec/.test(v)) return "Por nada! Estou por aqui. 🌿";
    if (
      /^(quanto e|calcule|calcular|resultado de|qual o resultado de)/.test(v)
    ) {
      let expr = v
        .replace(
          /^(quanto e|calcule|calcular|resultado de|qual o resultado de)\s*/,
          "",
        )
        .replace(/,/g, ".")
        .replace(/x|×/g, "*")
        .replace(/÷/g, "/")
        .replace(/[?=]$/, "")
        .trim();
      if (/^[\d.() +*/%-]+$/.test(expr) && expr.length < 80) {
        try {
          let toks = expr.match(/\d+(?:\.\d+)?|[()+*/%-]/g);
          if (!toks || toks.join("") !== expr.replace(/\s+/g, ""))
            throw Error();
          let pos = 0;
          function parseFactor() {
            let t = toks[pos++];
            if (t === "-") return -parseFactor();
            if (t === "(") {
              let n = parseSum();
              if (toks[pos++] !== ")") throw Error();
              return n;
            }
            if (!/^\d/.test(t)) throw Error();
            return Number(t);
          }
          function parseTerm() {
            let n = parseFactor();
            while (["*", "/", "%"].includes(toks[pos])) {
              let op = toks[pos++],
                b = parseFactor();
              n = op === "*" ? n * b : op === "/" ? n / b : n % b;
            }
            return n;
          }
          function parseSum() {
            let n = parseTerm();
            while (["+", "-"].includes(toks[pos])) {
              let op = toks[pos++],
                b = parseTerm();
              n = op === "+" ? n + b : n - b;
            }
            return n;
          }
          let res = parseSum();
          if (pos === toks.length && Number.isFinite(res))
            return (
              "O resultado é " +
              new Intl.NumberFormat("pt-BR", {
                maximumFractionDigits: 6,
              }).format(res) +
              "."
            );
        } catch (e) {}
      }
      return "Posso calcular operações aritméticas simples, por exemplo: “Quanto é 125 + 87?”.";
    }
    if (/ideia|melhorar|inova|produtividade|equipe|processo/.test(v))
      return "Uma boa melhoria começa pelo gargalo certo. Três caminhos práticos: (1) mapear onde as tarefas mais atrasam, (2) definir um responsável e um prazo por etapa, (3) comparar semanalmente o tempo de execução e os retrabalhos. Quer focar pessoas, atendimento ou processos?";
    if (/organiz|planej|prioriz|rotina|agenda|meu dia/.test(v))
      return "Podemos montar um roteiro simples: primeiro, escolha a entrega mais importante; depois, reserve um bloco sem interrupções; por fim, agrupe tarefas rápidas e separe dez minutos para revisar pendências. Posso ajudar a adaptar isso à sua rotina.";
    if (/mensagem|texto|e-mail|email|comunicad|escrev|cliente|proposta/.test(v))
      return "Uma mensagem profissional funciona melhor quando tem contexto, objetivo e próximo passo. Exemplo: “Olá! Estou entrando em contato para alinhar [assunto]. Nossa proposta é [ação], com previsão de [prazo]. Fico à disposição para confirmarmos os próximos passos.”. Nesta versão, consigo oferecer modelos simples.";
    if (/o que acha|opiniao|conversar|desabaf|falar sobre/.test(v))
      return "Podemos conversar sobre isso. Nesta prévia, minhas respostas gerais seguem algumas regras locais e são limitadas. Uma integração com IA generativa permitirá acompanhar assuntos livres com mais profundidade.";
    return "Entendi sua mensagem. Este modo geral já permite trocar mensagens, mas ainda usa respostas locais limitadas. Para conversar livremente sobre qualquer assunto, a versão final precisará da IA generativa conectada. Você também pode usar o modo Análises para consultar os dados atuais da operação.";
  }
  function ask(q) {
    let question = String(q || "").trim();
    if (!question) return;
    let mode = state.assistantMode;
    state.chatModes[mode].push(
      { role: "user", text: question },
      {
        role: "bot",
        text: mode === "dados" ? answer(question) : generalAnswer(question),
      },
    );
    state.chatModes[mode] = state.chatModes[mode].slice(-60);
    saveChats();
    refreshAssistantChats();
    let focus = document.getElementById(
      state.assistantOpen ? "assistant-text-dock" : "assistant-text-full",
    );
    focus?.focus({ preventScroll: true });
  }
  function clearAssistant() {
    state.chatModes[state.assistantMode] = [
      {
        role: "bot",
        text: state.assistantMode === "dados" ? panelWelcome : generalWelcome,
      },
    ];
    saveChats();
    refreshAssistantChats();
  }
  function setAssistantMode(mode) {
    if (mode !== state.assistantMode && ["dados", "geral"].includes(mode)) {
      state.assistantMode = mode;
      refreshAssistantChats();
    }
  }
  function exportCSV(sec = "geral") {
    try {
      const r = sec === "report" ? state.report : null,
        rows = r ? r.rows : recordsFor(sec);
      if (sec === "report" && !r)
        throw Error("Gere um relatório válido antes de exportar.");
      if (!rows.length)
        throw Error("Não há dados nesse recorte para exportar.");
      const wb = D.workbook(XLSX, rows, D.metricOptions(rows), {
        Operação: settings.operation,
        Setor: r?.sectorName || sec,
        Início: r?.start || state.rangeStart,
        Fim: r?.end || state.rangeEnd,
        Gerado: new Date().toISOString(),
      });
      XLSX.writeFile(wb, `mc-relatorio-${sec}.xlsx`);
      notify(`${rows.length} linhas exportadas em Excel.`);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function handleFile(file) {
    return handleFiles(file ? [file] : []);
  }
  async function handleFiles(files) {
    if (state.readingFiles || state.importBusy) return;
    state.readingFiles = true;
    for (const file of Array.from(files || [])) {
      const item = {
        queueId: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        status: "reading",
      };
      state.uploadQueue.push(item);
      render();
      try {
        if (!/\.(xlsx|xls|csv)$/i.test(file.name))
          throw Error("Selecione um arquivo XLSX, XLS ou CSV.");
        if (file.size > 50 * 1024 * 1024)
          throw Error("Limite de 50 MB por arquivo.");
        const bytes = await file.arrayBuffer(),
          digest = await crypto.subtle.digest("SHA-256", bytes),
          hash = Array.from(new Uint8Array(digest))
            .map((n) => n.toString(16).padStart(2, "0"))
            .join(""),
          wb = XLSX.read(bytes, { type: "array", cellDates: false });
        const detectedSheets = wb.SheetNames.map((name) => {
          const ref = wb.Sheets[name]["!ref"];
          if (!ref) return { name, score: 0 };
          const bounds = XLSX.utils.decode_range(ref);
          const sample = XLSX.utils.sheet_to_json(wb.Sheets[name], {
            header: 1,
            raw: false,
            defval: "",
            range: {
              s: { r: 0, c: 0 },
              e: { r: Math.min(49, bounds.e.r), c: bounds.e.c },
            },
          });
          return { name, score: D.detect(sample).score };
        }).sort((a, b) => b.score - a.score);
        Object.assign(item, {
          name: file.name,
          hash,
          bytes,
          wb,
          sheet: detectedSheets[0]?.name,
          sector: "coi",
          type: "geral",
          periodStart: "",
          periodEnd: "",
          policy: "reject",
          status: "ready",
        });
        const previous = state.pending;
        state.pending = item;
        selectImportSheet();
        if (previous) state.pending = previous;
      } catch (e) {
        item.status = "error";
        item.error = "Não foi possível ler a planilha: " + e.message;
      }
    }
    state.readingFiles = false;
    state.pending ||= state.uploadQueue.find((p) => p.grid && !p.lotId) || null;
    render();
  }
  async function saveImports() {
    await S.batch(imports.map((value) => ({ store: "lots", value })));
  }
  async function confirmImport(p = state.pending) {
    if (p instanceof Event) p = state.pending;
    if (!p || state.importBusy) return;
    state.importBusy = true;
    try {
      const result = validatePending(p);
      if (result.errors.length && !p.acceptInvalid)
        throw Error(
          "Confira as linhas inválidas e marque a opção para importar somente as válidas.",
        );
      const dates = result.rows
          .flatMap((r) => [r.date, r.periodStart, r.periodEnd].filter(Boolean))
          .sort(),
        lot = {
          id: crypto.randomUUID(),
          name: p.name,
          filename: p.name,
          sheet: p.sheet,
          hash: p.hash,
          sector: p.sector,
          type: p.type,
          periodStart: p.periodStart || dates[0] || null,
          periodEnd: p.periodEnd || dates.at(-1) || null,
          created: new Date().toISOString(),
          rows: result.rows,
          errors: result.errors,
          skipped: result.skipped,
          fileId: p.hash,
        };
      const next = D.ingest(imports, lot, p.policy);
      if (next.duplicate) {
        p.status = "duplicate";
        p.lotId = imports.find(
          (l) =>
            l.hash === p.hash &&
            l.sheet === p.sheet &&
            l.sector === p.sector &&
            l.type === p.type,
        )?.id;
        p.error =
          "Este arquivo e destino já estão no histórico. Nenhuma linha foi duplicada.";
        state.pending =
          state.uploadQueue.find((x) => x.grid && !x.lotId && x !== p) || null;
        return;
      }
      await S.batch([
        ...next.lots.map((value) => ({ store: "lots", value })),
        { store: "files", value: { id: p.hash, name: p.name, bytes: p.bytes } },
      ]);
      imports = next.lots;
      p.status = "saved";
      p.lotId = lot.id;
      p.error = "";
      state.pending =
        state.uploadQueue.find((x) => x.grid && !x.lotId && x !== p) || null;
      state.report = null;
      state.tablePage = 0;
      notify(
        `${lot.rows.length} linhas salvas. Indicadores e insights atualizados.`,
      );
      render();
    } catch (e) {
      p.status = "error";
      p.error = e.message;
      notify(e.message, true);
    } finally {
      state.importBusy = false;
      render();
    }
  }
  async function importQueue() {
    if (state.importBusy || state.readingFiles) return;
    const pending = state.uploadQueue.filter((p) => p.grid && !p.lotId);
    for (const p of pending) await confirmImport(p);
    const remaining = pending.filter((p) => !p.lotId);
    notify(
      remaining.length
        ? `${remaining.length} arquivo(s) precisam de conferência. Veja o motivo no quadro de envio.`
        : "Importação concluída. Os arquivos estão salvos e disponíveis no quadro de envio.",
      !!remaining.length,
    );
  }
  function wireAssistantChat(root) {
    root
      .querySelectorAll("[data-assistant-mode]")
      .forEach((el) =>
        el.addEventListener("click", () =>
          setAssistantMode(el.dataset.assistantMode),
        ),
      );
    root
      .querySelectorAll("[data-assistant-clear]")
      .forEach((el) => el.addEventListener("click", clearAssistant));
    root
      .querySelectorAll("[data-assistant-suggest]")
      .forEach((el) =>
        el.addEventListener("click", () => ask(el.dataset.assistantSuggest)),
      );
    root.querySelectorAll("[data-assistant-form]").forEach((form) =>
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let text = form.querySelector("textarea");
        ask(text?.value || "");
      }),
    );
    root.querySelectorAll("[data-assistant-input]").forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          ask(el.value);
        }
      });
      el.addEventListener("input", () => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 114) + "px";
      });
    });
  }
  function refreshAssistantChats() {
    document.querySelectorAll("[data-assistant-root]").forEach((root) => {
      let full = root.dataset.assistantRoot === "full";
      root.innerHTML = assistantChat(full);
      wireAssistantChat(root);
      let log = root.querySelector("[data-assistant-messages]");
      if (log) log.scrollTop = log.scrollHeight;
    });
  }
  function wire() {
    document
      .querySelector("[data-clear-query]")
      ?.addEventListener("click", () => {
        state.query = "";
        invalidate();
        render();
      });
    document
      .querySelectorAll("[data-toggle-theme]")
      .forEach(
        (el) =>
          (el.onclick = () =>
            setAppearance(appearance() === "dark" ? "light" : "dark")),
      );
    document
      .getElementById("appearance-select")
      ?.addEventListener("change", (e) => setAppearance(e.target.value));
    document
      .querySelectorAll("[data-assistant-root]")
      .forEach(wireAssistantChat);
    document.querySelectorAll("[data-nav]").forEach(
      (el) =>
        (el.onclick = () => {
          state.tablePage = 0;
          navigate(el.dataset.nav);
        }),
    );
    document.querySelectorAll("[data-period]").forEach(
      (el) =>
        (el.onclick = () => {
          state.period =
            el.dataset.period === "all" ? "all" : Number(el.dataset.period);
          state.rangeStart = "";
          state.rangeEnd = "";
          invalidate();
          render();
        }),
    );
    for (const id of ["range-start", "range-end"])
      document.getElementById(id)?.addEventListener("change", (e) => {
        state[id === "range-start" ? "rangeStart" : "rangeEnd"] =
          e.target.value;
        invalidate();
        if (
          state.rangeStart &&
          state.rangeEnd &&
          state.rangeStart > state.rangeEnd
        ) {
          notify("O início deve vir antes do fim.", true);
          state[id === "range-start" ? "rangeStart" : "rangeEnd"] = "";
        }
        render();
      });
    document.querySelector("[data-toggle]")?.addEventListener("click", () => {
      state.sidebar = !state.sidebar;
      render();
    });
    document.querySelector("[data-close]")?.addEventListener("click", () => {
      state.sidebar = false;
      render();
    });
    document.getElementById("global-search")?.addEventListener("input", (e) => {
      state.query = e.target.value;
      invalidate();
      const start = e.target.selectionStart;
      render();
      const el = document.getElementById("global-search");
      el?.focus();
      el?.setSelectionRange(start, start);
    });
    document
      .querySelectorAll("[data-export]")
      .forEach((el) => (el.onclick = () => exportCSV(el.dataset.export)));
    document
      .querySelector("[data-print]")
      ?.addEventListener("click", () => window.print());
    for (const [id, key] of [
      ["report-sector", "reportSector"],
      ["report-start", "reportStart"],
      ["report-end", "reportEnd"],
    ])
      document.getElementById(id)?.addEventListener("change", (e) => {
        state[key] = e.target.value;
        state.report = null;
        render();
      });
    document
      .querySelector("[data-generate-report]")
      ?.addEventListener("click", () => {
        if (
          state.reportStart &&
          state.reportEnd &&
          state.reportStart > state.reportEnd
        ) {
          notify("Período inválido.", true);
          return;
        }
        const rows = D.select(getAll(), {
          sector: state.reportSector,
          start: state.reportStart,
          end: state.reportEnd,
          query: state.query,
        });
        state.report = {
          rows: structuredClone(rows),
          sectorName: idSector(state.reportSector)?.name || "Todos os setores",
          start: state.reportStart,
          end: state.reportEnd,
          generated: new Date().toISOString(),
        };
        render();
      });
    document
      .querySelector("[data-refresh-insights]")
      ?.addEventListener("click", () => {
        render();
        notify("Insights recalculados com os dados atuais.");
      });
    document
      .querySelector("#file-upload")
      ?.addEventListener("change", (e) => handleFiles(e.target.files));
    const drop = document.getElementById("dropzone");
    if (drop) {
      drop.ondragover = (e) => {
        e.preventDefault();
        drop.classList.add("dragging");
      };
      drop.ondragleave = () => drop.classList.remove("dragging");
      drop.ondrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      };
    }
    document.getElementById("imp-sheet")?.addEventListener("change", (e) => {
      state.pending.sheet = e.target.value;
      selectImportSheet();
    });
    for (const [id, key] of [
      ["imp-sector", "sector"],
      ["imp-type", "type"],
      ["imp-start", "periodStart"],
      ["imp-end", "periodEnd"],
      ["imp-policy", "policy"],
    ])
      document.getElementById(id)?.addEventListener("change", (e) => {
        state.pending[key] = e.target.value;
        render();
      });
    document.getElementById("imp-header")?.addEventListener("change", (e) => {
      state.pending.headerRow = Number(e.target.value) - 1;
      state.pending.mapping = D.suggest(
        state.pending.grid[state.pending.headerRow] || [],
      );
      render();
    });
    document.querySelectorAll("[data-map]").forEach(
      (el) =>
        (el.onchange = () => {
          state.pending.mapping[el.dataset.map] = Number(el.value);
          render();
        }),
    );
    document
      .querySelector("[data-confirm-import]")
      ?.addEventListener("click", confirmImport);
    document
      .querySelector("[data-import-queue]")
      ?.addEventListener("click", importQueue);
    document
      .getElementById("accept-invalid")
      ?.addEventListener("change", (e) => {
        state.pending.acceptInvalid = e.target.checked;
      });
    document.querySelectorAll("[data-configure-file]").forEach(
      (el) =>
        (el.onclick = () => {
          state.pending = state.uploadQueue.find(
            (p) => p.queueId === el.dataset.configureFile,
          );
          render();
          document
            .getElementById("import-configuration")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }),
    );
    document.querySelectorAll("[data-remove-queued]").forEach(
      (el) =>
        (el.onclick = () => {
          state.uploadQueue = state.uploadQueue.filter(
            (p) => p.queueId !== el.dataset.removeQueued,
          );
          if (state.pending?.queueId === el.dataset.removeQueued)
            state.pending =
              state.uploadQueue.find((p) => p.grid && !p.lotId) || null;
          render();
        }),
    );
    document.querySelectorAll("[data-view-lot]").forEach(
      (el) =>
        (el.onclick = () => {
          state.viewLot = el.dataset.viewLot;
          render();
          document
            .getElementById("lot-preview")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }),
    );
    document.querySelectorAll("[data-archive-lot]").forEach(
      (el) =>
        (el.onclick = async () => {
          try {
            const l = imports.find((x) => x.id === el.dataset.archiveLot),
              next = { ...l, archived: !l.archived };
            if (!next.archived) {
              const overlap = D.inspect(
                imports.filter((x) => x.id !== l.id),
                next,
              ).overlap;
              if (overlap.length && l.type !== "ordens")
                throw Error(
                  "Existe outro lote ativo no mesmo período. Arquive-o antes de reativar este.",
                );
            }
            await S.put("lots", next);
            imports = imports.map((x) => (x.id === l.id ? next : x));
            invalidate();
            render();
            notify(
              next.archived
                ? "Lote arquivado. O histórico e o original foram preservados."
                : "Lote reativado.",
            );
          } catch (e) {
            notify(e.message, true);
          }
        }),
    );
    document.querySelectorAll("[data-original]").forEach(
      (el) =>
        (el.onclick = async () => {
          try {
            const f = await S.read("files", el.dataset.original);
            if (!f) throw Error("Original não encontrado.");
            downloadBlob(new Blob([f.bytes]), f.name);
          } catch (e) {
            notify(e.message, true);
          }
        }),
    );
    document.querySelectorAll("[data-table-page]").forEach(
      (el) =>
        (el.onclick = () => {
          state.tablePage += Number(el.dataset.tablePage);
          render();
        }),
    );
    document.querySelector("[data-backup]")?.addEventListener("click", backup);
    document
      .getElementById("restore-backup")
      ?.addEventListener("change", (e) => restore(e.target.files[0]));
    document.querySelectorAll("[data-save]").forEach(
      (el) =>
        (el.onclick = async () => {
          const next = {
            ...settings,
            operation:
              document.getElementById("operation")?.value || settings.operation,
            goals: { ...settings.goals },
          };
          document.querySelectorAll("[data-goal]").forEach((n) => {
            if (n.value === "") delete next.goals[n.dataset.goal];
            else
              next.goals[n.dataset.goal] = Math.min(
                100,
                Math.max(0, Number(n.value)),
              );
          });
          try {
            await S.put("meta", { id: "settings", value: next });
            settings = next;
            render();
            notify("Configurações salvas.");
          } catch (e) {
            notify(e.message, true);
          }
        }),
    );
    document
      .querySelectorAll("[data-assistant-open],[data-assistant-toggle]")
      .forEach(
        (el) =>
          (el.onclick = () => {
            state.assistantOpen = !state.assistantOpen;
            render();
          }),
      );
    document.querySelectorAll("[data-assistant-close]").forEach(
      (el) =>
        (el.onclick = () => {
          state.assistantOpen = false;
          render();
        }),
    );
    document.querySelectorAll("[data-assistant-expand]").forEach(
      (el) =>
        (el.onclick = () => {
          state.assistantOpen = false;
          navigate("insight");
        }),
    );
  }

  function invalidate() {
    state.report = null;
    state.tablePage = 0;
  }
  function selectImportSheet() {
    const p = state.pending;
    if (!p) return;
    p.grid = XLSX.utils.sheet_to_json(p.wb.Sheets[p.sheet], {
      header: 1,
      defval: "",
      raw: false,
    });
    const a = D.detect(p.grid);
    p.headerRow = a.headerRow;
    p.mapping = a.mapping;
    p.type = a.type;
    p.sector =
      p.type === "ligacoes"
        ? "port"
        : p.type === "cuc"
          ? "qual"
          : p.type === "ordens" || p.type === "deslocamentos"
            ? "tec"
            : "coi";
    render();
  }
  function validatePending(p = state.pending) {
    const key = JSON.stringify([
      p.sheet,
      p.headerRow,
      p.mapping,
      p.sector,
      p.type,
      p.periodStart,
      p.periodEnd,
    ]);
    if (p.validationKey !== key) {
      p.validationResult = D.parse(p.grid, { ...p, filename: p.name });
      p.validationKey = key;
    }
    return p.validationResult;
  }
  function importWizard(p) {
    const h = p.grid[p.headerRow] || [],
      r = validatePending();
    return `<p class="import-filename">${esc(p.name)}</p><div class="import-fields"><label>Aba<select id="imp-sheet" class="control">${p.wb.SheetNames.map((n) => `<option ${p.sheet === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label><label>Linha dos cabeçalhos<input id="imp-header" class="control" type="number" min="1" max="${p.grid.length}" value="${p.headerRow + 1}"></label><label>Setor<select id="imp-sector" class="control">${sectors.map((s) => `<option value="${s.id}" ${s.id === p.sector ? "selected" : ""}>${s.name}</option>`).join("")}</select></label><label>Tipo<select id="imp-type" class="control">${Object.entries(
      D.types,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${k === p.type ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Período de referência: de<input type="date" id="imp-start" class="control" value="${esc(p.periodStart)}"></label><label>Até<input type="date" id="imp-end" class="control" value="${esc(p.periodEnd)}"></label></div><p class="panel-sub">Datas existentes são preservadas. Informe a competência das linhas sem data.</p><details open><summary>Associar colunas</summary><div class="mapping-grid">${Object.entries(
      D.labels,
    )
      .map(
        ([k, v]) =>
          `<label>${v}<select class="control" data-map="${k}"><option value="-1">Não informado</option>${h.map((t, i) => `<option value="${i}" ${p.mapping[k] === i ? "selected" : ""}>${esc(t || "Coluna " + (i + 1))}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div></details><div class="notice section-space">${r.rows.length} linhas válidas · ${r.errors.length} inválidas · ${r.skipped.length} totais excluídos</div>${
      r.errors.length
        ? `<div class="import-errors">${r.errors
            .slice(0, 8)
            .map((e) => `<p>Linha ${e.line}: ${esc(e.message)}</p>`)
            .join(
              "",
            )}<label><input type="checkbox" id="accept-invalid" ${p.acceptInvalid ? "checked" : ""}> Importar somente as linhas válidas e registrar os erros</label></div>`
        : ""
    }<label>Quando já houver dados no período<select id="imp-policy" class="control">${[
      ["reject", "Bloquear para conferir"],
      ["replace", "Atualizar a versão do mesmo período"],
      ["append", "Acumular — conferir possíveis registros repetidos"],
    ]
      .map(
        ([v, t]) =>
          `<option value="${v}" ${p.policy === v ? "selected" : ""}>${t}</option>`,
      )
      .join(
        "",
      )}</select></label><p class="panel-sub">Arquivos idênticos não são reimportados. OS usam empresa + número, com histórico preservado.</p>${table(r.rows, 5)}<button class="btn btn-primary section-space" data-confirm-import ${r.rows.length && !state.importBusy ? "" : "disabled"}>Confirmar importação</button>`;
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function backup() {
    try {
      const files = await S.all("files"),
        encode = (bytes) => {
          let s = "";
          for (const n of new Uint8Array(bytes)) s += String.fromCharCode(n);
          return btoa(s);
        };
      const data = {
        application: "MC Power BI Painel Completo",
        version: 3,
        lots: imports,
        settings,
        presentations: await S.all("presentations"),
        files: files.map((f) => ({ ...f, bytes: encode(f.bytes) })),
      };
      downloadBlob(
        new Blob([JSON.stringify(data)], { type: "application/json" }),
        "mc-backup-completo.json",
      );
      notify("Backup exportado com dados, apresentações e arquivos originais.");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function restore(file) {
    if (!file) return;
    try {
      if (file.size > 200 * 1024 * 1024) throw Error("Backup excede 200 MB.");
      const data = JSON.parse(await file.text());
      if (
        data.version !== 3 ||
        !Array.isArray(data.lots) ||
        !Array.isArray(data.presentations) ||
        !Array.isArray(data.files)
      )
        throw Error("Formato de backup inválido.");
      const known = new Set(
          imports.map((l) => [l.hash, l.sheet, l.sector, l.type].join("|")),
        ),
        fresh = data.lots.filter((l) => {
          if (
            !l.id ||
            !l.hash ||
            !Array.isArray(l.rows) ||
            !sectors.some((s) => s.id === l.sector)
          )
            throw Error("Lote inválido no backup.");
          return !known.has([l.hash, l.sheet, l.sector, l.type].join("|"));
        });
      for (const p of data.presentations)
        if (!p.id || !Array.isArray(p.slides))
          throw Error("Apresentação inválida no backup.");
      const decode = (base) =>
        Uint8Array.from(atob(base), (c) => c.charCodeAt(0)).buffer;
      await S.batch([
        ...fresh.map((value) => ({ store: "lots", value })),
        ...data.presentations.map((value) => ({
          store: "presentations",
          value,
        })),
        ...data.files.map((f) => ({
          store: "files",
          value: { ...f, bytes: decode(f.bytes) },
        })),
        {
          store: "meta",
          value: { id: "settings", value: data.settings || settings },
        },
      ]);
      imports = (await S.all("lots")).sort((a, b) =>
        String(a.created).localeCompare(String(b.created)),
      );
      settings = data.settings || settings;
      invalidate();
      await window.MichelleStudio?.reload();
      render();
      notify(
        `${fresh.length} lotes restaurados; biblioteca e originais preservados.`,
      );
    } catch (e) {
      notify("Não foi possível restaurar: " + e.message, true);
    }
  }
  async function init() {
    try {
      await S.open();
      imports = (await S.all("lots")).sort((a, b) =>
        String(a.created).localeCompare(String(b.created)),
      );
      const saved = await S.read("meta", "settings");
      if (saved) settings = { ...settings, ...saved.value };
      const migrated = await S.read("meta", "migration-v2");
      if (!migrated) {
        const old = JSON.parse(
          localStorage.getItem("michelle.imports.v2") || "[]",
        );
        if (old.length) {
          const lots = old.map((l) => ({
            ...l,
            legacy: true,
            hash: "legacy-" + l.id,
            sheet: "Importação antiga",
            periodStart: l.rows.map((r) => r.date).sort()[0],
            periodEnd: l.rows
              .map((r) => r.date)
              .sort()
              .at(-1),
            rows: l.rows
              .filter((r) => r.source !== "demo")
              .map((r) => ({
                ...r,
                status: D.status(r.raw?.Status ?? r.status, r.type),
                value: ["cuc", "deslocamentos"].includes(r.type)
                  ? (D.number(
                      Object.entries(r.raw || {}).find(([k]) =>
                        /quant|desloc|total|eventos/i.test(k),
                      )?.[1],
                    ) ?? r.value)
                  : 1,
              })),
          }));
          await S.batch([
            ...lots.map((value) => ({ store: "lots", value })),
            { store: "meta", value: { id: "legacy-imports", value: old } },
          ]);
          imports = [...imports, ...lots];
        }
        const oldSettings = JSON.parse(
          localStorage.getItem("michelle.settings.v2") || "null",
        );
        if (oldSettings) {
          settings = { ...settings, ...oldSettings };
          await S.put("meta", { id: "settings", value: settings });
        }
        await S.put("meta", { id: "migration-v2", completed: true });
      }
      state.ready = true;
      render();
    } catch (e) {
      state.ready = false;
      render();
      notify(e.message, true);
    }
  }

  window.MichelleBridge = {
    D,
    S,
    getImports: () => imports,
    getAll,
    handleFile,
    handleFiles,
    confirmImport,
    exportExcel: exportCSV,
    getState: () => state,
    getRecords: (sector, days, range) => recordsFor(sector, days, range),
    getSectors: () => sectors,
    getSettings: () => settings,
    render,
    navigate,
    icon,
    esc,
    fmtNum,
    counts,
    rate,
    notify,
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.assistantOpen) {
      state.assistantOpen = false;
      render();
    }
  });
  window.addEventListener("hashchange", () => {
    let page = location.hash.replace("#/", "") || "geral";
    if (page !== state.page) {
      state.page = page;
      render();
    }
  });
  render();
  init();
})();
