/* Módulo robusto de parsing XLSX/CSV para exportações Sigware de formato variável (cabeçalhos deslocados, múltiplas abas, tipos mistos) */
const parserApi=(function(root,factory){
  const api=factory();
  root.MCSigwareParser=api;
  return api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  // Detecta se uma linha parece ser um cabeçalho válido (contém termos chaves da Sigware ou boa densidade de strings não vazias)
  function scoreHeaderRow(row, rowIndex) {
    if (!Array.isArray(row) || row.length === 0) return 0;
    const cells = row.map(c => String(c ?? "").trim());
    const nonEmpties = cells.filter(c => c !== "");
    if (nonEmpties.length === 0) return 0;

    let score = nonEmpties.length * 2;
    // Penaliza linhas muito no topo se contiverem palavras típicas de relatório corporativo genérico (ex: Relatório, Emitido em)
    const joined = cells.join(" ").toLowerCase();
    if (/relatório|emitido|data:|página|sistema|sigware/i.test(joined)) {
      score -= 5;
    }

    // Bonifica colunas típicas Sigware
    const sigwareKeywords = /id|codigo|código|nome|cliente|contrato|status|valor|data|tipo|documento|cpf|cnpj|email|telefone|municipio|uf|saldo/i;
    const matches = cells.filter(c => sigwareKeywords.test(c)).length;
    score += matches * 15;

    // Penaliza índice de linha muito alto se não tiver matches
    if (rowIndex > 15 && matches === 0) score -= 10;
    return Math.max(0, score);
  }

  // Encontra a melhor linha de cabeçalho nas primeiras N linhas
  function detectHeaderRow(rows, maxScan = 20) {
    let bestRowIndex = 0;
    let bestScore = -1;
    const limit = Math.min(rows.length, maxScan);
    
    for (let i = 0; i < limit; i++) {
      const s = scoreHeaderRow(rows[i], i);
      if (s > bestScore) {
        bestScore = s;
        bestRowIndex = i;
      }
    }
    return { rowIndex: bestRowIndex, score: bestScore };
  }

  // Normaliza nome de coluna para identificador único
  function slugifyHeader(header, index) {
    const str = String(header ?? "").trim();
    if (!str) return `col_${index + 1}`;
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `col_${index + 1}`;
  }

  // Processa uma matriz de linhas bruta (ex: sheet_to_json com header:1)
  function parseSheetMatrix(rows, options = {}) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { headers: [], rows: [], meta: { headerRowIndex: 0, totalRows: 0 } };
    }

    const scanLimit = options.maxScanRows || 20;
    const detection = detectHeaderRow(rows, scanLimit);
    const headerRowIndex = options.forceHeaderIndex !== undefined ? options.forceHeaderIndex : detection.rowIndex;
    
    const rawHeaders = rows[headerRowIndex] || [];
    // Cria cabeçalhos únicos
    const seen = {};
    const headers = rawHeaders.map((h, idx) => {
      let base = slugifyHeader(h, idx);
      let finalName = base;
      let counter = 1;
      while (seen[finalName]) {
        finalName = `${base}_${counter++}`;
      }
      seen[finalName] = true;
      return {
        original: String(h ?? "").trim(),
        key: finalName,
        index: idx
      };
    });

    const dataRows = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!Array.isArray(r)) continue;
      // Ignora linhas totalmente vazias
      if (!r.some(cell => String(cell ?? "").trim() !== "")) continue;

      const obj = {};
      let hasData = false;
      for (const h of headers) {
        const val = r[h.index] !== undefined ? r[h.index] : "";
        obj[h.key] = val;
        if (String(val).trim() !== "") hasData = true;
      }
      if (hasData) {
        dataRows.push(obj);
      }
    }

    return {
      headers,
      rows: dataRows,
      meta: {
        headerRowIndex,
        totalRows: dataRows.length,
        detectionScore: detection.score
      }
    };
  }

  return {
    scoreHeaderRow,
    detectHeaderRow,
    slugifyHeader,
    parseSheetMatrix
  };
});
// Node ESM/CommonJS interop: expose the same implementation as named exports.
export const {scoreHeaderRow,detectHeaderRow,slugifyHeader,parseSheetMatrix}=parserApi;
