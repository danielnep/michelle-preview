/* Inteligência analítica local: regras auditáveis, sem envio de planilhas. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data-core.js"));
  else root.MCIntelligence = factory(root.MCData);
})(typeof window !== "undefined" ? window : globalThis, function (D) {
  "use strict";
  const fmt = v => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const norm = v => D.norm(v).replace(/\s+/g, " ");
  const semantics = {
    ligacoes: { unit: "registros de ligação", meaning: "Cada linha é um registro da telefonia. Cliente identifica a conta; Nome descreve o nome associado ao número ou ramal.", limit: "Número é telefone ou ramal, não um ID único de chamada. Ofertas simultâneas a usuários podem gerar várias linhas. Completada não mede espera, SLA ou eficiência do atendente." },
    ordens: { unit: "ordens de serviço", meaning: "OS são identificadas por empresa e número. Conta associa o cliente; abertura, fechamento, solicitação e status descrevem o atendimento.", limit: "Tempo de execução é uma medida própria da fonte. O intervalo abertura–fechamento é tempo de calendário e não substitui execução nem SLA." },
    deslocamentos: { unit: "deslocamentos", meaning: "Cada linha agrupa a quantidade de deslocamentos de uma empresa e conta. O total soma Deslocamentos, não a quantidade de linhas.", limit: "Sem datas individuais, a competência precisa ser informada. Uma visita não é necessariamente uma OS ou um problema diferente." },
    cuc: { unit: "eventos CUC", meaning: "Cada linha é uma categoria CUC; Número de Eventos é a quantidade. O total soma eventos, preservando o código e a descrição.", limit: "Categorias incluem alarmes, restaurações, testes e comunicações automáticas. Volume não identifica sozinho falha, gravidade ou causa. Sem conta, não há vínculo com cliente." },
    indicadores: { unit: "linhas de indicadores", meaning: "Cada linha representa um indicador e seu valor. Indicadores com unidades distintas permanecem separados.", limit: "Sem uma unidade e definição comum, valores não são somados em um total de desempenho." },
    geral: { unit: "registros", meaning: "Leitura das colunas associadas na importação, com os campos originais preservados.", limit: "Confirme o tipo de fonte e o significado das colunas antes de comparar indicadores." },
  };
  function key(row) {
    const company = norm(row.company), account = String(row.account || "").trim();
    return company && account ? JSON.stringify([company, account]) : null;
  }
  const interval = r => ({ start: r.date || r.periodStart, end: r.date || r.periodEnd });
  const validPeriod = p => !!(D.day(p.start) && D.day(p.end) && p.start <= p.end);
  const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;
  function crossOrdersTrips(rows) {
    const orders = rows.filter(r => r.type === "ordens"), trips = rows.filter(r => r.type === "deslocamentos");
    const out = { accounts: [], orders: orders.length, trips: trips.reduce((n, r) => n + (Number(r.value) || 0), 0), matchedOrders: 0, matchedTrips: 0, matchedAccounts: 0, temporalAccounts: 0, identityAccounts: 0, missingKeys: 0, missingPeriods: 0, ambiguousPeriods: 0, unmatchedAccounts: 0, excludedOrders: 0, excludedTrips: 0, available: !!(orders.length && trips.length) };
    if (!out.available) { out.reason = "O cruzamento exige OS e deslocamentos no recorte. Selecione todas as fontes e setores, com a competência completa."; return out; }
    const byAccount = new Map(), ordersByAccount = new Map();
    orders.forEach(r => {
      const k = key(r); if (!k) { out.missingKeys++; return; }
      if (!r.date) out.missingPeriods++;
      if (!ordersByAccount.has(k)) ordersByAccount.set(k, []);
      ordersByAccount.get(k).push(r);
    });
    trips.forEach(r => {
      const k = key(r), period = interval(r);
      if (!k) { out.missingKeys++; return; }
      if (!validPeriod(period)) out.missingPeriods++;
      if (!byAccount.has(k)) byAccount.set(k, []);
      byAccount.get(k).push({ row: r, ...period });
    });
    for (const [k, group] of byAccount) {
      const periods = new Map();
      group.forEach(r => {
        const p = JSON.stringify([r.start, r.end]);
        if (!periods.has(p)) periods.set(p, { start: r.start, end: r.end, rows: [], lots: new Set() });
        periods.get(p).rows.push(r.row); periods.get(p).lots.add(r.row.lotId || "same-source");
      });
      const slices = [...periods.values()];
      // Totais sobrepostos de lotes distintos não podem ser acumulados com segurança.
      const periodConfirmed = slices.every(validPeriod);
      const ambiguous = (!periodConfirmed && slices.length > 1) || slices.some((p, i) => p.lots.size > 1 || slices.some((q, j) => j !== i && validPeriod(p) && validPeriod(q) && overlaps(p, q)));
      if (ambiguous) { out.ambiguousPeriods++; continue; }
      const matching = (ordersByAccount.get(k) || []).filter(r => !periodConfirmed || (r.date && slices.some(p => r.date >= p.start && r.date <= p.end)));
      if (!matching.length) { out.unmatchedAccounts++; continue; }
      const first = group[0].row, quantity = group.reduce((n, p) => n + (Number(p.row.value) || 0), 0);
      const pending = matching.filter(r => ["Pendente", "Em andamento"].includes(r.status)).length;
      const clients = [...new Set(group.map(p => String(p.row.client || "").trim()).filter(Boolean))];
      out.accounts.push({ company: first.company, account: first.account, client: clients.join("; "), clients, trips: quantity, orders: matching.length, pending, periodConfirmed, closed: matching.filter(r => r.status === "Concluído").length, periods: slices.map(p => ({ start: p.start, end: p.end })), orderRefs: matching.slice(0, 5).map(reference), tripRefs: group.slice(0, 5).map(p => reference(p.row)) });
      if (periodConfirmed) out.temporalAccounts++; else out.identityAccounts++;
      out.matchedOrders += matching.length; out.matchedTrips += quantity;
    }
    out.accounts.sort((a, b) => b.pending - a.pending || b.trips - a.trips);
    out.matchedAccounts = out.accounts.length;
    out.excludedOrders = out.orders - out.matchedOrders;
    out.excludedTrips = out.trips - out.matchedTrips;
    out.reason = out.accounts.length ? "Correspondência por empresa + conta e abertura da OS dentro da competência de deslocamentos. Totais são agregados antes de cruzar; não são multiplicados pelo número de OS. Nomes diferentes sob uma conta ficam agrupados; o vínculo não distingue locais nem comprova que uma OS gerou uma visita." : "Nenhuma correspondência segura por empresa, conta e período. Confira a competência e a cobertura dos arquivos.";
    if (out.identityAccounts) out.reason = `${fmt(out.identityAccounts)} contas foram relacionadas somente por empresa + conta porque o período não está informado. Os valores são exibidos lado a lado, sem afirmar coincidência de datas, taxa, conversão ou causa. ${fmt(out.temporalAccounts)} contas possuem competência compatível. Nomes de locais sob a mesma conta ficam agrupados.`;
    return out;
  }
  function reference(row) { return { source: row.source || "Planilha importada", line: row.line, id: row.id, lotId: row.lotId }; }
  function timestamp(value) {
    const t = String(value || "").trim();
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/) || t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m || !D.day(t)) return null;
    const iso = m[1].length === 4, y = +(iso ? m[1] : m[3]), mo = +m[2], d = +(iso ? m[3] : m[1]);
    if (+m[4] > 23 || +m[5] > 59 || +m[6] > 59) return null;
    return Date.UTC(y, mo - 1, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  function readings(rows) {
    return Object.keys(D.types).flatMap(type => {
      const source = rows.filter(r => r.type === type); if (!source.length) return [];
      const s = semantics[type], fields = new Map();
      for (const r of source) for (const [field, value] of Object.entries(r.raw || {})) {
        if (!fields.has(field)) fields.set(field, 0);
        if (value != null && String(value).trim()) fields.set(field, fields.get(field) + 1);
      }
      return [{ type, label: D.types[type], ...s, rows: source.length, total: ["cuc", "deslocamentos"].includes(type) ? source.reduce((n, r) => n + (Number(r.value) || 0), 0) : source.length, dated: source.filter(r => r.date).length, timed: source.filter(r => r.duration != null).length, fields: [...fields].map(([name, populated]) => ({ name, populated, purpose: fieldPurpose(type, name) })) }];
    });
  }
  function fieldPurpose(type, name) {
    const n = norm(name);
    if (type === "ligacoes") {
      const special = { nome: "Nome associado ao número/ramal; preservado separado do cliente.", numero: "Telefone/ramal; não identifica uma chamada única.", cliente: "Cliente/conta usado no filtro e no ranking; não é substituído por Nome.", tipo: "Categoria da ligação, como Manual ou Evento; não substitui a coluna Manual.", manual: "Marcador original Manual, preservado sem equiparar ao Tipo.", "moni ura": "Marcador de URA original.", "resultado ligacao ura": "Resultado de URA original; vazio permanece vazio.", contato: "Contato original; vazio permanece vazio.", observacao: "Observação original, disponível no detalhamento." };
      if (special[n]) return special[n];
    }
    if (type === "cuc" && n === "cuc") return "Código + descrição da categoria; usado no ranking de eventos.";
    const mapping = D.suggest([name]);
    const role = Object.keys(mapping).find(k => mapping[k] === 0);
    return ({ id: "Identificação da OS na empresa; não é a quantidade.", date: "Data individual e evolução temporal; horário original preservado.", closed: "Fechamento original; usado com a abertura para medir calendário.", title: "Descrição/categoria usada nos rankings e filtros.", client: "Nome do cliente; conta e empresa são preservadas separadamente.", company: "Parte da chave de cruzamento; contas de empresas distintas não são misturadas.", account: "Código da conta, incluindo zeros à esquerda; cruzamento exige empresa.", status: "Status original e categoria normalizada; conclusão não representa SLA.", value: "Quantidade da fonte, somada apenas para eventos CUC e deslocamentos.", duration: "Duração informada, convertida para minutos respeitando segundos e horas.", operator: "Usuário/operador da fonte; volume não mede desempenho individual.", direction: "Origem recebida/realizada usada nos filtros de telefonia." })[role] || "Campo original preservado no detalhamento do registro.";
  }
  function analyze(rows) {
    const profiles = readings(rows), cross = crossOrdersTrips(rows), cards = [];
    const add = (type, title, text, basis, caveat, evidence = []) => cards.push({ type, ico: "insight", title, text, basis, caveat, evidence: evidence.slice(0, 3).map(reference) });
    for (const p of profiles) {
      const r = rows.filter(x => x.type === p.type);
      if (p.type === "ligacoes") {
        const known = r.filter(x => ["Concluído", "Não atendido", "Cancelado"].includes(x.status)), done = known.filter(x => x.status === "Concluído"), missed = known.filter(x => x.status === "Não atendido");
        if (known.length) add(p.type, `${fmt(100 * done.length / known.length)}% dos registros completados`, `${fmt(done.length)} completados e ${fmt(missed.length)} não atendidos no recorte. Revise distribuição de origem e horários antes de avaliar a operação.`, `${fmt(done.length)} ÷ ${fmt(known.length)} registros com status reconhecido × 100.`, p.limit, missed);
        const timed = done.filter(x => x.duration != null);
        if (timed.length) add(p.type, "Duração dos registros completados", `${fmt(timed.reduce((n, x) => n + x.duration, 0) / timed.length * 60)} segundos de média nas ligações marcadas como completadas.`, `${fmt(timed.length)} de ${fmt(done.length)} registros completados possuem duração; zeros informados são mantidos.`, "É duração da fonte, não tempo de espera na fila ou SLA.", timed);
        const hours = new Map(), candidates = new Map();
        r.forEach(x => {
          const hour = String(x.dateTime || "").match(/[T ](\d{1,2}):\d{2}/)?.[1];
          if (hour != null && +hour < 24) { const h = String(+hour).padStart(2, "0"); hours.set(h, (hours.get(h) || 0) + 1); }
          if (x.number && x.dateTime) { const k = JSON.stringify([x.dateTime, x.number, x.direction, x.title]); candidates.set(k, (candidates.get(k) || 0) + 1); }
        });
        const peak = [...hours].sort((a, b) => b[1] - a[1])[0], withHour = [...hours.values()].reduce((n, x) => n + x, 0);
        if (peak) add(p.type, `Maior volume entre ${peak[0]}h e ${+peak[0] + 1}h`, `${fmt(peak[1])} registros nesse horário, somando as datas do recorte.`, `${fmt(peak[1])} de ${fmt(withHour)} registros com horário legível.`, "Frequência de registros não mede espera. A fonte não fornece um ID único de chamada.");
        const repeated = [...candidates.values()].filter(n => n > 1).length, missing = r.filter(x => !String(x.client || "").trim()).length;
        if (repeated || missing) add(p.type, "Limites da identificação de ligações", `${fmt(missing)} registros sem cliente. ${fmt(repeated)} grupos repetem horário, número, origem e tipo.`, "Agrupamento para conferência; nenhuma linha foi excluída por essa regra.", "Podem ser ofertas simultâneas ou reprocessamentos. Sem um identificador do sistema de telefonia, não são classificados automaticamente como duplicatas.");
      } else if (p.type === "ordens") {
        const open = r.filter(x => ["Pendente", "Em andamento"].includes(x.status)), oldest = [...open].filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date))[0];
        add(p.type, `${fmt(open.length)} OS em aberto`, oldest ? `A abertura mais antiga do recorte é ${oldest.date.split("-").reverse().join("/")}. Confira solicitação e conta para priorizar a revisão.` : "Consulte o status original e a solicitação no detalhamento.", `${fmt(open.length)} de ${fmt(r.length)} OS; status pendente ou em andamento.`, "Status representa a posição da extração. Sem prazo contratado, não se classifica atraso ou SLA.", open);
        const elapsed = r.filter(x => x.status === "Concluído").flatMap(x => {
          const a = timestamp(x.dateTime), z = timestamp(x.closedTime); return a != null && z != null && z >= a ? [(z - a) / 3600000] : [];
        });
        if (elapsed.length) add(p.type, "Intervalo de calendário das OS fechadas", `${fmt(elapsed.reduce((n, x) => n + x, 0) / elapsed.length)} horas entre abertura e fechamento, em média.`, `${fmt(elapsed.length)} OS fechadas com os dois horários válidos.`, "Inclui noites, fins de semana e esperas. Não é tempo de execução nem SLA.");
        if (p.timed < r.length) add(p.type, "Cobertura do tempo de execução", `${fmt(p.timed)} de ${fmt(r.length)} OS informam duração. A ausência permanece visível e não vira zero.`, `${fmt(r.length - p.timed)} registros sem duração legível.`, "Não extrapole a média dessa amostra para todas as OS.");
      } else if (["cuc", "deslocamentos"].includes(p.type)) {
        const groups = new Map();
        r.forEach(x => { const k = p.type === "cuc" ? x.title : key(x) || JSON.stringify([x.company, x.account, x.client]); if (!groups.has(k)) groups.set(k, { row: x, value: 0, clients: new Set() }); groups.get(k).value += Number(x.value) || 0; groups.get(k).clients.add(String(x.client || "").trim()); });
        const top = [...groups.values()].sort((a, b) => b.value - a.value), first = top[0], top3 = top.slice(0, 3).reduce((n, x) => n + x.value, 0);
        const label = first && (first.clients.size > 1 ? `${first.row.company} / conta ${first.row.account} (${first.clients.size} descrições)` : first.row.client || first.row.title);
        if (first && p.total) add(p.type, p.type === "cuc" ? "Concentração de eventos CUC" : "Concentração de deslocamentos", `${label}: ${fmt(first.value)} ${p.unit}. Os três maiores grupos concentram ${fmt(100 * top3 / p.total)}% do total.`, `${fmt(top3)} ÷ ${fmt(p.total)} ${p.unit}; ${fmt(p.rows)} linhas agrupadas da fonte.`, p.limit, top.slice(0, 3).map(x => x.row));
      }
    }
    if (cross.matchedAccounts) {
      const review = cross.accounts.filter(a => a.pending > 0), first = review[0];
      cards.unshift({ type: "cross", ico: "insight", title: cross.identityAccounts ? `${fmt(cross.matchedAccounts)} contas presentes nas duas bases` : `${fmt(review.length)} contas com deslocamentos e OS em aberto`, text: first ? `${first.client || first.account}: ${fmt(first.trips)} deslocamentos e ${fmt(first.pending)} OS em aberto${first.periodConfirmed ? " no período correspondente" : "; período dos deslocamentos não informado"}. Use para revisar a conta.` : "As contas correspondentes não têm OS em aberto neste recorte.", basis: `${fmt(cross.matchedAccounts)} contas relacionadas; ${fmt(cross.matchedOrders)} OS e ${fmt(cross.matchedTrips)} deslocamentos.`, caveat: cross.reason, evidence: first ? [...first.orderRefs.slice(0, 2), ...first.tripRefs.slice(0, 1)] : [] });
    }
    if (!cards.length) add("geral", "Sem evidência suficiente neste recorte", "Importe dados ou ajuste os filtros para obter uma leitura com base na fonte.", `${fmt(rows.length)} linhas no recorte.`, "O sistema não gera conclusões sem registros de apoio.");
    return { profiles, cards, cross };
  }
  return { semantics, fieldPurpose, readings, analyze, crossOrdersTrips, key, timestamp };
});
