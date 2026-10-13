const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const ids=['a'.repeat(64),'b'.repeat(64)];
async function boot({owner=true,reject=false}={}){
 const dom=new JSDOM('<button data-cloud-library>Biblioteca de arquivos</button>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 let files=ids.map((id,i)=>({id,name:i?'planilha.xlsx':'<nome>.csv',size:4000,created:'2026-10-13',canDelete:true}));
 const saves=[],applied=[],confirmations=[];
 w.MCAccess={owner,rights:{filesView:true,filesDownload:true,filesDelete:false}};
 w.MCCloudFiles={refresh:async()=>files,deleteFiles:async selected=>{saves.push([...selected]);if(reject)throw Error('Servidor indisponível');files=files.filter(file=>!selected.includes(file.id));return{deletedIds:selected};}};
 w.MichelleBridge={icon:()=>'',getState:()=>({ready:true,sidebar:false}),applyDeletedFiles:ids=>applied.push([...ids])};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.confirm=text=>{confirmations.push(text);return true;};
 w.eval(fs.readFileSync(require('node:path').join(__dirname,'../mc-file-library.js'),'utf8'));
 const click=selector=>w.document.querySelector(selector).click();
 click('[data-cloud-library]');await new Promise(r=>setImmediate(r));
 return{w,dom,click,saves,applied,confirmations};
}
test('excluir arquivo é rascunho; cancelar fechamento preserva e descartar não chama servidor',async()=>{
 const t=await boot();t.click('[data-library-remove]');assert.equal(t.saves.length,0);
 assert.equal(t.w.document.querySelectorAll('.is-pending').length,1);
 t.w.confirm=()=>false;t.click('[data-library-close]');assert.ok(t.w.document.querySelector('#mc-file-library[open]'));
 t.w.confirm=()=>true;t.click('[data-library-close]');assert.equal(t.w.document.querySelector('#mc-file-library'),null);assert.equal(t.saves.length,0);
 t.click('[data-cloud-library]');await new Promise(r=>setImmediate(r));assert.equal(t.w.document.querySelectorAll('.is-pending').length,0);t.dom.window.close();
});
test('Salvar envia só exclusões confirmadas e atualiza a base do painel',async()=>{
 const t=await boot();assert.equal(t.w.document.querySelector('.mc-library-file strong').textContent,'<nome>.csv');
 t.click('[data-library-remove]');t.click('[data-library-save]');await new Promise(r=>setImmediate(r));
 assert.deepEqual(t.saves.map(v=>Array.from(v)),[[ids[0]]]);assert.deepEqual(t.applied.map(v=>Array.from(v)),[[ids[0]]]);
 assert.equal(t.w.document.querySelectorAll('.mc-library-row').length,1);assert.equal(t.w.document.querySelector('[data-library-save]').disabled,true);t.dom.window.close();
});
test('Excluir tudo permite desfazer um arquivo antes de Salvar',async()=>{
 const t=await boot();t.click('[data-library-all]');assert.equal(t.saves.length,0);t.click('[data-library-remove]');
 t.click('[data-library-save]');await new Promise(r=>setImmediate(r));assert.deepEqual(t.saves.map(v=>Array.from(v)),[[ids[1]]]);t.dom.window.close();
});
test('falha ao salvar conserva arquivos e rascunho para tentar novamente',async()=>{
 const t=await boot({reject:true});t.click('[data-library-all]');t.click('[data-library-save]');await new Promise(r=>setImmediate(r));
 assert.equal(t.w.document.querySelectorAll('.mc-library-row').length,2);assert.equal(t.w.document.querySelectorAll('.is-pending').length,2);assert.equal(t.applied.length,0);
 assert.match(t.w.document.querySelector('[data-library-status]').textContent,/Não foi possível salvar/);t.dom.window.close();
});
test('leitor não recebe ações de exclusão; Escape também confirma alterações pendentes',async()=>{
 const r=await boot({owner:false});assert.equal(r.w.document.querySelector('[data-library-save]').hidden,true);assert.equal(r.w.document.querySelector('[data-library-remove]'),null);r.dom.window.close();
 const t=await boot();t.click('[data-library-remove]');t.w.confirm=()=>false;
 t.w.document.querySelector('#mc-file-library').dispatchEvent(new t.w.Event('cancel',{cancelable:true}));assert.ok(t.w.document.querySelector('#mc-file-library'));
 t.w.confirm=()=>true;t.w.document.querySelector('#mc-file-library').dispatchEvent(new t.w.Event('cancel',{cancelable:true}));assert.equal(t.w.document.querySelector('#mc-file-library'),null);assert.equal(t.saves.length,0);t.dom.window.close();
});
test('servidor bloqueia exclusão de arquivo que também alimenta setor não permitido',async()=>{
 const{deleteFiles}=await import('../server/file-library.mjs');let committed=false,rolledBack=false;
 const pool={connect:async()=>({query:async sql=>{
  if(sql==='COMMIT')committed=true;if(sql==='ROLLBACK')rolledBack=true;
  if(sql.startsWith('SELECT id,'))return{rows:[{id:ids[0],uploaded_by:'usuario',object_key:'original-antigo'}]};
  if(sql.startsWith('SELECT content'))return{rows:[{file_id:ids[0],sector:'tec'},{file_id:ids[0],sector:'rh'}]};return{rows:[],rowCount:0};
 },release(){}})};
 await assert.rejects(deleteFiles(pool,{owner:false,rights:{filesDelete:true},sectors:['tec']},'usuario',[ids[0]]),error=>error.status===403);
 assert.equal(committed,false);assert.equal(rolledBack,true);
});
test('exclusão sem permissão não abre transação e uma falha de banco causa rollback',async()=>{
 const{deleteFiles,deletionIds}=await import('../server/file-library.mjs');let calls=0;
 await assert.rejects(deleteFiles({connect:async()=>{calls++;}},{owner:false,rights:{}},'usuario',[ids[0]]),e=>e.status===403);assert.equal(calls,0);
 assert.throws(()=>deletionIds(['qualquer-string']),e=>e.status===400);
 const sequence=[];const pool={connect:async()=>({query:async sql=>{sequence.push(sql);if(sql.startsWith('SELECT id,'))return{rows:[{id:ids[0],object_key:'key'}]};if(sql.startsWith('DELETE FROM mc_records'))throw Error('DB offline');return{rows:[],rowCount:0};},release(){sequence.push('release');}})};
 await assert.rejects(deleteFiles(pool,{owner:true},'usuario',[ids[0]]),/DB offline/);assert.ok(sequence.includes('ROLLBACK'));assert.ok(!sequence.includes('COMMIT'));
});
