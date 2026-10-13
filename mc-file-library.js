/* Biblioteca dentro do painel. Excluir só altera o rascunho até Salvar. */
(function (root) {
  "use strict";
  let dialog = null, files = [], pending = new Set(), busy = false, loading = false, opener = null;
  const access = key => Boolean(root.MCAccess?.owner || root.MCAccess?.rights?.[key]);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon = name => root.MichelleBridge?.icon(name, 18) || "";
  const size = bytes => Number(bytes) < 1048576 ? Math.max(1, Math.round(Number(bytes) / 1024)) + " KB" : (Number(bytes) / 1048576).toFixed(1) + " MB";
  const removable = file => access("filesDelete") && file.canDelete !== false;
  function message(text, error = false) {
    if (!dialog) return;
    const status = dialog.querySelector("[data-library-status]");
    status.textContent = text; status.classList.toggle("error", error);
  }
  function paint() {
    const list = dialog.querySelector("[data-library-list]");
    dialog.querySelector("[data-library-count]").textContent = loading ? "Carregando seus arquivos…" :
      files.length + " arquivo" + (files.length === 1 ? " enviado" : "s enviados");
    list.innerHTML = loading ? '<li class="mc-library-empty">Carregando…</li>' : !files.length ?
      '<li class="mc-library-empty">Nenhum arquivo enviado. Use Enviar arquivo ao lado do título, na barra superior.</li>' : files.map(file => {
        const deleted = pending.has(file.id), date = new Date(file.created);
        const info = size(file.size) + (!Number.isNaN(date.valueOf()) ? " · " + date.toLocaleDateString("pt-BR") : "");
        return '<li class="mc-library-row' + (deleted ? ' is-pending' : '') + '">' +
          '<span class="mc-library-file-icon" aria-hidden="true">' + icon("files") + '</span>' +
          '<div class="mc-library-file"><strong>' + esc(file.name) + '</strong><small>' + esc(info) + '</small>' +
          (deleted ? '<span class="mc-library-pending">Será excluído ao salvar</span>' : '') + '</div>' +
          '<div class="mc-library-row-actions">' +
          (!deleted && access("filesDownload") ? '<button type="button" class="btn" data-library-preview="' + file.id + '" aria-label="Abrir ' + esc(file.name) + '">' + icon("files") + '<span>Abrir</span></button>' +
            '<a class="btn" href="/api/files/' + file.id + '?mode=download" download aria-label="Baixar ' + esc(file.name) + '">' + icon("down") + '<span>Baixar</span></a>' : '') +
          (removable(file) ? '<button type="button" class="btn ' + (deleted ? '' : 'mc-library-danger') + '" data-library-remove="' + file.id + '" aria-label="' + (deleted ? 'Desfazer exclusão de ' : 'Excluir ') + esc(file.name) + '">' + icon(deleted ? "arrow" : "trash") + '<span>' + (deleted ? 'Desfazer' : 'Excluir') + '</span></button>' : '') +
          '</div></li>';
      }).join("");
    const save = dialog.querySelector("[data-library-save]"), all = dialog.querySelector("[data-library-all]");
    save.hidden = all.hidden = !access("filesDelete");
    save.disabled = busy || loading || !pending.size;
    save.textContent = busy ? "Salvando…" : "Salvar";
    all.disabled = busy || loading || !files.some(file => removable(file) && !pending.has(file.id));
    dialog.querySelector("[data-library-close]").disabled = busy;
    dialog.querySelectorAll("[data-library-remove]").forEach(button => { button.disabled = busy; });
    dialog.setAttribute("aria-busy", String(busy || loading));
  }
  function close() {
    if (!dialog || busy) return false;
    if (pending.size && !root.confirm("Você tem alterações não salvas. Fechar sem salvar e descartar essas alterações?")) return false;
    const previous = opener;
    dialog.close(); dialog.remove(); dialog = null; pending.clear(); files = [];
    if (previous?.isConnected) previous.focus();
    else (document.querySelector(".mc-home-library [data-cloud-library]") || document.querySelector(".mob-toggle") || document.querySelector("[data-cloud-library]"))?.focus();
    return true;
  }
  async function preview(id) {
    const file = files.find(item => item.id === id), current = dialog;
    if (!file || !current) return;
    const section = current.querySelector("[data-library-preview-space]"), target = section.querySelector("[data-library-table]");
    section.hidden = false; section.querySelector("h3").textContent = file.name; target.textContent = "Abrindo arquivo…";
    try {
      const data = await root.MCStore.read("files", id);
      if (dialog !== current || pending.has(id)) { section.hidden = true; return; }
      const book = root.XLSX.read(data.bytes, { type: "array" });
      const rows = root.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: false, defval: "" }).slice(0, 50);
      target.innerHTML = '<table><tbody>' + rows.map(row => '<tr>' + row.slice(0, 35).map(value => '<td>' + esc(value) + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
    } catch (error) { if (dialog === current) target.textContent = error.message; }
  }
  async function save() {
    if (!pending.size || busy) return;
    const ids = [...pending], current = dialog;
    if (!root.confirm("Excluir " + ids.length + " arquivo" + (ids.length === 1 ? "" : "s") + " e remover seus dados dos indicadores?")) return;
    busy = true; paint(); message("Salvando exclusões…");
    try {
      const result = await root.MCCloudFiles.deleteFiles(ids);
      if (dialog !== current) return;
      const removed = new Set(result.deletedIds);
      files = files.filter(file => !removed.has(file.id)); pending.clear();
      root.MichelleBridge?.applyDeletedFiles(result.deletedIds);
      current.querySelector("[data-library-preview-space]").hidden = true;
      message("Alterações salvas. Arquivos e indicadores atualizados.");
    } catch (error) { message("Não foi possível salvar. " + error.message, true); }
    finally { busy = false; if (dialog === current) paint(); }
  }
  async function open(trigger) {
    if (dialog) return;
    opener = trigger || document.activeElement;
    if(root.MichelleBridge?.getState().sidebar){ root.MichelleBridge.getState().sidebar=false; root.MichelleBridge.render(); }
    files = []; pending = new Set(); loading = true; busy = false;
    dialog = document.createElement("dialog"); dialog.id = "mc-file-library"; dialog.className = "mc-file-library";
    dialog.setAttribute("aria-labelledby", "mc-file-library-title");
    dialog.innerHTML = '<div class="mc-library-layout"><header class="mc-library-head"><div><span class="eyebrow">BIBLIOTECA DE ARQUIVOS</span><h2 id="mc-file-library-title" tabindex="-1">Arquivos enviados</h2><p data-library-count></p><p>Os arquivos enviados são mantidos na nuvem do Power BI MC até serem excluídos.</p></div><button type="button" class="small-icon-btn" data-library-close aria-label="Fechar biblioteca de arquivos">' + icon("close") + '</button></header>' +
      '<div class="mc-library-body"><ul class="mc-library-list" data-library-list></ul><section class="mc-library-preview" data-library-preview-space hidden><div><h3></h3><button class="btn" type="button" data-library-preview-close>Fechar prévia</button></div><p>Primeiras 50 linhas da primeira aba. Baixe o original para consultar o arquivo completo.</p><div class="mc-library-table" data-library-table></div></section></div>' +
      '<footer class="mc-library-footer"><p role="status" aria-live="polite" data-library-status>As exclusões só são aplicadas ao salvar.</p><div><button type="button" class="btn mc-library-danger" data-library-all>' + icon("trash") + ' Excluir tudo</button><button type="button" class="btn btn-primary" data-library-save>Salvar</button></div></footer></div>';
    document.body.append(dialog); const current = dialog;
    current.addEventListener("cancel", event => { event.preventDefault(); close(); });
    current.addEventListener("click", event => {
      if (event.target === current || event.target.closest("[data-library-close]")) { close(); return; }
      if (busy || loading) return;
      const remove = event.target.closest("[data-library-remove]");
      if (remove) {
        const id = remove.dataset.libraryRemove;
        if (pending.has(id)) pending.delete(id); else pending.add(id);
        current.querySelector("[data-library-preview-space]").hidden = true; paint();
        current.querySelector('[data-library-remove="' + id + '"]')?.focus();
        message(pending.size ? pending.size + " exclusão(ões) pendente(s). Clique em Salvar para confirmar." : "Nenhuma alteração pendente."); return;
      }
      if (event.target.closest("[data-library-all]")) {
        files.filter(removable).forEach(file => pending.add(file.id)); paint();
        current.querySelector("[data-library-preview-space]").hidden = true;
        message(pending.size + " arquivo(s) serão excluídos ao salvar."); return;
      }
      if (event.target.closest("[data-library-save]")) { void save(); return; }
      if (event.target.closest("[data-library-preview-close]")) { current.querySelector("[data-library-preview-space]").hidden = true; return; }
      const view = event.target.closest("[data-library-preview]"); if (view) void preview(view.dataset.libraryPreview);
    });
    paint(); current.showModal(); current.querySelector("h2").focus();
    try { const result = await root.MCCloudFiles.refresh(); if (dialog !== current) return; files = result; }
    catch (error) { if (dialog === current) message(error.message, true); }
    finally { if (dialog === current) { loading = false; paint(); } }
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-cloud-library]");
    if (trigger) { event.preventDefault(); void open(trigger); }
  });
  root.addEventListener("beforeunload", event => {
    if (!pending.size) return; event.preventDefault(); event.returnValue = "";
  });
  root.MCFileLibrary = Object.freeze({ open, close });
  function openFromLink(){
    const url=new URL(root.location.href);
    if(url.searchParams.get("biblioteca")!=="1"||!root.MichelleBridge?.getState().ready)return;
    url.searchParams.delete("biblioteca");root.history.replaceState({},"",url);
    void open();
  }
  root.addEventListener("mc:app-ready",openFromLink);openFromLink();
})(window);
