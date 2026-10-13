/* Inventário não destrutivo de todas as abas de um workbook, uma fonte por aba. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MCWorkbookSheets=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const summaryName=name=>/(^|[\s_-])(resumo|sumario|sumário|total|totais|consolidado|dashboard|painel|sintese|síntese)([\s_-]|$)/i.test(String(name));
  function inspect(workbook,XLSX,detect,filename) {
    if(!workbook?.SheetNames?.length)return [];
    const found=[];
    for(const name of workbook.SheetNames) {
      const sheet=workbook.Sheets?.[name]; if(!sheet?.["!ref"])continue;
      const range=XLSX.utils.decode_range(sheet["!ref"]);
      if(range.e.r-range.s.r<1)continue;
      const sample=XLSX.utils.sheet_to_json(sheet,{
        header:1,raw:false,defval:"",
        range:{s:{r:range.s.r,c:range.s.c},e:{r:Math.min(range.e.r,range.s.r+39),c:Math.min(range.e.c,range.s.c+60)}}
      });
      const nonempty=sample.filter(row=>Array.isArray(row)&&row.some(cell=>String(cell??"").trim()!==""));
      if(nonempty.length<2)continue;
      const score=Number(detect(sample,{filename,sheet:name})?.score)||0;
      found.push({name,score,summary:summaryName(name),estimatedRows:Math.max(0,range.e.r-range.s.r),selected:true});
    }
    const hasDetailed=found.some(x=>!x.summary);
    for(const entry of found)entry.selected=!(entry.summary&&hasDetailed);
    if(found.length&&!found.some(x=>x.selected)) {
      found.slice().sort((a,b)=>b.score-a.score)[0].selected=true;
    }
    return found;
  }
  function active(queue) {
    return (queue||[]).filter(p=>p?.grid&&!p.lotId&&p.selected!==false);
  }
  return {inspect,active,summaryName};
});