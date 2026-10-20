/* Leitura deterministica de matrizes Sigware; CSV e workbook usam adaptadores explicitos. */
const parserApi=(function(root,factory){
  const api=factory();
  root.MCSigwareParser=api;
  return api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const normalized=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ");
  const headerNames=new Set([
    "id","codigo","cod","nome","cliente","contrato","status","situacao","valor",
    "valor total","descricao","descricao do item","data","data da os",
    "tipo","documento","cpf","cnpj","email","telefone","municipio","uf","saldo",
    "numero","numero da os","ordem de servico","conta","equipe","motivo",
    "deslocamento","cuc","quantidade","qtd","duracao","inicio","fim"
  ]);
  const isHeaderName=value=>{
    const term=normalized(value);
    return headerNames.has(term)||/^(?:data|codigo|numero|status|situacao|valor|motivo|descricao|tempo|duracao|quantidade) (?:de |do |da |dos |das |total |em )?[a-z]{2,28}$/.test(term);
  };
  function scoreHeaderRow(row,rowIndex=0){
    if(!Array.isArray(row)||!row.length)return 0;
    const cells=row.map(v=>String(v??"").trim());
    const filled=cells.filter(Boolean);
    if(!filled.length)return 0;
    const matches=filled.filter(isHeaderName).length;
    const words=filled.filter(v=>v.length<=60&&!/^[\d.,/:%$\s-]+$/.test(v)).length;
    let score=matches*18+Math.min(words,12)*3+Math.min(filled.length,12)*2;
    if(filled.length<2)score-=30;
    if(/(?:relatorio|emitido em|pagina \d+|gerado em|sigware)/.test(normalized(cells.join(" "))))score-=30;
    if(rowIndex>15 && !matches)score-=10;
    return Math.max(0,score);
  }
  function detectHeaderRow(rows,maxScan=20){
    if(!Array.isArray(rows))throw new TypeError("Planilha deve ser uma matriz de linhas.");
    if(!Number.isInteger(maxScan)||maxScan<1)throw new RangeError("Limite de busca invalido.");
    let index=0,score=-1;
    for(let i=0;i<Math.min(rows.length,maxScan);i++){
      const current=scoreHeaderRow(rows[i],i);
      if(current>score){score=current;index=i;}
    }
    return {rowIndex:index,score:Math.max(0,score)};
  }
  function slugifyHeader(header,index){
    const slug=normalized(header).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
    return slug||"col_"+(index+1);
  }
  function isSummaryRow(row){
    if(!Array.isArray(row))return false;
    const values=row.map(v=>String(v??"").trim());
    const index=values.findIndex(Boolean);
    if(index<0||index>1)return false;
    if(!/^(?:total|total geral|subtotal|soma|grand total)$/i.test(normalized(values[index])))return false;
    const trailing=values.slice(index+1).filter(Boolean);
    return trailing.length>0 && trailing.every(v=>/^[R$\s\d.,%()+-]+$/i.test(v));
  }
  function parseSheetMatrix(rows,options={}){
    if(!Array.isArray(rows))throw new TypeError("Entrada deve ser uma matriz; para CSV use parseCSVMatrix e para workbook use parseWorkbook.");
    if(!rows.length)return {headers:[],rows:[],meta:{headerRowIndex:0,totalRows:0,detectionScore:0,skippedSummaries:0}};
    const detection=detectHeaderRow(rows,options.maxScanRows??20);
    const headerRowIndex=options.forceHeaderIndex===undefined?detection.rowIndex:options.forceHeaderIndex;
    if(!Number.isInteger(headerRowIndex)||headerRowIndex<0||headerRowIndex>=rows.length||!Array.isArray(rows[headerRowIndex]))
      throw new RangeError("Indice de cabecalho invalido.");
    const sourceHeaders=rows[headerRowIndex];
    const data=rows.slice(headerRowIndex+1).filter(Array.isArray);
    const maxColumns=Math.max(sourceHeaders.length,...data.map(row=>row.length));
    if(maxColumns>2000)throw new RangeError("Planilha com colunas em excesso.");
    const seen=new Set();
    const headers=Array.from({length:maxColumns},(_,index)=>{
      const value=sourceHeaders[index];
      const base=slugifyHeader(value,index);
      let key=base,duplicate=1;
      while(seen.has(key))key=base+"_"+duplicate++;
      seen.add(key);
      return {original:String(value??"").trim(),key,index};
    });
    const parsed=[];let skippedSummaries=0;
    for(const source of data){
      if(!source.some(value=>String(value??"").trim()!==""))continue;
      if(isSummaryRow(source)){skippedSummaries++;continue;}
      const item={};
      for(const head of headers)item[head.key]=source[head.index]??"";
      parsed.push(item);
    }
    return {headers,rows:parsed,meta:{
      headerRowIndex,totalRows:parsed.length,detectionScore:detection.score,skippedSummaries
    }};
  }
  function parseCSVMatrix(text,delimiter){
    if(typeof text!=="string")throw new TypeError("CSV deve ser texto.");
    const input=text.replace(/^\uFEFF/,"").replace(/^sep=([;,])(?:\r?\n)/i,(_,separator)=>{delimiter=separator;return "";});
    const separator=delimiter||((input.split(/\r?\n/,1)[0].match(/;/g)||[]).length>(input.split(/\r?\n/,1)[0].match(/,/g)||[]).length?";":",");
    if(![";",","].includes(separator))throw new RangeError("Separador CSV invalido.");
    const rows=[];let row=[],value="",quoted=false;
    for(let i=0;i<input.length;i++){
      const ch=input[i];
      if(ch==='"'){
        if(quoted&&input[i+1]==='"'){value+='"';i++;}
        else if(quoted||!value)quoted=!quoted;
        else value+=ch;
      }else if(ch===separator&&!quoted){row.push(value);value="";}
      else if((ch==="\n"||ch==="\r")&&!quoted){
        if(ch==="\r"&&input[i+1]==="\n")i++;
        row.push(value);rows.push(row);row=[];value="";
      }else value+=ch;
    }
    if(quoted)throw new SyntaxError("CSV com aspas nao fechadas.");
    row.push(value);
    if(row.some(cell=>cell!=="")||!rows.length)rows.push(row);
    return rows;
  }
  function parseWorkbook(workbook,XLSX,options={}){
    if(!workbook||!Array.isArray(workbook.SheetNames)||!XLSX?.utils?.sheet_to_json)
      throw new TypeError("Workbook XLSX invalido ou leitor XLSX nao informado.");
    return workbook.SheetNames.filter(name=>workbook.Sheets?.[name]).map(name=>({
      sheet:name,...parseSheetMatrix(XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:false,defval:""}),options)
    }));
  }
  return {scoreHeaderRow,detectHeaderRow,slugifyHeader,isSummaryRow,parseSheetMatrix,parseCSVMatrix,parseWorkbook};
});
export const {scoreHeaderRow,detectHeaderRow,slugifyHeader,isSummaryRow,parseSheetMatrix,parseCSVMatrix,parseWorkbook}=parserApi;
