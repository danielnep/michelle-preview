const assert = require('node:assert/strict');
const test = require('node:test');
const parser = require('../server/sigware-resilient-parser.mjs');

test('Sigware: shifted header and text identifiers are preserved', () => {
  const rows = [
    ['Relatório gerado em 2026-10-18', '', ''],
    ['', '', ''],
    ['Código', 'Descrição do Item', 'Valor Total', 'Data'],
    ['001', 'Produto Alfa', '1.250,50', '15/10/2026'],
    ['002', 'Produto Beta', '450,00', '16/10/2026'],
    ['', 'Total', '1.700,50', '']
  ];
  const result = parser.parseSheetMatrix(rows);
  assert.equal(result.meta.headerRowIndex, 2);
  assert.deepEqual(result.headers.map(h => h.key),
    ['codigo', 'descricao_do_item', 'valor_total', 'data']);
  assert.equal(result.meta.totalRows, 3);
  assert.equal(result.rows[0].codigo, '001');
  assert.equal(result.rows[0].descricao_do_item, 'Produto Alfa');
  assert.equal(result.rows[0].valor_total, '1.250,50');
});

test('Sigware: duplicate names and empty sheets are deterministic', () => {
  const empty = parser.parseSheetMatrix([]);
  assert.deepEqual(empty.rows, []);
  const result = parser.parseSheetMatrix([
    ['Código', 'Código', '', 'Status'],
    ['0002', '0002', '', 'aberto']
  ], {forceHeaderIndex: 0});
  assert.deepEqual(result.headers.map(h => h.key),
    ['codigo', 'codigo_1', 'col_3', 'status']);
  assert.equal(result.rows[0].codigo_1, '0002');
});
