const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../data-core.js");
const I = require("../data-intelligence.js");
const order = (id, extra = {}) => ({ id, type: "ordens", company: "Empresa A", account: "0010", client: "Cliente", date: "2026-09-03", status: "Pendente", value: 1, ...extra });
const trip = (value, extra = {}) => ({ id: "t", type: "deslocamentos", company: "Empresa A", account: "0010", client: "Cliente", periodStart: "2026-09-01", periodEnd: "2026-09-30", value, ...extra });
test("leitura semântica prioriza Cliente, preserva Nome e não usa quantidade como ID", () => {
  const grid = [["Data / Hora", "Nome", "Número", "Cliente", "Duração", "Completada", "Origem", "Tipo"], ["03/09/2026 10:04:05", "Ramal da porta", "456", "0010 - Cliente", "00:00:06", "Sim", "Recebida", "Evento"]];
  const a = D.detect(grid), p = D.parse(grid, { ...a, filename: "telefonia.xlsx", sector: "port" });
  assert.equal(p.rows[0].client, "0010 - Cliente");
  assert.equal(p.rows[0].partyName, "Ramal da porta");
  assert.equal(p.rows[0].dateTime, "03/09/2026 10:04:05");
  assert.equal(p.rows[0].number, "456");
  assert.equal(p.rows[0].duration, 0.1);
  assert.equal(D.suggest(["CUC", "Número de Eventos"]).id, -1);
  assert.match(I.fieldPurpose("ligacoes", "Manual"), /sem equiparar ao Tipo/);
});
test("durações respeitam unidades e ausência não vira zero", () => {
  assert.equal(D.durationMinutes("6 segundos "), .1);
  assert.equal(D.durationMinutes("1 hora e 30 minutos"), 90);
  assert.equal(D.durationMinutes("00:00:05"), 5 / 60);
  assert.equal(D.durationMinutes("0"), 0);
  for (const value of ["", null, "sem tempo", "-1", "00:90:00"]) assert.equal(D.durationMinutes(value), null);
});
test("leitura de importações antigas corrige associações sem alterar os originais ou deduplicar ligações", () => {
  const raw = { Nome: "Porta", Cliente: "Conta", Duração: "6 segundos" };
  const original = { id: "fone", type: "ligacoes", client: "Porta", duration: null, raw, line: 2 };
  const lots = [{ id: "old", rows: [original, { ...original, line: 3 }] }];
  const before = JSON.stringify(lots), rows = D.allRows(lots);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].client, "Conta");
  assert.equal(rows[0].duration, .1);
  assert.equal(JSON.stringify(lots), before);
});
test("cruzamento agrega antes de relacionar e exige empresa, conta com zeros e competência", () => {
  const rows = [order("1"), order("2"), order("3", { company: "Empresa B" }), order("4", { account: "10" }), order("5", { date: "2026-10-01" }), trip(3), trip(2, { client: "Outro local" })];
  const c = I.crossOrdersTrips(rows);
  assert.equal(c.matchedAccounts, 1);
  assert.equal(c.matchedTrips, 5);
  assert.equal(c.matchedOrders, 2);
  assert.equal(c.accounts[0].pending, 2);
  assert.equal(c.excludedOrders, 3);
  assert.equal(c.accounts[0].clients.length, 2);
  assert.match(c.reason, /não distingue locais/);
});
test("competências sobrepostas, lotes sobrepostos e ausência de chaves ficam fora do vínculo", () => {
  const c = I.crossOrdersTrips([order("1"), trip(10, { lotId: "a" }), trip(10, { lotId: "b" }), trip(4, { company: "" }), trip(8, { account: "0020", periodStart: null })]);
  assert.equal(c.matchedAccounts, 0);
  assert.equal(c.ambiguousPeriods, 1);
  assert.equal(c.missingKeys, 1);
  assert.equal(c.missingPeriods, 1);
  const partial = D.select([order("1"), trip(10)], { start: "2026-09-02", end: "2026-09-30" });
  assert.equal(I.crossOrdersTrips(partial).available, false);
  const overlapping = I.crossOrdersTrips([order("1"), trip(3), trip(4, { periodStart: "2026-09-15", periodEnd: "2026-10-10" })]);
  assert.equal(overlapping.ambiguousPeriods, 1);
});
test("insights distinguem duração, calendário, registros, eventos e dados faltantes", () => {
  const rows = [order("1", { status: "Concluído", dateTime: "03/09/2026 10:00:00", closedTime: "04/09/2026 10:00:00", duration: .1 }), order("2", { duration: null }), { type: "cuc", title: "Restauração", value: 100 }, { type: "cuc", title: "Teste", value: 50 }, { type: "ligacoes", status: "Concluído", duration: 0, client: "Cliente", dateTime: "03/09/2026 10:00:00" }, { type: "ligacoes", status: "Não atendido", duration: null, client: "", dateTime: "03/09/2026 11:00:00" }];
  const a = I.analyze(rows), calendar = a.cards.find(c => /calendário/.test(c.title)), coverage = a.cards.find(c => /Cobertura/.test(c.title));
  assert.match(calendar.text, /24 horas/);
  assert.match(calendar.caveat, /Não é tempo de execução nem SLA/);
  assert.match(coverage.text, /1 de 2 OS/);
  assert.equal(a.profiles.find(p => p.type === "cuc").total, 150);
  assert.match(a.cards.find(c => /50%/.test(c.title)).basis, /1 ÷ 2/);
  assert.equal(D.stats(rows).rate, null);
  assert.equal(D.stats(rows).avg, null);
  assert.ok(a.cards.every(c => c.basis && c.caveat));
});
test("horários inválidos e ausência de registros não geram medidas inventadas", () => {
  for (const value of ["31/02/2026 10:00:00", "03/09/2026 25:00:00", "texto"]) assert.equal(I.timestamp(value), null);
  const a = I.analyze([]);
  assert.equal(a.cross.available, false);
  assert.equal(a.profiles.length, 0);
  assert.match(a.cards[0].title, /Sem evidência/);
});
test("arquivo sem período permite vínculo de identidade sem afirmar coincidência temporal", () => {
  const c = I.crossOrdersTrips([order("1"), order("2", { date: "2026-10-03" }), trip(12, { periodStart: null, periodEnd: null })]);
  assert.equal(c.matchedAccounts, 1);
  assert.equal(c.identityAccounts, 1);
  assert.equal(c.temporalAccounts, 0);
  assert.equal(c.matchedOrders, 2);
  assert.equal(c.accounts[0].periodConfirmed, false);
  assert.match(c.reason, /sem afirmar coincidência de datas/);
  const a = I.analyze([order("1"), trip(12, { periodStart: null, periodEnd: null })]);
  assert.match(a.cards[0].title, /presentes nas duas bases/);
  assert.match(a.cards[0].text, /período dos deslocamentos não informado/);
});
