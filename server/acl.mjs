export const SECTORS={
 coi:"COI",fac:"Facilities",rh:"RH",com:"Comercial",tec:"Técnico",
 impl:"Implementação",qual:"Qualidade",port:"Portaria Remota"
};
export const CAPABILITIES={
 dashboard:"Visualizar dashboard",
 analyses:"Ver indicadores e análises",
 filesView:"Visualizar lista de arquivos",
 filesUpload:"Enviar e importar planilhas",
 filesDownload:"Abrir e baixar arquivos originais",
 filesDelete:"Excluir arquivos e seus dados do painel",
 reportsExport:"Exportar relatórios e análises",
 presentationsView:"Visualizar apresentações",
 presentationsEdit:"Criar ou editar apresentações",
 ai:"Usar o Copiloto"
};
export const allRights=()=>Object.fromEntries(Object.keys(CAPABILITIES).map(key=>[key,true]));
export function normalizeRights(source){
 const obj=source&&typeof source==="object"&&!Array.isArray(source)?source:{};
 return Object.fromEntries(Object.keys(CAPABILITIES).map(key=>[key,obj[key]===true]));
}
export function normalizeSectors(source){
 if(!Array.isArray(source))return[];
 return [...new Set(source.filter(id=>Object.hasOwn(SECTORS,id)))];
}
export function can(access,key){
 return Boolean(access?.owner||access?.rights?.[key]);
}
export const anyRights=(access,keys)=>access?.owner||keys.some(k=>can(access,k));
