/* Movimento e arraste acessíveis · Painel Michelle 4.2
   Sem bibliotecas externas, sem interferir na navegação ou na base importada. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MCMotion=api;
})(typeof window!=="undefined"?window:globalThis,function(root){
  "use strict";
  function orderAfter(ids,from,to){
    const source=Array.isArray(ids)?ids:[];
    if(!source.includes(from)||!source.includes(to)||from===to)return [...source];
    const result=source.filter(x=>x!==from);
    result.splice(result.indexOf(to),0,from);
    return result;
  }
  function reduced(){
    try{return !!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;}
    catch(_){return false;}
  }
  function animatePage(){
    const main=root.document?.querySelector(".content");
    if(!main||reduced())return;
    main.classList.remove("mc-page-arrive");
    void main.offsetWidth;
    main.classList.add("mc-page-arrive");
  }
  function pulse(el){
    if(!el||reduced()||typeof el.animate!=="function")return;
    el.animate([{transform:"scale(1)",filter:"brightness(1)"},{transform:"scale(1.025)",filter:"brightness(1.14)"},{transform:"scale(1)",filter:"brightness(1)"}],
      {duration:330,easing:"ease-out"});
  }
  function bindDashboardDrag(rootElement,onDrop){
    if(!rootElement||typeof onDrop!=="function")return;
    // Somente handles em modo de edição. Arraste de toque/caneta; mouse
    // mantém HTML5 drag-and-drop existente e setas acessíveis.
    const doc=rootElement.ownerDocument;
    rootElement.querySelectorAll("[data-dash-touch-drag]").forEach(handle=>{
      handle.addEventListener("pointerdown",event=>{
        if(!["touch","pen"].includes(event.pointerType))return;
        if(event.button!=null&&event.button!==0)return;
        const from=handle.dataset.dashTouchDrag;
        const source=handle.closest("[data-dash-widget],[data-dash-editor-row]");
        if(!source)return;
        const start={x:event.clientX,y:event.clientY};
        let dragging=false,ghost=null,lastTarget=null;
        const pointerId=event.pointerId;
        let lastX=event.clientX,lastY=event.clientY;
        const label=source.querySelector("h2")?.textContent||
          source.querySelector("label")?.textContent?.trim()||"Bloco";
        function createGhost(){
          ghost=doc.createElement("div");
          ghost.className="mc-drag-ghost";
          ghost.setAttribute("aria-hidden","true");
          ghost.textContent=label.slice(0,100);
          doc.body.appendChild(ghost);
          source.classList.add("mc-drag-source");
          handle.classList.add("mc-dragging-handle");
        }
        function position(){
          if(ghost)ghost.style.transform="translate3d("+Math.round(lastX+14)+"px,"+Math.round(lastY-30)+"px,0)";
        }
        function destination(){
          const under=doc.elementFromPoint?.(lastX,lastY);
          if(!under)return null;
          return under.closest?.("[data-dash-widget],[data-dash-editor-row]")||null;
        }
        function clean(){
          if(lastTarget)lastTarget.classList.remove("mc-drag-target");
          source.classList.remove("mc-drag-source");
          handle.classList.remove("mc-dragging-handle");
          ghost?.remove();
          handle.removeEventListener("pointermove",move);
          handle.removeEventListener("pointerup",end);
          handle.removeEventListener("pointercancel",cancel);
          handle.removeEventListener("lostpointercapture",cancel);
          try{if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);}catch(_){}
        }
        function move(ev){
          if(ev.pointerId!==pointerId)return;
          lastX=ev.clientX;lastY=ev.clientY;
          if(!dragging&&Math.hypot(lastX-start.x,lastY-start.y)<7)return;
          if(!dragging){dragging=true;createGhost();}
          ev.preventDefault();
          position();
          const next=destination();
          const valid=next&&next!==source&&
            (next.hasAttribute("data-dash-editor-row")===source.hasAttribute("data-dash-editor-row"));
          if(lastTarget&&lastTarget!==next)lastTarget.classList.remove("mc-drag-target");
          if(valid)next.classList.add("mc-drag-target");
          lastTarget=valid?next:null;
          // Rolagem progressiva ao aproximar-se das bordas do celular.
          const height=root.innerHeight||doc.documentElement.clientHeight;
          if(lastY>height-72)root.scrollBy?.(0,Math.min(21,Math.max(5,(lastY-(height-72))/3)));
          else if(lastY<80)root.scrollBy?.(0,-Math.min(21,Math.max(5,(80-lastY)/3)));
        }
        function end(ev){
          if(ev.pointerId!==pointerId)return;
          const target=dragging?lastTarget:null;
          const to=target?.getAttribute("data-dash-widget")||target?.getAttribute("data-dash-editor-row");
          clean();
          if(target&&from!==to)onDrop(from,to);
        }
        function cancel(ev){if(ev.pointerId!==pointerId)return;clean();}
        handle.addEventListener("pointermove",move);
        handle.addEventListener("pointerup",end);
        handle.addEventListener("pointercancel",cancel);
        handle.addEventListener("lostpointercapture",cancel);
        try{handle.setPointerCapture?.(pointerId);}catch(_){}
      });
    });
  }
  return {orderAfter,reduced,animatePage,pulse,bindDashboardDrag};
});