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
  assert.equal(result.meta.totalRows, 2);
  assert.equal(result.meta.skippedSummaries, 1);
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

test('Sigware: linhas de total nunca contaminam indicadores', () => {
  const parsed=parser.parseSheetMatrix([
    ['Código','Valor Total'], ['001','100,00'],['002','50,00'],['','TOTAL','150,00']
  ],{forceHeaderIndex:0});
  assert.equal(parsed.rows.length,2);
  assert.equal(parsed.meta.skippedSummaries,1);
});
test('Sigware: dados extras ganham colunas preservadas', () => {
  const parsed=parser.parseSheetMatrix([['Código','Status'],['001','Aberto','Origem adicional']],{forceHeaderIndex:0});
  assert.equal(parsed.rows[0].col_3,'Origem adicional');
});
test('Sigware: índice de cabeçalho fora do limite falha explicitamente', () => {
  assert.throws(()=>parser.parseSheetMatrix([['Código'],['001']],{forceHeaderIndex:10}),RangeError);
});
test('Sigware: CSV cru é rejeitado; parser CSV separa campos com aspas', () => {
  assert.throws(()=>parser.parseSheetMatrix('Código;Descrição\n001;Teste'),TypeError);
  const rows=parser.parseCSVMatrix('\uFEFFCódigo;Descrição;Status\r\n001;"Teste; com ponto e vírgula";Aberto');
  assert.deepEqual(rows[1],['001','Teste; com ponto e vírgula','Aberto']);
  assert.equal(parser.parseSheetMatrix(rows).rows[0].codigo,'001');
});
test('Sigware: valor contendo status não substitui cabeçalho verdadeiro', () => {
  const rows=[['Relatório: status pendente'],['Código','Descrição','Valor Total'],['001','OS','10']];
  assert.equal(parser.detectHeaderRow(rows).rowIndex,1);
});
test('Sigware: workbook com várias abas exige adaptador e preserva separação', () => {
  assert.throws(()=>parser.parseSheetMatrix({SheetNames:['A']}),TypeError);
  const workbook={SheetNames:['A','B'],Sheets:{A:{grid:[['Código'],['001']]},B:{grid:[['Código'],['002']]}}};
  const xlsx={utils:{sheet_to_json:(sheet)=>sheet.grid}};
  const parsed=parser.parseWorkbook(workbook,xlsx);
  assert.deepEqual(parsed.map(p=>p.sheet),['A','B']);
  assert.deepEqual(parsed.map(p=>p.rows[0].codigo),['001','002']);
});
