/* Dock adaptativo da Copilota Michelle. Sem alterações aos dados da operação. */
(function(root) {
  "use strict";
  const KEY="michelle.ai.dock.v1";
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(_){return {};}};
  const save=val=>{try{localStorage.setItem(KEY,JSON.stringify(val));}catch(_){}};
  let cfg=read(),dragging=false;
  const mobile=()=>root.matchMedia ? root.matchMedia("(max-width: 700px)").matches : root.innerWidth<=700;
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
  function bubblePosition() {
    const size=mobile()?50:56,margin=mobile()?12:20;
    const maxX=Math.max(margin,root.innerWidth-size-margin);
    const maxY=Math.max(margin,root.innerHeight-size-margin);
    let x=Number.isFinite(cfg.x)?cfg.x:root.innerWidth-size-margin;
    let y=Number.isFinite(cfg.y)?cfg.y:root.innerHeight-size-(mobile()?16:22);
    return {x:clamp(x,margin,maxX),y:clamp(y,margin,maxY),size,margin};
  }
  function getReturn() {
    let el=document.getElementById("mc-ai-return");
    if(!el) {
      el=document.createElement("button");
      el.id="mc-ai-return";el.type="button";el.className="mc-ai-return";
      el.textContent="✦";el.title="Reativar a Copilota Michelle";
      el.setAttribute("aria-label","Reativar o chat da Copilota Michelle");
      el.onclick=()=>{cfg.hidden=false;save(cfg);sync();};
      document.body.appendChild(el);
    }
    return el;
  }
  function getDropZone() {
    let el=document.getElementById("mc-ai-dropzone");
    if(!el) {
      el=document.createElement("div");el.id="mc-ai-dropzone";el.className="mc-ai-dropzone";
      el.textContent="↓ Arraste aqui para ocultar a copilota";
      el.setAttribute("aria-hidden","true");document.body.appendChild(el);
    }
    return el;
  }
  function sync() {
    const fab=document.querySelector(".assistant-fab");
    getReturn();getDropZone();
    document.body.classList.toggle("mc-ai-hidden",!!cfg.hidden);
    document.body.classList.toggle("mc-ai-sidebar-open",!!cfg.sidebar && !mobile());
    if(!fab)return;
    const p=bubblePosition(); cfg.x=p.x;cfg.y=p.y;
    fab.style.left=p.x+"px";fab.style.top=p.y+"px";
    fab.style.right="auto";fab.style.bottom="auto";
    fab.setAttribute("aria-label",cfg.hidden?"Copilota ocultada":"Abrir ou fechar Copilota Michelle; arraste para posicionar");
    const win=document.querySelector(".assistant-window");
    if(!win)return;
    if(cfg.sidebar && !mobile()) {
      win.style.left="";win.style.top="";win.style.right="";win.style.bottom="";
    } else {
      const w=mobile()?Math.min(root.innerWidth-24,430):Math.min(430,root.innerWidth-28);
      const h=Math.min(610,Math.max(200,root.innerHeight-120));
      const x=cfg.windowX!=null&&!mobile()?cfg.windowX:(p.x>root.innerWidth/2?p.x-w+54:p.x);
      const y=cfg.windowY!=null&&!mobile()?cfg.windowY:p.y-h-15;
      win.style.left=clamp(x,12,root.innerWidth-w-12)+"px";
      win.style.top=clamp(y,12,root.innerHeight-Math.min(h,root.innerHeight-30)-12)+"px";
      win.style.right="auto";win.style.bottom="auto";
    }
    const dockButton=document.querySelector("[data-mc-ai-sidebar]");
    if(dockButton) {
      dockButton.textContent=cfg.sidebar?"Flutuar":"Barra lateral";
      dockButton.setAttribute("aria-pressed",String(!!cfg.sidebar));
    }
  }
  function snap(x,y,size) {
    const edge=mobile()?18:26;
    const limX=Math.max(edge,root.innerWidth-size-edge);
    const limY=Math.max(edge,root.innerHeight-size-edge);
    x=clamp(x,edge,limX);y=clamp(y,edge,limY);
    if(x<70)x=edge;
    if(x>root.innerWidth-size-70)x=limX;
    if(y<70)y=edge;
    if(y>root.innerHeight-size-115)y=limY;
    return {x,y};
  }
  function bindBubble(fab) {
    if(!fab||fab.dataset.mcDragBound)return;
    fab.dataset.mcDragBound="1";
    fab.addEventListener("click",e=>{
      if(fab.dataset.mcSuppressClick==="1") {
        e.preventDefault();e.stopImmediatePropagation();
        fab.dataset.mcSuppressClick="0";
      }
    },true);
    fab.addEventListener("pointerdown",e=>{
      if(e.button!==0||cfg.hidden)return;
      const origin=bubblePosition(),sx=e.clientX,sy=e.clientY;
      let didMove=false,px=origin.x,py=origin.y;
      const move=ev=>{
        if(!didMove&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>6)didMove=true;
        if(!didMove)return;
        dragging=true;
        document.body.classList.add("mc-ai-dragging");
        px=clamp(origin.x+ev.clientX-sx,4,root.innerWidth-origin.size-4);
        py=clamp(origin.y+ev.clientY-sy,4,root.innerHeight-origin.size-4);
        fab.style.left=px+"px";fab.style.top=py+"px";
        document.body.classList.toggle("mc-ai-close-target",mobile()&&py>root.innerHeight-origin.size-96);
      };
      const end=()=>{
        root.removeEventListener("pointermove",move);root.removeEventListener("pointerup",end);
        root.removeEventListener("pointercancel",end);
        document.body.classList.remove("mc-ai-dragging","mc-ai-close-target");
        dragging=false;
        if(!didMove)return;
        fab.dataset.mcSuppressClick="1";
        if(mobile()&&py>root.innerHeight-origin.size-96) {
          cfg.hidden=true;
          // A janela já aberta é fechada usando o botão público do assistente.
          if(document.querySelector(".assistant-layer.open"))document.querySelector("[data-assistant-close]")?.click();
        } else {
          const point=snap(px,py,origin.size);cfg.x=point.x;cfg.y=point.y;
          cfg.windowX=null;cfg.windowY=null;
        }
        save(cfg);sync();
      };
      root.addEventListener("pointermove",move);root.addEventListener("pointerup",end);
      root.addEventListener("pointercancel",end);
    });
  }
  function bindWindow() {
    const head=document.querySelector(".assistant-window-header");
    const win=document.querySelector(".assistant-window");
    if(!head||!win||head.dataset.mcDragBound)return;
    head.dataset.mcDragBound="1";
    head.addEventListener("pointerdown",e=>{
      if(mobile()||cfg.sidebar||e.button!==0||e.target.closest("button"))return;
      const box=win.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
      let didMove=false,xx=box.left,yy=box.top;
      const move=ev=>{
        if(!didMove&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)didMove=true;
        if(!didMove)return;
        xx=clamp(box.left+ev.clientX-sx,8,root.innerWidth-box.width-8);
        yy=clamp(box.top+ev.clientY-sy,8,root.innerHeight-box.height-8);
        win.style.left=xx+"px";win.style.top=yy+"px";
        win.style.right="auto";win.style.bottom="auto";
      };
      const end=()=>{
        root.removeEventListener("pointermove",move);root.removeEventListener("pointerup",end);root.removeEventListener("pointercancel",end);
        if(!didMove)return;
        cfg.windowX=xx<35?8:xx>root.innerWidth-box.width-35?root.innerWidth-box.width-8:xx;
        cfg.windowY=yy<35?8:yy>root.innerHeight-box.height-35?root.innerHeight-box.height-8:yy;
        save(cfg);sync();
      };
      root.addEventListener("pointermove",move);root.addEventListener("pointerup",end);root.addEventListener("pointercancel",end);
    });
  }
  function toggleSidebar() {if(mobile())return;cfg.sidebar=!cfg.sidebar;save(cfg);sync();}
  function wire() {
    const fab=document.querySelector(".assistant-fab");
    bindBubble(fab);bindWindow();
    const btn=document.querySelector("[data-mc-ai-sidebar]");
    if(btn&&!btn.dataset.mcWire) {btn.dataset.mcWire="1";btn.addEventListener("click",toggleSidebar);}
    sync();
  }
  root.addEventListener("resize",()=>{cfg.windowX=null;cfg.windowY=null;sync();});
  root.MCDock={wire,sync,toggleSidebar};
})(window);
