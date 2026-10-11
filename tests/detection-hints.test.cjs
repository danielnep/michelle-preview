const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../data-core.js");

test("o nome da planilha identifica ligações quando os cabeçalhos são genéricos", () => {
  const info = D.detect([["Data", "Cliente", "Valor"], ["11/10/2026", "Conta A", 1]], {
    filename: "Relatório de ligações.xlsx", sheet: "Dados"
  });
  assert.equal(info.type, "ligacoes");
  assert.match(info.reason, /nome do arquivo/i);
  assert.equal(info.filenameHint, "ligacoes");
});

test("identificação explícita por colunas prevalece sobre nome conflitante", () => {
  const info = D.detect([["CUC", "Número de Eventos"], ["Falha de energia", 8]], {
    filename: "relatorio ordem de serviços.xlsx"
  });
  assert.equal(info.type, "cuc");
  assert.match(info.reason, /cabeçalhos/i);
});

test("os quatro tipos de arquivo conhecidos são reconhecidos", () => {
  const examples = [
    ["relatorio ordem de serviços.xlsx", "ordens"],
    ["motivos de cuc.xlsx", "cuc"],
    ["contas com maiores números de deslocamentos.xlsx", "deslocamentos"],
    ["Relatório de ligações.xlsx", "ligacoes"],
  ];
  for (const [filename, type] of examples) {
    const info = D.detect([["Data", "Cliente", "Valor"], ["11/10/2026", "Conta A", 1]], { filename });
    assert.equal(info.type, type, filename);
  }
});

test("nome genérico não gera interpretação específica inventada", () => {
  const info = D.detect([["Data", "Cliente"], ["11/10/2026", "Conta A"]], {
    filename: "dados.xlsx", sheet: "Planilha1"
  });
  assert.equal(info.type, "geral");
  assert.equal(info.confidence, "Revisão recomendada");
});

test("total de eventos CUC usa a coluna numérica original, não o número de linhas", () => {
  const grid = [["CUC", "Número de Eventos"], ["Falha de energia", 8], ["Restabelecimento", 12]];
  const info = D.detect(grid, { filename: "Motivos de CUC.xlsx" });
  const parsed = D.parse(grid, { ...info, sector: "coi", filename: "Motivos de CUC.xlsx" });
  assert.equal(parsed.rows.length, 2);
  assert.equal(D.stats(parsed.rows).byType.cuc.value, 20);
});
