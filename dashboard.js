/* Dashboard operacional: a mesma base importada, com filtros e composição persistente. */
(() => {
  "use strict";
  const b = window.MichelleBridge, D = b.D, I = window.MCIntelligence, esc = b.esc;
  const key = () => "michelle.dashboard.v2." + (window.MCProfiles?.currentId() || "gerente");
  const blocks = {
    insights: "Insights operacionais", metrics: "Indicadores", crossings: "Cruzamento de contas", reading: "Entendimento das planilhas",
    trend: "Evolução no período", status: "Distribuição de status",
    sectors: "Registros por setor", ranking: "Principais registros", records: "Detalhamento",
  };
  const dimensions = { title: "Descrição", client: "Cliente", company: "Empresa", operator: "Operador", direction: "Origem da ligação" };
  const statuses = ["Concluído", "Em andamento", "Pendente", "Cancelado", "Não atendido", "Não informado"];
  const defaults = () => ({
    sector: "geral", type: "all", status: "all", period: "all", start: "", end: "", query: "",
    dimension: "title", member: null, accountKey: null, chart: "line", zoom: 100, reportUrl: "", reportView: "local",
    metrics: ["records", "ordens", "ligacoes", "cuc", "deslocamentos", "indicadores", "done", "pending", "rate", "duration"],
    order: window.MCProfiles?.current().widgets || ["metrics", "insights", "crossings", "trend", "status", "sectors", "ranking", "reading", "records"], hidden: [], sizes: { insights: 12, metrics: 12, crossings: 12, reading: 12, trend: 8, status: 4, sectors: 6, ranking: 6, records: 12 },
  });
  function reportUrl(value) {
    try {
      const url = new URL(String(value).trim());
      if (url.protocol !== "https:" || url.hostname !== "app.powerbi.com" || url.port || url.username || url.password || url.pathname !== "/reportEmbed") return "";
      if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(url.searchParams.get("reportId") || "")) return "";
      if ([...url.searchParams.keys()].some(k => /token|secret|authorization|password|key/i.test(k))) return "";
      const clean = new URL("https://app.powerbi.com/reportEmbed");
      for (const k of ["reportId", "groupId", "ctid", "config", "pageName", "filter", "$filter"]) if (url.searchParams.has(k)) clean.searchParams.set(k, url.searchParams.get(k));
      clean.searchParams.set("autoAuth", "true");
      return clean.href;
    } catch (_) { return ""; }
  }
  function load() {
    const out = defaults();
    try {
      const stored = localStorage.getItem(key()) || (window.MCProfiles?.currentId() === "gerente" ? localStorage.getItem("michelle.dashboard.v1") : null);
      const c = JSON.parse(stored || "null");
      if (!c || typeof c !== "object") return out;
      if (["geral", ...b.getSectors().map(s => s.id)].includes(c.sector)) out.sector = c.sector;
      if (["all", ...Object.keys(D.types)].includes(c.type)) out.type = c.type;
      if (["all", ...statuses].includes(c.status)) out.status = c.status;
      if (["all", "7", "30", "90", "365"].includes(String(c.period))) out.period = String(c.period);
      for (const k of ["start", "end"]) if (/^\d{4}-\d{2}-\d{2}$/.test(c[k] || "")) out[k] = c[k];
      if (out.start && out.end && out.start > out.end) out.start = out.end = "";
      if (typeof c.query === "string") out.query = c.query.slice(0, 200);
      if (Object.hasOwn(dimensions, c.dimension)) out.dimension = c.dimension;
      if (c.member && Object.hasOwn(dimensions, c.member.field) && typeof c.member.value === "string") out.member = c.member;
      if (typeof c.accountKey === "string") { const k = JSON.parse(c.accountKey); if (Array.isArray(k) && k.length === 2 && k.every(v => typeof v === "string" && v.length > 0 && v.length < 200)) out.accountKey = c.accountKey; }
      if (["line", "bar"].includes(c.chart)) out.chart = c.chart;
      if ([80, 100, 125, 150].includes(c.zoom)) out.zoom = c.zoom;
      out.reportUrl = reportUrl(c.reportUrl);
      if (out.reportUrl && c.reportView === "powerbi") out.reportView = "powerbi";
      if (Array.isArray(c.metrics)) out.metrics = [...new Set(c.metrics.filter(x => typeof x === "string"))];
      if (Array.isArray(c.order)) out.order = [...new Set([...c.order.filter(x => Object.hasOwn(blocks, x)), ...out.order])];
      if (Array.isArray(c.hidden)) out.hidden = [...new Set(c.hidden.filter(x => Object.hasOwn(blocks, x)))].slice(0, 6);
      for (const id of Object.keys(blocks)) if ([4, 6, 8, 12].includes(c.sizes?.[id])) out.sizes[id] = c.sizes[id];
    } catch (_) { /* Uma preferência inválida não bloqueia a base operacional. */ }
    return out;
  }
  let config = load();
  window.addEventListener("mc:profile-changed", () => {
    config = load();
  });
  const state = { editor: false, connectOpen: false, filtersOpen: false, expanded: false, native: false, focus: null, page: 0, drag: null };
  const date = value => value ? String(value).slice(0, 10).split("-").reverse().join("/") : "—";
  const num = value => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value ?? 0);
  const icon = (name, size = 18) => b.icon(name, size);
  function persist() {
    try { localStorage.setItem(key(), JSON.stringify(config)); }
    catch (_) { b.notify("A visualização funciona, mas o navegador não permitiu salvar os ajustes.", true); }
  }
  function update(patch, focusId) {
    config = { ...config, ...patch }; state.page = 0; b.clearAIInsight?.(); persist(); b.render();
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }
  function model() {
    const all = b.getAll();
    const available = all.filter(r => (config.sector === "geral" || r.sector === config.sector) && (config.type === "all" || r.type === config.type));
    const dates = available.flatMap(r => [r.date, r.periodEnd].filter(Boolean)).sort();
    let end = config.end, start = config.start;
    if (!start && !end && config.period !== "all" && dates.length) {
      end = dates.at(-1);
      start = new Date(Date.parse(end) - (Number(config.period) - 1) * 86400000).toISOString().slice(0, 10);
    }
    let rows = D.select(available, { start, end, query: config.query });
    if (b.getState().query) rows = D.select(rows, { query: b.getState().query });
    if (config.status !== "all") rows = rows.filter(r => r.status === config.status);
    if (config.member) rows = rows.filter(r => String(r[config.member.field] || "Não informado") === config.member.value);
    if (config.accountKey) rows = rows.filter(r => I.key(r) === config.accountKey);
    const types = [...new Set(rows.map(r => r.type))];
    const mixed = types.length > 1;
    let metrics = D.metricOptions(rows).filter(m => !(mixed && ["done", "pending", "rate", "duration"].includes(m.id)));
    metrics = metrics.map(m => m.id === "indicadores" ? { ...m, label: "Linhas de indicadores", value: rows.filter(r => r.type === "indicadores").length } : m);
    return { all, available, rows, start, end, latest: dates.at(-1), mixed, effectiveType: types.length === 1 ? types[0] : config.type, metrics, intelligence: I.analyze(rows) };
  }
  function weighted(m) { return ["cuc", "deslocamentos"].includes(m.effectiveType); }
  function weight(r, m) { return weighted(m) ? Number(r.value) || 0 : 1; }
  function unit(m) { return m.effectiveType === "cuc" ? "Eventos CUC" : m.effectiveType === "deslocamentos" ? "Deslocamentos" : m.effectiveType === "ligacoes" ? "Ligações" : m.effectiveType === "ordens" ? "Ordens de serviço" : m.effectiveType === "indicadores" ? "Registros de indicadores" : "Registros"; }
  function titleFor(id,m) {
    const label=unit(m),name=label.toLowerCase();
    return ({
      trend: m.effectiveType === "all" ? "Registros por dia" : label+" por dia",
      status: m.effectiveType === "all" ? "Status dos registros" : "Status de "+name,
      ranking: label+" por "+dimensions[config.dimension].toLowerCase(),
      sectors: m.effectiveType === "all" ? "Registros por setor" : label+" por setor",
      metrics: m.effectiveType === "all" ? "Indicadores do painel" : "Indicadores de "+name,
      insights: m.effectiveType === "all" ? "O que os dados mostram" : "Análise de "+name,
      reading: "Origem e significado dos números",
      records: m.effectiveType === "all" ? "Registros detalhados" : "Detalhes de "+name
    })[id]||blocks[id];
  }
  function metricDescription(m, rows) {
    if (m.id === "records") return "Linhas ativas após os filtros";
    if (m.id === "rate") return `${num(D.stats(rows).done)} concluídos / ${num(D.stats(rows).known)} com status reconhecido; não é SLA`;
    if (m.id === "duration") return `Média de ${num(D.stats(rows).timed)} de ${num(rows.length)} registros com duração; inclui zeros. Não mede espera ou SLA`;
    if (["cuc", "deslocamentos"].includes(m.id)) return "Soma das quantidades informadas na fonte";
    if (m.id === "pending") return "Pendentes + em andamento; exclui cancelados e não atendidos";
    if (m.id === "done") return "Status reconhecido como concluído";
    return "Registros dessa fonte no recorte";
  }
  function sourceColumn(row, role) {
    if (!row || !row.raw || !role) return "";
    return Object.keys(row.raw).find(name => D.suggest([name])[role] === 0) || "";
  }
  function metricSources(metric, rows) {
    const scope = Object.hasOwn(D.types, metric.id) ? rows.filter(r => r.type === metric.id) : rows;
    const ids = new Set(scope.map(r => r.lotId).filter(Boolean));
    const lots = b.getImports().filter(l => ids.has(l.id));
    const role = ["cuc", "deslocamentos"].includes(metric.id) ? "value"
      : metric.id === "duration" ? "duration"
      : ["done", "pending", "rate"].includes(metric.id) ? "status" : "";
    return lots.map(l => {
      const sample = scope.find(r => r.lotId === l.id);
      const field = sourceColumn(sample, role);
      return { name: l.name || l.filename || "Planilha importada", sheet: l.sheet || "Aba não informada", field, type: D.types[l.type] || "Registros" };
    });
  }
  function metricOrigin(metric, rows) {
    const sources=metricSources(metric,rows);
    if(!sources.length)return '<p class="dash-metric-source">Cálculo feito sobre o recorte atual.</p>';
    const role=["cuc","deslocamentos"].includes(metric.id)?"Soma da coluna":metric.id==="duration"?"Média da coluna":
      ["done","pending","rate"].includes(metric.id)?"Status da coluna":"Contagem das linhas";
    return '<details class="dash-metric-lineage"><summary>De onde saiu este número?</summary><p>'+esc(metricDescription(metric,rows))+'</p><ul>'+
      sources.map(x=>'<li>'+esc(x.name)+' · aba '+esc(x.sheet)+' · '+esc(x.field?role+' '+x.field:x.type+' / '+role)+'</li>').join("")+
      '</ul></details>';
  }
  function recordUnit(r) {
    if (r.type === "ligacoes") return "1 registro de ligação";
    if (r.type === "ordens") return "1 ordem de serviço";
    if (r.type === "cuc") return "eventos CUC" + (sourceColumn(r, "value") ? " · coluna " + sourceColumn(r, "value") : "");
    if (r.type === "deslocamentos") return "deslocamentos" + (sourceColumn(r, "value") ? " · coluna " + sourceColumn(r, "value") : "");
    if (r.type === "indicadores") return "valor do indicador" + (sourceColumn(r, "value") ? " · coluna " + sourceColumn(r, "value") : "");
    return "registro da planilha";
  }
  function blockCaption(id,m) {
    const sources=[...new Set(m.rows.map(r=>r.lotId).filter(Boolean))];
    const lots=b.getImports().filter(l=>sources.includes(l.id));
    const labels={
      insights:"Fatos calculados e interpretação complementar do Copiloto.",
      metrics:"Valores prontos, com explicação do cálculo ao tocar no indicador.",
      crossings:"Relação entre OS e deslocamentos por empresa e conta, quando comprovada.",
      reading:"Quais campos entram nos cálculos e o que cada dado representa.",
      trend:"Cada ponto soma os registros com data individual. Valores por dia.",
      status:"Quantidade de registros em cada situação informada.",
      sectors:"Quantidade de registros por setor, sem misturar unidades de desempenho.",
      ranking:"Principais resultados agrupados por "+dimensions[config.dimension].toLowerCase()+".",
      records:"Dados que compõem o recorte, com origem verificável."
    };
    const links=lots.map(l=>esc(l.name||l.filename||"Planilha")+" · aba "+esc(l.sheet||"não informada"));
    const origin=links.length?links.join("; "):[...new Set(m.rows.map(r=>esc(r.source)).filter(Boolean))].join("; ")||"Sem arquivo no recorte";
    return '<p class="dash-widget-caption">'+esc(labels[id]||"")+'</p>'+
      '<details class="dash-source"><summary>De onde vêm esses números?</summary><p>'+origin+'</p><p>'+
      esc(num(m.rows.length)+' registros incluídos pelos filtros. '+(weighted(m)?"O valor do gráfico soma as quantidades das linhas.":"Cada registro vale uma unidade no gráfico."))+
      '</p></details>';
  }
  function metricCards(m) {
    if (!m.rows.length) return empty("Nenhum dado neste recorte", "Importe planilhas ou ajuste os filtros.");
    const selected = m.metrics.filter(x => config.metrics.includes(x.id));
    if (!selected.length) return empty("Escolha seus indicadores", "Abra Personalizar e marque os indicadores que deseja ver.");
    return `<div class="dash-metrics">${selected.map(x => `<div class="dash-metric" data-metric="${esc(x.id)}"><span>${esc(window.MCAnalysis?.metricLabel(x) || x.label)}</span><strong>${num(x.value)}${x.id === "rate" ? "%" : ""}</strong><small>${esc(metricDescription(x, m.rows))}</small>${metricOrigin(x, m.rows)}</div>`).join("")}</div>${m.mixed ? '<p class="dash-note">Fontes com unidades diferentes têm seus totais separados. Selecione uma fonte para ver conclusão e duração.</p>' : ""}`;
  }
  function empty(title, text = "") { return `<div class="dash-empty"><strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ""}</div>`; }
  function trend(m) {
    const daily = D.series(m.rows.map(r => weighted(m) ? r : { ...r, type: "linha" }));
    if (!daily.length) return empty("Sem datas individuais", "Totais por competência não são distribuídos artificialmente entre os dias.");
    const step = Math.max(1, Math.ceil(daily.length / 52));
    const series = Array.from({ length: Math.ceil(daily.length / step) }, (_, i) => {
      const group = daily.slice(i * step, (i + 1) * step);
      return { label: group[0].label, detail: date(group[0].date) + (group.length > 1 ? " a " + date(group.at(-1).date) : ""), value: group.reduce((n, x) => n + x.value, 0) };
    });
    const W = 760, H = 280, left = 52, right = 20, top = 24, bottom = 40, max = Math.max(1, ...series.map(x => x.value));
    const x = i => series.length === 1 ? W / 2 : left + i / (series.length - 1) * (W - left - right);
    const y = v => top + (1 - v / max) * (H - top - bottom);
    const grid = [0, .25, .5, .75, 1].map(t => `<line x1="${left}" x2="${W - right}" y1="${y(t * max)}" y2="${y(t * max)}" stroke="var(--line)" stroke-dasharray="3 5"/><text x="${left - 9}" y="${y(t * max) + 4}" text-anchor="end" fill="var(--muted)" font-size="12">${num(Math.round(max * t))}</text>`).join("");
    const points = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
    const bw = Math.min(40, (W - left - right) / series.length * .65);
    const marks = config.chart === "bar" ? series.map((p, i) => `<rect x="${x(i) - bw / 2}" y="${y(p.value)}" width="${bw}" height="${H - bottom - y(p.value)}" rx="3" fill="var(--brand)"><title>${esc(p.detail)}: ${num(p.value)} ${unit(m).toLowerCase()}</title></rect>`).join("") : `<polyline points="${points}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round"/>${series.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="var(--brand)"><title>${esc(p.detail)}: ${num(p.value)} ${unit(m).toLowerCase()}</title></circle>`).join("")}`;
    const labels = series.map((p, i) => i === series.length - 1 || i % Math.max(1, Math.ceil(series.length / 6)) === 0 ? `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" fill="var(--muted)" font-size="12">${esc(p.label)}</text>` : "").join("");
    return `<div class="dash-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit(m))} por data, ${daily.length} datas informadas">${grid}${marks}${labels}</svg></div><p class="dash-note">${unit(m)} com data individual${step > 1 ? ` · agrupadas em até ${step} datas por ponto` : ""}. ${num(m.rows.filter(r => !r.date).length)} linhas por competência fora deste gráfico.</p><details class="dash-values"><summary>Ver valores do gráfico</summary><div class="dash-table-scroll"><table><thead><tr><th>Data / intervalo</th><th>${unit(m)}</th></tr></thead><tbody>${series.map(p => `<tr><td>${esc(p.detail)}</td><td>${num(p.value)}</td></tr>`).join("")}</tbody></table></div></details>`;
  }
  function horizontal(items, attribute) {
    if (!items.length) return empty("Sem registros disponíveis");
    const max = Math.max(1, ...items.map(x => x.value));
    return `<div class="dash-bars">${items.map(x => `<button type="button" class="dash-bar" ${attribute}="${esc(x.id)}" aria-label="Filtrar ${esc(x.label)}: ${num(x.value)}"><span class="dash-bar-name">${esc(x.label)}</span><span class="dash-bar-track"><span style="width:${Math.max(0, x.value / max * 100)}%;${x.color ? `background:${x.color};` : ""}"></span></span><strong>${num(x.value)}</strong></button>`).join("")}</div>`;
  }
  function statusChart(m) {
    const colors = ["var(--positive)", "var(--brand)", "var(--warning)", "#aaa", "var(--negative)", "var(--muted)"];
    const items = statuses.map((s, i) => ({ id: s, label: s, color: colors[i], value: m.rows.filter(r => r.status === s).length })).filter(x => x.value);
    const unknown = m.rows.filter(r => !statuses.includes(r.status)).length;
    return horizontal(items, "data-dash-status") + `<p class="dash-note">Linhas por status; toque para filtrar.${unknown ? ` ${num(unknown)} sem status reconhecido.` : ""}</p>`;
  }
  function sectorsChart(m) {
    const items = b.getSectors().map(s => ({ id: s.id, label: s.name, value: m.rows.filter(r => r.sector === s.id).length }));
    return horizontal(items, "data-dash-sector") + '<p class="dash-note">Linhas por setor. Fontes com unidades diferentes não medem desempenho entre setores.</p>';
  }
  function ranking(m) {
    const groups = new Map();
    m.rows.forEach(r => { const name = String(r[config.dimension] || "Não informado"); groups.set(name, (groups.get(name) || 0) + weight(r, m)); });
    const items = [...groups].sort((a, z) => z[1] - a[1]).slice(0, 8).map(([id, value]) => ({ id, label: id, value }));
    return horizontal(items, "data-dash-member") + `<p class="dash-note">Até 8 por ${esc(dimensions[config.dimension].toLowerCase())} · ${unit(m).toLowerCase()}. Toque para explorar.</p>`;
  }
  function insights(m) {
    const ai=b.getAIInsight?.()||{};
    const smart='<section class="mc-ai-insight" aria-label="Análise complementar de inteligência artificial"><strong>✦ Copiloto · interpretação dos dados</strong>'+
      (ai.text?'<p>'+esc(ai.text).replace(/\n/g,"<br>")+'</p>':'<p>O painel já calculou os indicadores. Ative o Copiloto para destacar oportunidades e pontos de atenção além dos totais.</p>')+
      '<button type="button" class="btn btn-primary" data-dash-ai-insights '+(ai.busy||!m.rows.length?"disabled":"")+'>'+(ai.busy?"Analisando…":ai.text?"Atualizar análise da IA":"✦ Analisar com IA")+'</button></section>';
    const cards = m.intelligence.cards, types = new Set(), featured = cards.filter(c => { if (types.has(c.type)) return false; types.add(c.type); return true; });
    const extra = cards.filter(c => !featured.includes(c));
    const advanced = window.MCAnalysis?.analyze(m.rows, b.getImports()).filter(c => ["comparison", "attention", "concentration"].includes(c.kind)).slice(0, 4) || [];
    const trace = advanced.map(c => '<article class="mc-intelligence-card"><strong>' + esc(c.title) + '</strong><p>' + esc(c.text) + '</p><details><summary>Fórmula, fonte e limitações</summary><p>' + esc(c.basis) + '</p><p>' + esc(c.caveat) + '</p><p>' + c.evidence.map(x => esc(x.file) + ' · ' + esc(x.sheet) + (x.line ? ' · linha ' + x.line : '')).join('; ') + '</p></details></article>').join("");
    return smart+`<p class="dash-note">Números calculados localmente. Abra a evidência para conferir as fontes.</p>${trace}<div class="dash-insights">${featured.map(insightCard).join("")}</div>${extra.length ? `<details class="dash-extra-insights"><summary>Mais ${extra.length} leituras do recorte</summary><div class="dash-insights">${extra.map(insightCard).join("")}</div></details>` : ""}`;
  }
  function insightCard(c) {
    return `<div class="dash-insight-card"><span>${icon(c.ico, 18)}</span><strong>${esc(c.title)}</strong><p>${esc(c.text)}</p><details><summary>Entender este insight</summary><p><b>Base do cálculo:</b> ${esc(c.basis)}</p><p><b>Limite:</b> ${esc(c.caveat)}</p>${c.evidence.length ? `<ul>${c.evidence.map(r => `<li>${esc(r.source)} · linha ${esc(r.line || "—")}</li>`).join("")}</ul>` : ""}</details>${c.type === "cross" ? '<button class="btn" data-dash-focus="crossings">Ver contas relacionadas</button>' : Object.hasOwn(D.types, c.type) ? `<button class="btn" data-dash-insight-type="${esc(c.type)}">Explorar esta fonte</button>` : ""}</div>`;
  }
  function reading(m) {
    if (!m.rows.length) return empty("Sem planilhas neste recorte", "Importe uma fonte para ver seu significado e a cobertura das colunas.");
    return `<p class="dash-note">O setor é o destino escolhido na importação. Não é deduzido como departamento de origem da planilha. Campos vazios são preservados.</p><div class="dash-readings">${m.intelligence.profiles.map(p => `<details><summary>${esc(p.label)} · ${num(p.total)} ${esc(p.unit)}</summary><p>${esc(p.meaning)}</p><p><b>Arquivos neste grupo:</b> ${esc([...new Set(m.rows.filter(r => r.type === p.type).map(r => r.source).filter(Boolean))].join("; ") || "Fonte não informada")}</p><p>${num(p.rows)} linhas · ${num(p.dated)} com data individual · ${num(p.timed)} com duração.</p><p class="dash-note">${esc(p.limit)}</p>${p.fields.length ? `<div class="dash-table-scroll"><table><thead><tr><th>Coluna original</th><th>Preenchimento no recorte</th><th>Uso no painel</th></tr></thead><tbody>${p.fields.map(f => `<tr><td>${esc(f.name)}</td><td>${num(f.populated)} / ${num(p.rows)}</td><td class="dash-purpose">${esc(f.purpose)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="dash-note">Esta importação não possui colunas originais para detalhar.</p>'}</details>`).join("")}</div>`;
  }
  function crossings(m) {
    const c = m.intelligence.cross;
    return `<p class="dash-note">OS × deslocamentos · empresa + conta. O período é conferido quando informado. Ligações e CUC ficam fora desse vínculo: as fontes fornecidas não têm a chave completa.</p>${c.accounts.length ? `<div class="dash-cross-metrics"><span><b>${num(c.matchedAccounts)}</b> contas correspondentes</span><span><b>${num(c.matchedOrders)} / ${num(c.orders)}</b> OS relacionadas</span><span><b>${num(c.matchedTrips)} / ${num(c.trips)}</b> deslocamentos relacionados</span></div><div class="dash-table-scroll"><table><thead><tr><th>Empresa / conta</th><th>Cliente</th><th>Competência</th><th>Deslocamentos</th><th>OS</th><th>OS em aberto</th><th>Explorar</th></tr></thead><tbody>${c.accounts.map(a => `<tr><td>${esc(a.company)} / ${esc(a.account)}</td><td>${esc(a.client)}</td><td>${a.periodConfirmed ? a.periods.map(p => `${date(p.start)} a ${date(p.end)}`).join("; ") : "Não informado · vínculo só pela conta"}</td><td>${num(a.trips)}</td><td>${num(a.orders)}</td><td>${num(a.pending)}</td><td><button class="btn" data-dash-account="${esc(I.key(a))}">Ver conta</button></td></tr>`).join("")}</tbody></table></div>` : empty("Cruzamento aguardando correspondência", c.reason)}${c.accounts.length ? `<p class="dash-note">${esc(c.reason)}</p>` : ""}${c.available ? `<details class="dash-cross-coverage"><summary>Conferir cobertura do cruzamento</summary><p>${num(c.excludedOrders)} OS e ${num(c.excludedTrips)} deslocamentos não foram relacionados. ${num(c.unmatchedAccounts)} contas de deslocamentos não têm OS no período; ${num(c.ambiguousPeriods)} contas têm competências sobrepostas; ${num(c.missingKeys)} linhas não possuem empresa/conta e ${num(c.missingPeriods)} não possuem período suficiente para validar a correspondência temporal. Ausência de correspondência não significa ausência de atendimento.</p></details>` : ""}`;
  }
  function records(m) {
    const rows = [...m.rows].sort((a, z) => String(z.date || z.periodEnd || "").localeCompare(String(a.date || a.periodEnd || "")));
    const pages = Math.max(1, Math.ceil(rows.length / 20)); state.page = Math.min(state.page, pages - 1);
    const view = rows.slice(state.page * 20, (state.page + 1) * 20);
    if (!view.length) return empty("Nenhum registro neste recorte");
    return `<div class="dash-table-scroll" tabindex="0" aria-label="Detalhamento dos dados filtrados"><table><thead><tr><th>Identificação</th><th>Descrição / cliente</th><th>Setor</th><th>Data / competência</th><th>Valor / unidade</th><th>Status</th><th>Fonte original</th></tr></thead><tbody>${view.map(r => { const lot = b.getImports().find(l => l.id === r.lotId); return `<tr><td>${esc(r.id)}</td><td><strong>${esc(r.title)}</strong><small>${esc(r.client)}</small></td><td>${esc(b.getSectors().find(s => s.id === r.sector)?.name || r.sector)}</td><td>${r.date ? date(r.date) : `${date(r.periodStart)} a ${date(r.periodEnd)}`}</td><td><span class="dash-row-value">${num(r.value)}</span><small class="dash-row-unit">${esc(recordUnit(r))}</small></td><td>${esc(r.status)}</td><td><details class="dash-raw"><summary>Ver linha ${esc(r.line || "—")}</summary><p>${esc(r.source || lot?.name || "Planilha importada")} · ${esc(lot?.sheet || "Aba não registrada")}</p><dl>${Object.entries(r.raw || {}).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v == null || v === "" ? "Não informado" : v)}</dd>`).join("")}</dl></details></td></tr>`; }).join("")}</tbody></table></div><div class="dash-pagination"><button class="btn" data-dash-page="-1" ${state.page ? "" : "disabled"}>Anterior</button><span>${num(m.rows.length)} linhas · ${state.page + 1} / ${pages}</span><button class="btn" data-dash-page="1" ${state.page + 1 < pages ? "" : "disabled"}>Próxima</button></div>`;
  }
  function content(id, m) { return ({ insights, metrics: metricCards, crossings, reading, trend, status: statusChart, sectors: sectorsChart, ranking, records }[id])(m); }
  function widget(id, m) {
    return `<article class="dash-widget" style="--dash-span:${config.sizes[id]}" data-dash-widget="${id}"><header class="dash-widget-head"><h2>${esc(titleFor(id,m))}</h2><div>${id === "trend" ? `<select id="dash-chart" aria-label="Tipo de gráfico temporal"><option value="line" ${config.chart === "line" ? "selected" : ""}>Linhas</option><option value="bar" ${config.chart === "bar" ? "selected" : ""}>Barras</option></select>` : ""}${id === "ranking" ? `<select id="dash-dimension" aria-label="Agrupar principais registros">${Object.entries(dimensions).map(([k, v]) => `<option value="${k}" ${config.dimension === k ? "selected" : ""}>${v}</option>`).join("")}</select>` : ""}${state.editor ? `<button class="dash-icon-btn dash-drag" draggable="true" data-dash-drag="${id}" data-dash-touch-drag="${id}" title="Arrastar para mudar de posição; as setas também funcionam" aria-label="Arrastar ${esc(blocks[id])}">${icon("menu", 16)}</button>` : ""}<button class="dash-icon-btn" data-dash-focus="${id}" title="Ampliar ${esc(blocks[id])}" aria-label="Ampliar ${esc(blocks[id])}">${icon("expand", 17)}</button></div></header><div class="dash-widget-body">${blockCaption(id, m)}${content(id, m)}</div></article>`;
  }
  function editor(m) {
    if (!state.editor) return "";
    const available = [...new Map(Object.keys(D.types).flatMap(type => D.metricOptions(m.all.filter(r => r.type === type))).map(metric => [metric.id, metric])).values()];
    return `<section class="dash-editor" aria-labelledby="dash-editor-title"><div class="dash-editor-head"><div><h2 id="dash-editor-title">Monte seu dashboard</h2><p>Escolha os blocos, a ordem, o tamanho e os indicadores. Seus ajustes ficam salvos.</p></div><button class="btn" data-dash-edit>Concluir ajustes</button></div><div class="dash-editor-grid"><div><h3>Blocos e ordem</h3>${config.order.map((id, i) => `<div class="dash-editor-row" data-dash-editor-row="${id}"><button class="dash-editor-handle" type="button" draggable="true" data-dash-drag="${id}" data-dash-touch-drag="${id}" aria-label="Arrastar ${esc(blocks[id])} para reordenar" title="Toque e arraste para reordenar">${icon("menu", 19)}</button><label><input type="checkbox" data-dash-visible="${id}" ${config.hidden.includes(id) ? "" : "checked"}>${esc(blocks[id])}</label><div><button class="dash-icon-btn" data-dash-move="${id}:-1" aria-label="Mover ${esc(blocks[id])} para cima" ${i === 0 ? "disabled" : ""}>↑</button><button class="dash-icon-btn" data-dash-move="${id}:1" aria-label="Mover ${esc(blocks[id])} para baixo" ${i === config.order.length - 1 ? "disabled" : ""}>↓</button><select data-dash-size="${id}" aria-label="Largura de ${esc(blocks[id])}">${[[4, "1/3"], [6, "Metade"], [8, "2/3"], [12, "Inteiro"]].map(([n, name]) => `<option value="${n}" ${config.sizes[id] === n ? "selected" : ""}>${name}</option>`).join("")}</select></div></div>`).join("")}<div class="dash-editor-tips"><strong>Organize arrastando</strong>: segure o símbolo de linhas e deslize o bloco para a posição desejada. Funciona com toque ou caneta. No computador, arraste os blocos do painel. As setas continuam disponíveis.</div><p class="dash-note">No celular, cada bloco ocupa a largura da tela. Ordem, tamanho e seleção são salvos nesta experiência.</p></div><div><h3>Indicadores visíveis</h3><div class="dash-metric-options">${available.map(x => `<label><input type="checkbox" data-dash-metric="${esc(x.id)}" ${config.metrics.includes(x.id) ? "checked" : ""}>${esc(x.id === "indicadores" ? "Linhas de indicadores" : x.label)}</label>`).join("")}</div><p class="dash-note">Indicadores sem dados no recorte não aparecem. Conclusão e duração exigem uma única fonte.</p><button class="btn" data-dash-reset-layout>Restaurar composição padrão</button></div></div></section>`;
  }
  function source(m) {
    const activeLots = new Set(m.rows.map(r => r.lotId));
    const lots = b.getImports().filter(l => !l.archived && !l.supersededBy && activeLots.has(l.id));
    const latest = lots.map(l => l.created).filter(Boolean).sort().at(-1);
    const formatted = latest && Number.isFinite(Date.parse(latest)) ? new Date(latest).toLocaleString("pt-BR") : "—";
    return `<details class="dash-source"><summary>Fontes e definições · ${lots.length} importações no recorte</summary><p>Última importação: ${esc(formatted)}. O dashboard usa os registros ativos do histórico e é recalculado quando os filtros ou as importações mudam.</p><ul>${lots.map(l => `<li>${esc(l.name || l.filename || "Planilha importada")} · ${num(l.rows?.length || 0)} linhas · ${esc(b.getSectors().find(s => s.id === l.sector)?.name || l.sector || "")}</li>`).join("") || "<li>Nenhuma importação corresponde ao recorte atual.</li>"}</ul><p>Linhas são contadas individualmente. Eventos CUC e deslocamentos usam a quantidade informada. Conclusão usa apenas status reconhecidos e não representa SLA. Totais por competência só entram em filtros que cobrem o intervalo inteiro. Não há conexão automática com o sistema de origem nesta versão.</p></details>`;
  }
  function localPage() {
    const m = model();
    const selected = config.order.filter(id => !config.hidden.includes(id));
    return `<section id="interactive-dashboard" class="interactive-dashboard ${state.editor ? "editing" : ""}" style="--dash-scale:${config.zoom / 100}" aria-label="Dashboard interativo"><header class="dash-head"><div><span class="eyebrow">POWER BI PAINEL COMPLETO / MICHELLE CÂNDIDO</span><h1>Seu painel de indicadores</h1><p>Resultados identificados por fonte, período e unidade.</p></div><div class="dash-actions"><label class="dash-zoom-label" for="dash-zoom">Ampliação<select id="dash-zoom" aria-label="Ampliação do dashboard">${[80, 100, 125, 150].map(n => `<option value="${n}" ${config.zoom === n ? "selected" : ""}>${n}%</option>`).join("")}</select></label><button class="btn" data-dash-edit aria-expanded="${state.editor}">${icon("settings")} ${state.editor ? "Concluir ajustes" : "Personalizar"}</button><button class="btn btn-primary" data-dash-fullscreen aria-pressed="${state.expanded}">${icon(state.expanded ? "close" : "expand")} ${state.expanded ? "Sair de tela cheia" : "Tela cheia"}</button></div></header><details class="dash-filter-panel" ${state.filtersOpen ? "open" : ""}><summary>Filtros e período <span>${num(m.rows.length)} linhas no recorte</span></summary><div class="dash-filters"><label>Setor<select id="dash-sector"><option value="geral">Todos os setores</option>${b.getSectors().map(s => `<option value="${s.id}" ${config.sector === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label><label>Fonte<select id="dash-type"><option value="all">Todas · totais separados</option>${Object.entries(D.types).map(([k, label]) => `<option value="${k}" ${config.type === k ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label><label>Status<select id="dash-status"><option value="all">Todos os status</option>${statuses.map(s => `<option ${config.status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label><label>Período<select id="dash-period">${[["all", "Todo o histórico"], ["7", "Últimos 7 dias da fonte"], ["30", "Últimos 30 dias da fonte"], ["90", "Últimos 90 dias da fonte"], ["365", "Últimos 12 meses da fonte"]].map(([k, text]) => `<option value="${k}" ${String(config.period) === k ? "selected" : ""}>${text}</option>`).join("")}</select></label><label>De<input id="dash-start" type="date" value="${esc(config.start)}"></label><label>Até<input id="dash-end" type="date" value="${esc(config.end)}"></label><form class="dash-search" id="dash-search"><label>Buscar nos dados<input id="dash-query" type="search" maxlength="200" placeholder="Cliente, descrição, conta..." value="${esc(config.query)}"></label><button class="dash-icon-btn" aria-label="Aplicar busca no dashboard">${icon("search")}</button></form><button class="btn" data-dash-clear>Limpar filtros</button></div></details><div class="dash-context" role="status"><span>${m.start || m.end ? `${date(m.start)} a ${date(m.end)}` : "Todo o histórico"} · ${num(m.rows.length)} linhas · dados até ${date(m.latest)}</span>${config.accountKey ? `<button class="btn" data-dash-clear-account>Remover conta: ${esc(JSON.parse(config.accountKey).join(" / "))} ×</button>` : ""}${config.member ? `<button class="btn" data-dash-clear-member>Remover filtro: ${esc(config.member.value)} ×</button>` : ""}${b.getState().query ? `<span>Busca global: ${esc(b.getState().query)}</span>` : ""}<button class="btn" data-dash-export ${m.rows.length ? "" : "disabled"}>${icon("down", 16)} Exportar este recorte</button></div><div class="dash-quick-guide"><strong>Como ler este painel</strong><span>Os números usam a legenda e unidade de cada fonte.</span><span>Toque em uma barra ou indicador para detalhar e filtrar.</span><button class="btn" data-nav="data">Importar ou excluir arquivos</button></div>${editor(m)}<div class="dash-grid">${selected.map(id => widget(id, m)).join("")}</div>${source(m)}${state.focus ? `<dialog id="dashboard-focus" class="dash-focus-dialog" aria-labelledby="dash-focus-title"><header><div><span class="eyebrow">DASHBOARD / MICHELLE CÂNDIDO</span><h2 id="dash-focus-title">${esc(titleFor(state.focus,m))}</h2><p>${num(m.rows.length)} linhas · filtros atuais</p></div><button class="btn" data-dash-close-focus>Fechar ampliação ${icon("close", 17)}</button></header><div class="dash-focus-body">${content(state.focus, m)}</div></dialog>` : ""}</section>`;
  }
  function connection() {
    if (!state.connectOpen) return "";
    return `<section class="dash-editor dash-connection"><h2>Conectar Microsoft Power BI</h2><p>No seu relatório do Power BI, escolha Arquivo → Inserir relatório → Site ou portal e copie o link de incorporação seguro. A visualização usa o acesso da sua conta Microsoft.</p><form id="dash-powerbi-form"><label for="dash-powerbi-url">Link de incorporação do relatório</label><input id="dash-powerbi-url" type="url" value="${esc(config.reportUrl)}" placeholder="https://app.powerbi.com/reportEmbed?reportId=…" required><div><button class="btn btn-primary">Salvar e visualizar Power BI</button>${config.reportUrl ? '<button type="button" class="btn" data-dash-disconnect>Desconectar relatório</button>' : ""}<button type="button" class="btn" data-dash-connect>Fechar</button></div><p class="dash-note">Os filtros do relatório são ajustados dentro do Power BI. As planilhas importadas aqui não são enviadas automaticamente para ele.</p><p id="dash-powerbi-error" role="alert"></p></form></section>`;
  }
  function engine() {
    return `<div class="dash-engine" aria-label="Origem do dashboard">${config.reportUrl ? `<button class="btn ${config.reportView === "local" ? "active" : ""}" data-dash-engine="local" aria-pressed="${config.reportView === "local"}">Planilhas importadas</button><button class="btn ${config.reportView === "powerbi" ? "active" : ""}" data-dash-engine="powerbi" aria-pressed="${config.reportView === "powerbi"}">Microsoft Power BI</button>` : ""}<button class="btn" data-dash-connect aria-expanded="${state.connectOpen}">${config.reportUrl ? "Alterar relatório Power BI" : "Conectar Microsoft Power BI"}</button></div>${connection()}`;
  }
  function page() {
    if (config.reportView !== "powerbi" || !config.reportUrl) return localPage().replace("</header>", "</header>" + engine());
    return `<section id="interactive-dashboard" class="interactive-dashboard" aria-label="Dashboard interativo"><header class="dash-head"><div><span class="eyebrow">POWER BI PAINEL COMPLETO / MICHELLE CÂNDIDO</span><h1>Dashboard</h1><p>Microsoft Power BI · relatório incorporado</p></div><div class="dash-actions"><button class="btn btn-primary" data-dash-fullscreen aria-pressed="${state.expanded}">${icon(state.expanded ? "close" : "expand")} ${state.expanded ? "Sair de tela cheia" : "Tela cheia"}</button></div></header>${engine()}<div class="dash-native-toolbar"><span>Use os filtros e as páginas do próprio relatório.</span><a class="btn" href="${esc(config.reportUrl)}" target="_blank" rel="noopener noreferrer">Abrir no Power BI ${icon("expand", 16)}</a></div><div class="dash-native-report"><iframe title="Relatório Microsoft Power BI de Michelle Cândido" src="${esc(config.reportUrl)}" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="dash-note">Acesso conforme as permissões da conta no Power BI. Em telas pequenas, a disposição interna depende do layout criado no relatório.</p></section>`;
  }
  function move(id, delta) {
    const order = [...config.order], i = order.indexOf(id), next = i + delta;
    if (i < 0 || next < 0 || next >= order.length) return;
    [order[i], order[next]] = [order[next], order[i]]; update({ order });
  }
  async function expand() {
    state.expanded = true; b.getState().assistantOpen = false; b.getState().sidebar = false;
    if (config.reportView === "powerbi") fullscreenUi(); else b.render();
    try { if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); state.native = !!document.fullscreenElement; } }
    catch (_) { state.native = false; /* A tela dedicada permanece disponível em navegadores sem Fullscreen API. */ }
    document.querySelector("[data-dash-fullscreen]")?.focus({ preventScroll: true });
  }
  function collapse() {
    const native = state.native; state.expanded = false; state.native = false; state.focus = null;
    if (native && document.fullscreenElement && document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(() => {});
    if (config.reportView === "powerbi") fullscreenUi(); else b.render();
    document.querySelector("[data-dash-fullscreen]")?.focus({ preventScroll: true });
  }
  function fullscreenUi() {
    document.body.classList.toggle("dashboard-expanded", state.expanded);
    const button = document.querySelector("[data-dash-fullscreen]");
    if (button) { button.setAttribute("aria-pressed", String(state.expanded)); button.innerHTML = `${icon(state.expanded ? "close" : "expand")} ${state.expanded ? "Sair de tela cheia" : "Tela cheia"}`; }
  }
  function wire() {
    const active = b.getState().page === "dashboard";
    document.body.classList.toggle("dashboard-expanded", active && state.expanded);
    if (!active) {
      if (state.native && document.fullscreenElement) Promise.resolve(document.exitFullscreen?.()).catch(() => {});
      state.expanded = state.native = false; state.focus = null; return;
    }
    const root = document.getElementById("interactive-dashboard"); if (!root) return;
    root.querySelector("#dash-powerbi-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const url = reportUrl(document.getElementById("dash-powerbi-url").value);
      if (!url) { document.getElementById("dash-powerbi-error").textContent = "Use o link seguro de incorporação app.powerbi.com/reportEmbed com um reportId válido, sem tokens de acesso."; return; }
      state.connectOpen = false; state.focus = null; update({ reportUrl: url, reportView: "powerbi" });
    });
    const filterPanel = root.querySelector(".dash-filter-panel");
    filterPanel?.addEventListener("toggle", () => { state.filtersOpen = filterPanel.open; });
    const values = { "dash-sector": "sector", "dash-type": "type", "dash-status": "status", "dash-period": "period", "dash-chart": "chart", "dash-dimension": "dimension", "dash-zoom": "zoom" };
    Object.entries(values).forEach(([id, key]) => document.getElementById(id)?.addEventListener("change", e => {
      const patch = { [key]: key === "zoom" ? Number(e.target.value) : e.target.value };
      if (["sector", "type", "dimension"].includes(key)) { patch.member = null; patch.accountKey = null; }
      if (key === "period") patch.start = patch.end = "";
      update(patch, id);
    }));
    ["start", "end"].forEach(key => document.getElementById("dash-" + key)?.addEventListener("change", e => {
      const next = { ...config, [key]: e.target.value, period: "all" };
      if (next.start && next.end && next.start > next.end) { b.notify("O início deve vir antes do fim.", true); e.target.value = config[key]; return; }
      update({ [key]: e.target.value, period: "all" }, "dash-" + key);
    }));
    root.querySelector("#dash-search")?.addEventListener("submit", e => { e.preventDefault(); update({ query: document.getElementById("dash-query").value.trim(), member: null }, "dash-query"); });
    root.querySelectorAll("[data-dash-visible]").forEach(el => el.addEventListener("change", () => {
      const hidden = config.hidden.filter(x => x !== el.dataset.dashVisible);
      if (!el.checked) hidden.push(el.dataset.dashVisible);
      if (hidden.length === config.order.length) { el.checked = true; b.notify("Mantenha pelo menos um bloco visível."); return; }
      update({ hidden });
    }));
    root.querySelectorAll("[data-dash-metric]").forEach(el => el.addEventListener("change", () => { const metrics = config.metrics.filter(x => x !== el.dataset.dashMetric); if (el.checked) metrics.push(el.dataset.dashMetric); update({ metrics }); }));
    root.querySelectorAll("[data-dash-size]").forEach(el => el.addEventListener("change", () => update({ sizes: { ...config.sizes, [el.dataset.dashSize]: Number(el.value) } })));
    root.addEventListener("click", e => {
      const el = e.target.closest("[data-dash-connect],[data-dash-disconnect],[data-dash-engine],[data-dash-edit],[data-dash-fullscreen],[data-dash-focus],[data-dash-close-focus],[data-dash-clear],[data-dash-clear-member],[data-dash-clear-account],[data-dash-account],[data-dash-insight-type],[data-dash-move],[data-dash-status],[data-dash-sector],[data-dash-member],[data-dash-page],[data-dash-reset-layout],[data-dash-export],[data-dash-ai-insights]");
      if (!el) return;
      if (el.hasAttribute("data-dash-ai-insights")) { void b.generateAIInsights({viewRows:model().rows}); return; }
      if (el.hasAttribute("data-dash-connect")) { state.connectOpen = !state.connectOpen; b.render(); if (state.connectOpen) document.getElementById("dash-powerbi-url")?.focus({ preventScroll: true }); return; }
      if (el.hasAttribute("data-dash-disconnect")) { state.connectOpen = false; update({ reportUrl: "", reportView: "local" }); return; }
      if (el.dataset.dashEngine) { state.focus = null; update({ reportView: el.dataset.dashEngine }); return; }
      if (el.hasAttribute("data-dash-edit")) { state.editor = !state.editor; b.render(); return; }
      if (el.hasAttribute("data-dash-fullscreen")) { state.expanded ? collapse() : expand(); return; }
      if (el.dataset.dashFocus) { state.focus = el.dataset.dashFocus; b.render(); return; }
      if (el.hasAttribute("data-dash-close-focus")) { const id = state.focus; state.focus = null; b.render(); document.querySelector(`[data-dash-focus="${id}"]`)?.focus(); return; }
      if (el.hasAttribute("data-dash-clear")) { const d = defaults(); b.getState().query = ""; update({ sector: d.sector, type: d.type, status: d.status, period: d.period, start: "", end: "", query: "", member: null, accountKey: null }); return; }
      if (el.dataset.dashAccount) { state.focus = null; update({ accountKey: el.dataset.dashAccount, member: null }); return; }
      if (el.hasAttribute("data-dash-clear-account")) { update({ accountKey: null }); return; }
      if (el.dataset.dashInsightType) { state.focus = null; update({ type: el.dataset.dashInsightType, accountKey: null, member: null }); return; }
      if (el.hasAttribute("data-dash-clear-member")) { update({ member: null }); return; }
      if (el.dataset.dashMove) { const [id, delta] = el.dataset.dashMove.split(":"); move(id, Number(delta)); return; }
      if (el.dataset.dashStatus) { update({ status: config.status === el.dataset.dashStatus ? "all" : el.dataset.dashStatus }); return; }
      if (el.dataset.dashSector) { update({ sector: config.sector === el.dataset.dashSector ? "geral" : el.dataset.dashSector, member: null }); return; }
      if (el.dataset.dashMember) { update({ member: { field: config.dimension, value: el.dataset.dashMember } }); return; }
      if (el.dataset.dashPage) { state.page = Math.max(0, state.page + Number(el.dataset.dashPage)); b.render(); return; }
      if (el.hasAttribute("data-dash-reset-layout")) { const d = defaults(); update({ order: d.order, hidden: d.hidden, sizes: d.sizes, metrics: d.metrics, zoom: d.zoom }); return; }
      if (el.hasAttribute("data-dash-export")) {
        const m = model(); if (!m.rows.length) return;
        const workbook = D.workbook(window.XLSX, m.rows, m.metrics, { Setor: config.sector, Fonte: config.type, Status: config.status, Início: m.start, Fim: m.end, Busca: config.query, Gerado: new Date().toISOString() });
        window.XLSX.writeFile(workbook, "dashboard-michelle.xlsx");
      }
    });
    const reorder = (from, to) => {
      if (!config.order.includes(from) || !config.order.includes(to) || from === to) return;
      const order = window.MCMotion?.orderAfter(config.order, from, to) ||
        (() => { const list = config.order.filter(id => id !== from); list.splice(list.indexOf(to), 0, from); return list; })();
      update({ order });
      window.MCMotion?.animatePage();
      b.notify("Bloco reposicionado. Nova ordem salva.");
    };
    window.MCMotion?.bindDashboardDrag(root, reorder);
    root.querySelectorAll("[data-dash-drag]").forEach(el => el.addEventListener("dragstart", e => {
      state.drag = el.dataset.dashDrag;
      e.dataTransfer?.setData("text/plain", state.drag);
      e.dataTransfer?.setDragImage?.(el.closest("[data-dash-widget],[data-dash-editor-row]"), 30, 16);
      el.closest("[data-dash-widget],[data-dash-editor-row]")?.classList.add("mc-drag-source");
    }));
    root.querySelectorAll("[data-dash-widget],[data-dash-editor-row]").forEach(el => {
      el.addEventListener("dragover", e => { if (state.drag) { e.preventDefault(); el.classList.add("drag-target"); } });
      el.addEventListener("dragleave", () => el.classList.remove("drag-target"));
      el.addEventListener("drop", e => {
        e.preventDefault();
        const from = state.drag, to = el.dataset.dashWidget || el.dataset.dashEditorRow; state.drag = null;
        root.querySelectorAll(".drag-target,.mc-drag-source").forEach(node => node.classList.remove("drag-target", "mc-drag-source"));
        reorder(from, to);
      });
    });
    root.addEventListener("dragend", () => { state.drag = null; root.querySelectorAll(".drag-target,.mc-drag-source").forEach(el => el.classList.remove("drag-target", "mc-drag-source")); });
    const dialog = document.getElementById("dashboard-focus");
    if (dialog) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); dialog.addEventListener("cancel", e => { e.preventDefault(); state.focus = null; b.render(); }); }
  }
  window.addEventListener("keydown", e => {
    if (e.key !== "Escape" || b.getState().page !== "dashboard") return;
    if (state.focus) { e.preventDefault(); state.focus = null; b.render(); }
    else if (state.expanded) { e.preventDefault(); collapse(); }
    else if (state.connectOpen) { state.connectOpen = false; b.render(); }
    else if (state.editor) { state.editor = false; b.render(); }
  });
  document.addEventListener("fullscreenchange", () => { if (state.native && !document.fullscreenElement) collapse(); });
  window.MichelleDashboard = { page, wire, model, expand, collapse, openSector(sector) { config = { ...config, sector, type: "all", status: "all", period: "all", start: "", end: "", query: "", member: null, accountKey: null, reportView: "local" }; b.getState().query = ""; persist(); b.navigate("dashboard"); }, getConfig: () => structuredClone(config), getState: () => ({ ...state }) };
  b.render();
})();
