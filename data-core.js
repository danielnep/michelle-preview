/* Michelle: importação, cálculos e persistência. Sem dados de demonstração. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MCData = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const norm = (v) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const fields = {
    id: [
      "numero da ordem",
      "numero da os",
      "numero os",
      "nº os",
      "numero",
      "identificacao",
      "id",
    ],
    date: [
      "data de abertura da os",
      "data / hora",
      "data inicio",
      "data de abertura",
      "data abertura",
      "abertura",
      "data",
      "date",
      "inicio",
    ],
    closed: [
      "data de fechamento da os",
      "data fechamento",
      "data de fechamento",
      "fechamento",
    ],
    title: [
      "cuc",
      "motivo",
      "descricao",
      "solicitacao",
      "assunto",
      "servico",
      "tipo",
      "indicador",
    ],
    client: [
      "fantasia (razao social)",
      "razao social",
      "cliente",
      "nome do cliente",
      "condominio",
      "unidade",
      "entidade",
      "nome",
    ],
    company: ["empresa"],
    account: ["codigo da conta", "conta"],
    status: ["status da os", "status", "situacao", "andamento", "completada"],
    value: [
      "numero de eventos",
      "quantidade",
      "deslocamentos",
      "numero de deslocamentos",
      "total",
      "eventos",
      "valor",
      "volume",
    ],
    duration: ["duracao", "tempo", "minutos"],
    operator: ["operador", "usuario", "atendente"],
    direction: ["origem", "direcao"],
  };
  const labels = {
    id: "Identificador / número OS",
    date: "Data / abertura",
    closed: "Fechamento",
    title: "Descrição / indicador",
    client: "Cliente / entidade",
    company: "Empresa",
    account: "Conta",
    status: "Status / completada",
    value: "Quantidade / valor",
    duration: "Duração em minutos",
    operator: "Operador",
    direction: "Origem da ligação",
  };
  const types = {
    geral: "Registros gerais",
    ordens: "Ordens de serviço",
    deslocamentos: "Deslocamentos",
    cuc: "Motivos de CUC",
    ligacoes: "Ligações",
    indicadores: "Indicadores e valores",
  };
  function number(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let t = String(v ?? "")
      .trim()
      .replace(/\s/g, "");
    if (!t) return null;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function day(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date) {
      if (isNaN(v)) return null;
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    }
    if (typeof v === "number" && v > 20000 && v < 90000)
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000)
        .toISOString()
        .slice(0, 10);
    let t = String(v).trim(),
      m =
        t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) ||
        t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const iso =
      m[1].length === 4
        ? `${m[1]}-${m[2]}-${m[3]}`
        : `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(iso + "T12:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === iso ? iso : null;
  }
  function status(v, type) {
    const s = norm(v);
    if (!s) return "Não informado";
    if (/cancel/.test(s)) return "Cancelado";
    if (type === "ligacoes") {
      if (/^(sim|s|true|1)$/.test(s)) return "Concluído";
      if (/^(nao|n|false|0)$/.test(s)) return "Não atendido";
    }
    if (/nao atend|nao complet/.test(s)) return "Não atendido";
    if (/concl|finaliz|resolv|atendid|fechad|executad/.test(s))
      return "Concluído";
    if (/pend|aguard|abert|atras/.test(s)) return "Pendente";
    if (/andamento|execucao|iniciado/.test(s)) return "Em andamento";
    return String(v).trim();
  }
  function suggest(headers) {
    const h = Array.from(headers, norm),
      m = {};
    for (const [key, names] of Object.entries(fields)) {
      let i = -1;
      for (const n of names) { const candidate = h.indexOf(norm(n)); if (candidate >= 0) { i = candidate; break; } }
      if (i < 0)
        i = h.findIndex(
          (x) =>
            x.length < 70 &&
            names.some((n) => {
              const t = norm(n);
              return (
                t.length >= 4 && (x.startsWith(t + " ") || x.endsWith(" " + t))
              );
            }),
        );
      m[key] = i;
    }
    if (m.id >= 0 && m.id === m.value) m.id = -1;
    return m;
  }
  function durationMinutes(value) {
    const text = norm(value);
    if (!text) return null;
    if (/^\d+:\d{2}(:\d{2})?$/.test(text)) {
      const parts = text.split(":").map(Number);
      if (parts.slice(1).some(x => x >= 60)) return null;
      return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60;
    }
    const units = /([\d.,]+)\s*(dias?|d|horas?|h|minutos?|mins?|min|m|segundos?|segs?|seg|s)\b/g;
    let minutes = 0, found = false;
    const rest = text.replace(units, (_, value, unit) => {
      const amount = number(value); if (amount == null || amount < 0) return _;
      minutes += amount * (/^d/.test(unit) ? 1440 : /^h/.test(unit) ? 60 : /^s/.test(unit) ? 1 / 60 : 1);
      found = true; return "";
    }).replace(/\s|\be\b/g, "");
    if (found && !rest) return minutes;
    const numeric = number(value); return numeric != null && numeric >= 0 ? numeric : null;
  }
  const rawField = (raw, names) => {
    for (const name of names) {
      const key = Object.keys(raw || {}).find(k => norm(k) === norm(name));
      if (key != null) return raw[key];
    }
    return null;
  };
  function sourceContext(row) {
    const raw = row.raw || {};
    return {
      ...row,
      dateTime: row.dateTime ?? String(rawField(raw, fields.date) ?? ""),
      closedTime: row.closedTime ?? String(rawField(raw, fields.closed) ?? ""),
      sourceStatus: row.sourceStatus ?? String(rawField(raw, fields.status) ?? ""),
      number: row.number ?? (row.type === "ligacoes" ? String(rawField(raw, ["Número"]) ?? "") : ""),
      partyName: row.partyName ?? (row.type === "ligacoes" ? String(rawField(raw, ["Nome"]) ?? "") : ""),
    };
  }
  function detect(grid, context = {}) {
    let best = { headerRow: 0, score: 0, type: "geral", mapping: {} };
    grid.slice(0, 50).forEach((row, i) => {
      const m = suggest(row),
        numeric = row.filter((v) => number(v) != null && v !== "").length,
        score = Object.values(m).filter((x) => x >= 0).length - numeric * 2;
      if (score > best.score) {
        const text = row.map(norm).join(" | "),
          type =
            m.id >= 0 && /numero da os|numero os|ordem de servico/.test(text)
              ? "ordens"
              : /desloc/.test(text)
                ? "deslocamentos"
                : /(^|[ |])cuc([ |]|$)/.test(text)
                  ? "cuc"
                  : /completada|origem|operador/.test(text)
                    ? "ligacoes"
                    : /indicador/.test(text)
                      ? "indicadores"
                      : "geral";
        best = { headerRow: i, score, type, mapping: m };
      }
    });

    // O nome do arquivo e da aba complementa cabeçalhos incompletos,
    // mas nunca substitui uma classificação específica já sustentada pelas colunas.
    const name = norm([context.filename || "", context.sheet || ""].join(" "));
    const hinted = /deslocament|visitas? tecnic/.test(name) ? "deslocamentos"
      : /\bcuc\b|motivos? de (alarme|cuc)/.test(name) ? "cuc"
      : /ligac|telefonia|telefonemas|chamadas/.test(name) ? "ligacoes"
      : /ordem de servico|ordens de servico|relatorio.*\bos\b|\bos\b.*relatorio/.test(name) ? "ordens"
      : /indicadores|\bkpi\b/.test(name) ? "indicadores" : null;
    const fromHeaders = best.type !== "geral";
    if (!fromHeaders && hinted) best.type = hinted;
    best.confidence = fromHeaders && best.score >= 4 ? "Alta"
      : fromHeaders ? "Moderada"
      : hinted && best.score >= 2 ? "Moderada"
      : hinted ? "Sugerida pelo arquivo"
      : "Revisão recomendada";
    best.reason = fromHeaders
      ? "Tipo reconhecido pelos cabeçalhos da planilha."
      : hinted
        ? "Cabeçalhos genéricos; tipo sugerido pelo nome do arquivo ou da aba. Confira antes de confirmar."
        : "Tipo não identificado com segurança; confira as colunas antes de confirmar.";
    best.filenameHint = hinted;
    const Analyzer = typeof window !== "undefined" ? window.MCAnalysis : null;
    if (Analyzer) {
      const profile = Analyzer.profile(grid, context, best);
      best.profile = profile;
      best.label = Analyzer.specs[best.type]?.label || types[best.type];
      best.metricLabel = Analyzer.specs[best.type]?.metric || types[best.type];
      if (profile.conflict) {
        best.conflict = true;
        best.confidence = "Revisão obrigatória";
        best.reason = profile.explanation + " Prevalece a classificação dos cabeçalhos até a revisão.";
      }
      if (best.type === "geral" && profile.preferredType !== "geral") {
        best.type = profile.preferredType;
        best.label = Analyzer.specs[best.type]?.label;
        best.metricLabel = Analyzer.specs[best.type]?.metric;
      }
    }
    return best;
  }
  function cell(row, m, k) {
    return m[k] >= 0 ? row[m[k]] : null;
  }
  function parse(grid, opts) {
    const header = Array.from(grid[opts.headerRow] || []),
      mapping = opts.mapping || suggest(header),
      rows = [],
      errors = [],
      skipped = [];
    const type = opts.type || "geral";
    grid.slice(opts.headerRow + 1).forEach((row, i) => {
      const line = opts.headerRow + i + 2;
      if (!row.some((v) => v != null && String(v).trim())) return;
      if (
        row.some((v) => /^total( geral)?$|^subtotal$/i.test(String(v).trim()))
      ) {
        skipped.push(line);
        return;
      }
      const raw = Object.fromEntries(
          header.map((h, j) => [
            String(h || "Coluna " + (j + 1)),
            row[j] ?? "",
          ]),
        ),
        rawDate = cell(row, mapping, "date"),
        date = day(rawDate),
        rawValue = cell(row, mapping, "value");
      if (rawDate != null && rawDate !== "" && !date) {
        errors.push({ line, message: "Data inválida: " + String(rawDate) });
        return;
      }
      const aggregated = ["cuc", "deslocamentos", "indicadores"].includes(type),
        value = aggregated ? number(rawValue) : 1;
      if (aggregated && (value == null || value < 0)) {
        errors.push({
          line,
          message: "Quantidade / valor ausente ou inválido.",
        });
        return;
      }
      const rawId = cell(row, mapping, "id"),
        company = String(cell(row, mapping, "company") ?? ""),
        account = String(cell(row, mapping, "account") ?? "");
      if (type === "ordens" && (rawId == null || rawId === "")) {
        errors.push({ line, message: "Número da ordem de serviço ausente." });
        return;
      }
      const duration = durationMinutes(cell(row, mapping, "duration"));
      rows.push(sourceContext({
        id: String(rawId ?? `${opts.hash?.slice(0, 8) || "LINHA"}-${line}`),
        sector: opts.sector,
        type,
        date,
        dateTime: rawDate == null ? "" : String(rawDate),
        closedTime: String(cell(row, mapping, "closed") ?? ""),
        periodStart: date || day(opts.periodStart),
        periodEnd: date || day(opts.periodEnd),
        closed: day(cell(row, mapping, "closed")),
        title: String(cell(row, mapping, "title") ?? types[type]),
        client: String(cell(row, mapping, "client") ?? account ?? ""),
        company,
        account,
        status: status(cell(row, mapping, "status"), type),
        value,
        duration,
        operator: String(cell(row, mapping, "operator") ?? ""),
        direction: String(cell(row, mapping, "direction") ?? ""),
        source: opts.filename,
        line,
        raw,
        interpretationVersion: 2,
      }));
    });
    return { rows, errors, skipped, mapping };
  }
  function inspect(lots, lot) {
    const duplicate = lots.find(
      (l) =>
        l.hash === lot.hash &&
        l.sheet === lot.sheet &&
        l.sector === lot.sector &&
        l.type === lot.type,
    );
    const overlap = lots.filter(
      (l) =>
        !l.supersededBy &&
        !l.archived && !l.deleted &&
        l.type === lot.type &&
        l.sector === lot.sector &&
        l.periodStart &&
        lot.periodStart &&
        l.periodStart <= lot.periodEnd &&
        lot.periodStart <= l.periodEnd,
    );
    return { duplicate, overlap };
  }
  function ingest(lots, lot, policy = "reject") {
    if (!lot.rows.length) throw Error("Não há linhas válidas para importar.");
    if ((lot.periodStart && !day(lot.periodStart)) || (lot.periodEnd && !day(lot.periodEnd)) || (lot.periodStart && lot.periodEnd && lot.periodStart > lot.periodEnd))
      throw Error("O período opcional informado é inválido.");
    const check = inspect(lots, lot);
    if (check.duplicate) return { lots, duplicate: true };
    if (check.overlap.length && lot.type !== "ordens" && policy === "reject")
      throw Error(
        "Já existem dados nesse período. Confira e escolha atualizar ou acumular.",
      );
    if (
      policy === "replace" &&
      check.overlap.some(
        (l) =>
          l.periodStart !== lot.periodStart || l.periodEnd !== lot.periodEnd,
      )
    )
      throw Error("Atualização exige o mesmo período completo.");
    const next = lots.map((l) =>
      policy === "replace" && check.overlap.some((o) => o.id === l.id)
        ? { ...l, supersededBy: lot.id }
        : l,
    );
    return { lots: [...next, { ...lot, policy }], duplicate: false };
  }
  function allRows(lots) {
    const result = [],
      orders = new Map();
    for (const l of lots) {
      if (l.supersededBy || l.archived || l.deleted) continue;
      for (const r of l.rows || []) {
        const row = sourceContext({ ...r, lotId: l.id });
        if (!r.interpretationVersion && r.raw) {
          const client = rawField(r.raw, ["Cliente"]), name = rawField(r.raw, ["Nome"]);
          if (r.type === "ligacoes" && client != null && String(r.client || "") === String(name || "")) row.client = String(client);
          if (r.duration == null) row.duration = durationMinutes(rawField(r.raw, ["Duração", "Tempo de execução"]));
          const quantity = rawField(r.raw, ["Número de Eventos"]);
          if (r.type === "cuc" && quantity != null && r.id === String(quantity)) row.id = `${l.hash?.slice(0, 8) || l.id}-${r.line}`;
        }
        if (r.type === "ordens")
          orders.set([r.sector, r.company, r.id].join("|"), row);
        else result.push(row);
      }
    }
    return [...result, ...orders.values()];
  }
  function select(
    rows,
    { sector = "geral", start = "", end = "", query = "" } = {},
  ) {
    const q = norm(query);
    return rows.filter(
      (r) =>
        (sector === "geral" || r.sector === sector) &&
        (!q ||
          norm(
            [r.id, r.title, r.client, r.company, r.account, r.operator, r.direction, r.number, r.partyName, r.sourceStatus].join(
              " ",
            ),
          ).includes(q)) &&
        (!(start || end) ||
          (r.date
            ? (!start || r.date >= start) && (!end || r.date <= end)
            : r.periodStart &&
              r.periodEnd &&
              (!start || r.periodStart >= start) &&
              (!end || r.periodEnd <= end))),
    );
  }
  const weight = (r) =>
    ["cuc", "deslocamentos"].includes(r.type) ? Number(r.value) || 0 : 1;
  function counts(rows) {
    const sum = (s) =>
        rows.filter((r) => r.status === s).reduce((n, r) => n + weight(r), 0),
      known = rows
        .filter((r) =>
          [
            "Concluído",
            "Em andamento",
            "Pendente",
            "Cancelado",
            "Não atendido",
          ].includes(r.status),
        )
        .reduce((n, r) => n + weight(r), 0);
    return {
      total: rows.length,
      volume: rows.reduce((n, r) => n + weight(r), 0),
      done: sum("Concluído"),
      open: sum("Em andamento"),
      pending: sum("Pendente"),
      cancelled: sum("Cancelado"),
      unanswered: sum("Não atendido"),
      known,
      imported: rows.length,
    };
  }
  function stats(rows) {
    const c = counts(rows),
      byType = {};
    for (const [k, label] of Object.entries(types)) {
      const arr = rows.filter((r) => r.type === k);
      if (arr.length)
        byType[k] = {
          label,
          rows: arr.length,
          value: arr.reduce(
            (n, r) =>
              n +
              (["cuc", "deslocamentos"].includes(k)
                ? Number(r.value) || 0
                : 1),
            0,
          ),
        };
    }
    const timed = rows.filter(
      (r) => r.duration != null && Number.isFinite(r.duration),
    );
    const mixed = Object.keys(byType).length > 1;
    return {
      ...c,
      byType,
      rate: c.known && !mixed ? (100 * c.done) / c.known : null,
      avg: timed.length && !mixed
        ? timed.reduce((n, r) => n + r.duration, 0) / timed.length
        : null,
      timed: timed.length,
    };
  }
  function series(rows) {
    const d = new Map();
    for (const r of rows) {
      if (!r.date) continue;
      d.set(r.date, (d.get(r.date) || 0) + weight(r));
    }
    return [...d]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({
        label: label.slice(8, 10) + "/" + label.slice(5, 7),
        date: label,
        value,
      }));
  }
  function metricOptions(rows) {
    const s = stats(rows),
      out = [{ id: "records", label: "Linhas importadas", value: s.total }];
    const mixed = Object.keys(s.byType).length > 1, calls = !mixed && s.byType.ligacoes;
    for (const [id, t] of Object.entries(s.byType))
      out.push({ id, label: id === "cuc" ? "Eventos CUC" : id === "indicadores" ? "Linhas de indicadores" : t.label, value: id === "indicadores" ? t.rows : t.value });
    if (s.known && !mixed)
      out.push(
        { id: "done", label: calls ? "Registros completados" : "Concluídos", value: s.done },
        { id: "pending", label: "Em aberto", value: s.pending + s.open },
        { id: "rate", label: calls ? "Registros completados (%)" : "Conclusão (%)", value: s.rate },
      );
    if (s.timed && !mixed)
      out.push({ id: "duration", label: "Duração média (min)", value: s.avg });
    return out;
  }
  function insights(
    rows,
    {
      goals = {},
      sector = "geral",
      all = [],
      start = "",
      end = "",
      detailed = false,
    } = {},
  ) {
    if (!rows.length)
      return [
        {
          ico: "files",
          title: "Sem dados neste recorte",
          text: "Importe uma planilha ou ajuste os filtros para analisar a operação.",
        },
      ];
    const s = stats(rows),
      out = [
        {
          ico: "files",
          title: `${rows.length.toLocaleString("pt-BR")} linhas de fontes reais`,
          text: Object.values(s.byType)
            .map((t) => `${t.label}: ${t.value.toLocaleString("pt-BR")}`)
            .join(" · "),
        },
      ];
    if (s.known && Object.keys(s.byType).length === 1) {
      out.push({
        ico: "target",
        title: `Conclusão: ${s.rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
        text: `${s.done} concluídos entre ${s.known} registros com status reconhecido. ${s.pending + s.open} em aberto; ${s.cancelled} cancelados; ${s.unanswered} não atendidos.`,
      });
      const targets =
        sector === "geral" ? [...new Set(rows.map((r) => r.sector))] : [sector];
      for (const id of targets) {
        const target = number(goals[id]),
          t = stats(rows.filter((r) => r.sector === id));
        if (target != null && t.rate != null)
          out.push({
            ico: "target",
            title: `Meta de ${id.toUpperCase()}: ${target}%`,
            text: `Resultado ${t.rate.toFixed(1)}% · desvio ${(t.rate - target).toFixed(1)} pontos percentuais. ${t.rate < target ? "Priorize revisar as demandas em aberto desse setor." : "A meta de conclusão foi atingida nesse recorte."}`,
          });
      }
    }
    const unknown = rows.filter((r) => !r.date).length;
    if (unknown)
      out.push({
        ico: "clock",
        title: `${unknown} linhas sem data individual`,
        text: "Totais sem período informado aparecem no histórico completo. Quando a competência é informada, participam apenas de recortes que abrangem o intervalo inteiro.",
      });
    const amounts = new Map();
    rows.forEach((r) =>
      amounts.set(r.title, (amounts.get(r.title) || 0) + weight(r)),
    );
    const top = Object.keys(s.byType).length === 1 ? [...amounts].sort((a, b) => b[1] - a[1])[0] : null;
    if (top)
      out.push({
        ico: "chart",
        title: `Maior volume: ${top[0]}`,
        text: `${top[1].toLocaleString("pt-BR")} ${["cuc", "deslocamentos"].includes(rows.find((r) => r.title === top[0])?.type) ? "eventos / deslocamentos" : "registros"}. Volume não determina sozinho qualidade ou gravidade.`,
      });
    if (start && end && all.length) {
      const days =
          Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1,
        prevEnd = new Date(Date.parse(start) - 86400000)
          .toISOString()
          .slice(0, 10),
        prevStart = new Date(Date.parse(start) - days * 86400000)
          .toISOString()
          .slice(0, 10);
      const previous = select(all, { sector, start: prevStart, end: prevEnd });
      const dated = rows.filter((r) => r.date),
        prev = previous.filter((r) => r.date),
        typesNow = [...new Set(dated.map((r) => r.type))];
      for (const type of typesNow) {
        const now = dated.filter((r) => r.type === type),
          old = prev.filter((r) => r.type === type);
        const coverage = (arr, a, z) =>
          arr.length &&
          arr.some((r) => r.date === a) &&
          arr.some((r) => r.date === z);
        if (coverage(now, start, end) && coverage(old, prevStart, prevEnd)) {
          const a = now.reduce((n, r) => n + weight(r), 0),
            b = old.reduce((n, r) => n + weight(r), 0);
          out.push({
            ico: "chart",
            title: `Comparação: ${types[type]}`,
            text: `${a} no período atual e ${b} no período anterior de ${days} dias. ${b ? "Variação de " + (((a - b) / b) * 100).toFixed(1) + "%." : "Sem percentual: base anterior igual a zero."} Comparação limitada à cobertura observada nas datas de início e fim.`,
          });
        } else if (detailed)
          out.push({
            ico: "clock",
            title: `Comparação indisponível: ${types[type]}`,
            text: "As fontes não comprovam cobertura equivalente entre os dois períodos. Não é possível afirmar tendência.",
          });
      }
    }
    if (detailed && !s.known)
      out.push({
        ico: "alert",
        title: "Status insuficientes para conclusão ou SLA",
        text: "A fonte disponível não informa status reconhecidos. Tempos, eficiência e metas não são presumidos.",
      });
    return out;
  }
  function workbook(XLSX, rows, metrics, meta = {}) {
    const wb = XLSX.utils.book_new(),
      details = rows.map((r) => ({
        ID: r.id,
        Setor: r.sector,
        Tipo: types[r.type] || r.type,
        Data: r.date || "",
        "Data / hora da fonte": r.dateTime || "",
        "Fechamento da fonte": r.closedTime || "",
        "Período inicial": r.periodStart || "",
        "Período final": r.periodEnd || "",
        Descrição: r.title,
        Cliente: r.client,
        Empresa: r.company,
        Conta: r.account,
        Status: r.status,
        "Status original": r.sourceStatus || "",
        "Número da ligação": r.number || "",
        "Nome da ligação": r.partyName || "",
        "Origem da ligação": r.direction || "",
        "Usuário / operador": r.operator || "",
        "Quantidade / valor": r.value,
        "Duração (min)": r.duration ?? "",
        Arquivo: r.source,
        Linha: r.line,
      }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(details),
      "Dados",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        metrics.map((m) => ({ Indicador: m.label, Valor: m.value })),
      ),
      "Indicadores",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        Object.entries(meta).map(([k, v]) => ({
          Campo: k,
          Valor: String(v ?? ""),
        })),
      ),
      "Recorte",
    );
    return wb;
  }
  return {
    norm,
    fields,
    labels,
    types,
    number,
    day,
    status,
    suggest,
    durationMinutes,
    detect,
    parse,
    inspect,
    ingest,
    allRows,
    select,
    counts,
    stats,
    series,
    weight,
    metricOptions,
    insights,
    workbook,
  };
});

(function (root) {
  "use strict";
  let opening;
  const stores = ["lots", "presentations", "files", "meta"];
  function open() {
    if (!root.indexedDB)
      return Promise.reject(
        Error(
          "Este navegador não permite salvar dados. Abra o aplicativo em um navegador com armazenamento habilitado.",
        ),
      );
    return (
      opening ||
      (opening = new Promise((resolve, reject) => {
        const req = root.indexedDB.open("horizon-michelle", 1);
        req.onupgradeneeded = () =>
          stores.forEach((s) =>
            req.result.createObjectStore(s, { keyPath: "id" }),
          );
        req.onsuccess = () => {
          req.result.onversionchange = () => {
            req.result.close();
            opening = null;
          };
          resolve(req.result);
        };
        req.onerror = () => {
          opening = null;
          reject(req.error);
        };
        req.onblocked = () =>
          reject(
            Error(
              "Feche outras abas antigas do painel para liberar o armazenamento.",
            ),
          );
      }))
    );
  }
  async function read(store, id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const q = db.transaction(store).objectStore(store).get(id);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  }
  async function all(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const q = db.transaction(store).objectStore(store).getAll();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  }
  async function batch(ops) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [...new Set(ops.map((o) => o.store))],
        "readwrite",
      );
      for (const o of ops) {
        const s = tx.objectStore(o.store);
        if (o.remove) s.delete(o.id);
        else s.put(o.value);
      }
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(
          tx.error ||
            Error(
              "Não foi possível salvar as alterações. Verifique o espaço disponível.",
            ),
        );
    });
  }
  const put = (store, value) => batch([{ store, value }]),
    remove = (store, id) => batch([{ store, id, remove: true }]);
  root.MCStore = { open, read, all, batch, put, remove };
})(typeof window !== "undefined" ? window : globalThis);
