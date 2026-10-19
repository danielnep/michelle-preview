const assert = require('node:assert');
const test = require('node:test');
const parser = require('../server/sigware-resilient-parser.mjs');

test('SigwareResilientParser - Detecção de cabeçalho deslocado e tipos mistos', () => {
  const rows = [
    ["Relatório gerado em 2026-10-18", "", ""],
    ["", "", ""],
    ["Código", "Descrição do Item", "Valor Total", "Data"],
    ["001", "Produto Alfa", "1.250,50", "15/10/2026"],
    ["002", "Produto Beta", "450,00", "16/10/2026"],
    ["", "Total", "1.700,50", ""]
  ];
  const result = parser.parseSheetRows(rows);
  assert.ok(result, 'Resultado não deve ser nulo');
  assert.strictEqual(result.headers.length, 4);
  assert.strictEqual(result.headers[1], 'Descricao do Item');
  assert.strictEqual(result.rows.length, 3);
  assert.strictEqual(result.rows[0].Codigo, '001');
});
