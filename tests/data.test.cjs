const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../data-core.js");
const X = require("../vendor/xlsx.full.min.js");
const parse = (grid, type, extra = {}) =>
  D.parse(grid, { ...D.detect(grid), sector: "tec", type, ...extra });
const lot = (id, rows, extra = {}) => ({
  id,
  hash: id,
  sheet: "Dados",
  sector: "tec",
  type: rows[0].type,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  rows,
  ...extra,
});
test("cabeçalhos com células vazias não interrompem a identificação de ligações", () => {
  const headers = [];
  headers[1] = "Data / Hora";
  headers[3] = "Completada";
  headers[6] = "Duração";
  const grid = [
    headers,
    [null, "01/09/2026 10:00:00", null, "Sim", null, null, "00:01:00"],
  ];
  const detected = D.detect(grid);
  assert.equal(detected.headerRow, 0);
  assert.equal(detected.type, "ligacoes");
  assert.equal(detected.mapping.date, 1);
  assert.equal(detected.mapping.status, 3);
  assert.equal(
    D.parse(grid, { ...detected, sector: "port", filename: "ligações.xlsx" })
      .rows.length,
    1,
  );
});
test("cabeçalhos reais, datas brasileiras e valores agregados", () => {
  const cuc = parse(
    [
      ["CUC", "Número de Eventos"],
      ["Falha", 63096],
      ["Informação", 55394],
    ],
    "cuc",
  );
  assert.equal(
    D.detect([
      ["CUC", "Número de Eventos"],
      ["Tempo excedido", 276],
    ]).headerRow,
    0,
  );
  assert.equal(D.stats(cuc.rows).byType.cuc.value, 118490);
  assert.equal(
    D.detect([
      ["Empresa", "Número da OS", "Data de abertura da OS", "Solicitação"],
    ]).type,
    "ordens",
  );
  assert.equal(D.day("31/02/2026"), null);
  assert.equal(D.day("01/09/2026 08:10:00"), "2026-09-01");
  assert.equal(D.number("370.016"), 370016);
  assert.equal(D.number("1.234,56"), 1234.56);
  const invalid = parse(
    [
      ["CUC", "Número de Eventos"],
      ["Falha", "texto"],
      ["Total Geral", 10],
    ],
    "cuc",
  );
  assert.equal(invalid.errors.length, 1);
  assert.equal(invalid.skipped.length, 1);
});
test("cancelamentos e ligações não atendidas ficam separados das pendências", () => {
  const p = parse(
    [
      ["Número da OS", "Status da OS", "Data de abertura da OS"],
      ["1", "Ordem de serviço aberta", "01/09/2026"],
      ["2", "Ordem de serviço fechada", "02/09/2026"],
      ["3", "Ordem de serviço cancelada", "03/09/2026"],
    ],
    "ordens",
  );
  const s = D.stats(p.rows);
  assert.equal(s.pending, 1);
  assert.equal(s.cancelled, 1);
  assert.equal(s.done, 1);
  assert.equal(s.known, 3);
  assert.equal(D.status("Não", "ligacoes"), "Não atendido");
  assert.equal(
    D.stats([{ type: "cuc", value: 10, status: "Não informado" }]).rate,
    null,
  );
});
test("duplicação, sobreposição, versionamento e reconciliação de OS", () => {
  const p = parse(
    [
      ["CUC", "Número de Eventos"],
      ["Falha", 10],
    ],
    "cuc",
    { periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  );
  const a = lot("a", p.rows),
    b = lot(
      "b",
      p.rows.map((r) => ({ ...r, value: 15 })),
    );
  assert.equal(D.ingest([a], { ...a, id: "copy" }).duplicate, true);
  assert.throws(() => D.ingest([a], b), /Já existem/);
  const updated = D.ingest([a], b, "replace").lots;
  assert.equal(updated[0].supersededBy, "b");
  assert.equal(D.stats(D.allRows(updated)).byType.cuc.value, 15);
  assert.throws(
    () => D.ingest([a], { ...b, periodEnd: "2026-09-20" }, "replace"),
    /mesmo período/,
  );
  const orders = parse(
    [
      ["Número da OS", "Status da OS", "Data de abertura da OS"],
      ["123", "aberta", "01/09/2026"],
    ],
    "ordens",
  );
  const original = lot("os-a", orders.rows),
    second = lot(
      "os-b",
      orders.rows.map((r) => ({ ...r, status: "Concluído" })),
    );
  assert.equal(D.allRows([original, second]).length, 1);
  assert.equal(D.allRows([original, second])[0].status, "Concluído");
});
test("totais sem dia exigem competência e só entram no período inteiro", () => {
  const p = parse(
    [
      ["CUC", "Número de Eventos"],
      ["Falha", 10],
    ],
    "cuc",
  );
  assert.throws(
    () =>
      D.ingest([], lot("a", p.rows, { periodStart: null, periodEnd: null })),
    /período/,
  );
  const r = {
    ...p.rows[0],
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  };
  assert.equal(
    D.select([r], { start: "2026-09-01", end: "2026-09-30" }).length,
    1,
  );
  assert.equal(
    D.select([r], { start: "2026-09-10", end: "2026-09-30" }).length,
    0,
  );
  assert.equal(D.series([r]).length, 0);
});
test("Excel exportado contém exatamente dados e indicadores do relatório", () => {
  const rows = parse(
    [
      ["Número da OS", "Status da OS", "Data de abertura da OS"],
      ["001", "aberta", "01/09/2026"],
      ["002", "fechada", "02/09/2026"],
    ],
    "ordens",
  ).rows;
  const wb = D.workbook(X, rows, D.metricOptions(rows), { Setor: "Técnico" }),
    bytes = X.write(wb, { type: "buffer", bookType: "xlsx" }),
    back = X.read(bytes, { type: "buffer" });
  assert.deepEqual(back.SheetNames, ["Dados", "Indicadores", "Recorte"]);
  const data = X.utils.sheet_to_json(back.Sheets.Dados);
  assert.equal(data.length, 2);
  assert.equal(data[0].ID, "001");
  assert.equal(data[1].Status, "Concluído");
  const indicators = X.utils.sheet_to_json(back.Sheets.Indicadores);
  assert.equal(
    indicators.find((x) => x.Indicador === "Linhas importadas").Valor,
    2,
  );
  const legacy = X.write(wb, { type: "buffer", bookType: "biff8" });
  assert.equal(X.read(legacy, { type: "buffer" }).SheetNames.length, 3);
});
test("análises indicam falta de cobertura e usam metas configuradas", () => {
  const rows = parse(
    [
      ["Número da OS", "Status da OS", "Data de abertura da OS"],
      ["1", "aberta", "01/09/2026"],
    ],
    "ordens",
  ).rows;
  const insights = D.insights(rows, {
    all: rows,
    start: "2026-09-01",
    end: "2026-09-30",
    detailed: true,
    goals: { tec: 80 },
  });
  assert.ok(
    insights.some((x) => x.title.startsWith("Comparação indisponível")),
  );
  assert.ok(insights.some((x) => x.title.includes("Meta")));
  assert.ok(
    D.insights([], {}).some((x) => x.title === "Sem dados neste recorte"),
  );
});
