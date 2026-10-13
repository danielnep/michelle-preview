/* Copiloto compacto: encaixe magnético, redimensionamento e arraste no celular. */
(function(root){
  "use strict";
  const KEY="michelle.ai.compact-dock.v1";
  const read=()=>{try{return JSON.parse(root.localStorage.getItem(KEY)||"{}");}catch(_){return {};}};
  const save=state=>{try{root.localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}};
  const clamp=(n,a,b)=>Math.max(a,Math.min(n,Math.max(a,b)));
  const mobile=()=>root.matchMedia?root.matchMedia("(max-width:700px)").matches:root.innerWidth<=700;
  let options=read();
  const bound=new WeakSet();
  function dimensions() {
    const maxW=Math.max(220,root.innerWidth-24),maxH=Math.max(200,root.innerHeight-24);
    return {
      width:clamp(Number(options.width)||(mobile()?Math.min(360,maxW):400),Math.min(250,maxW),Math.min(660,maxW)),
      height:clamp(Number(options.height)||Math.min(520,maxH),Math.min(270,maxH),maxH)
    };
  }
  function snap(value,max,threshold=32) {
    return value<=threshold?8:value>=max-threshold?max:value;
  }
  function apply() {
    const win=root.document.querySelector(".assistant-window");
    if(!win)return;
    if(root.document.body.classList.contains("mc-ai-sidebar-open")&&!mobile()){
      win.style.width="";win.style.height="";return;
    }
    const {width,height}=dimensions();
    win.style.width=width+"px";win.style.height=height+"px";
    win.style.maxHeight="calc(100dvh - 24px)";
    const maxX=Math.max(8,root.innerWidth-width-8),maxY=Math.max(8,root.innerHeight-height-8);
    const currentX=mobile()&&Number.isFinite(options.x)?options.x:Number.parseFloat(win.style.left);
    const currentY=mobile()&&Number.isFinite(options.y)?options.y:Number.parseFloat(win.style.top);
    win.style.left=clamp(Number.isFinite(currentX)?currentX:maxX,8,maxX)+"px";
    win.style.top=clamp(Number.isFinite(currentY)?currentY:maxY,8,maxY)+"px";
    win.style.right="auto";win.style.bottom="auto";
  }
  function connectResize(win) {
    const handle=win.querySelector("[data-mc-ai-resize]");
    if(!handle||bound.has(handle))return;
    bound.add(handle);
    function resizeTo(width,height){
      const maxW=Math.max(220,root.innerWidth-24),maxH=Math.max(200,root.innerHeight-24);
      options.width=clamp(width,Math.min(250,maxW),Math.min(660,maxW));
      options.height=clamp(height,Math.min(270,maxH),maxH);
      apply();
    }
    handle.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      const startX=event.clientX,startY=event.clientY;
      const current=dimensions();
      let moved=false;
      const move=e=>{
        moved=true;
        resizeTo(current.width+e.clientX-startX,current.height+e.clientY-startY);
      };
      const finish=()=>{
        root.removeEventListener("pointermove",move);
        root.removeEventListener("pointerup",finish);
        root.removeEventListener("pointercancel",finish);
        if(moved)save(options);
      };
      root.addEventListener("pointermove",move);
      root.addEventListener("pointerup",finish);
      root.addEventListener("pointercancel",finish);
    });
    handle.addEventListener("keydown",event=>{
      const step=event.shiftKey?40:16;
      if(!["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(event.key))return;
      event.preventDefault();
      const current=dimensions();
      resizeTo(current.width+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0),
        current.height+(event.key==="ArrowDown"?step:event.key==="ArrowUp"?-step:0));
      save(options);
    });
  }
  function connectMobileDrag(win) {
    const header=win.querySelector(".assistant-window-header");
    if(!header||bound.has(header))return;
    bound.add(header);
    header.addEventListener("pointerdown",event=>{
      if(!mobile()||event.button!==0||event.target.closest("button"))return;
      const box=win.getBoundingClientRect();
      const startX=event.clientX,startY=event.clientY;
      const originX=Number.parseFloat(win.style.left)||box.left||8;
      const originY=Number.parseFloat(win.style.top)||box.top||8;
      let moved=false,nowX=originX,nowY=originY;
      const move=e=>{
        if(!moved&&Math.hypot(e.clientX-startX,e.clientY-startY)<7)return;
        moved=true;
        const d=dimensions();
        nowX=clamp(originX+e.clientX-startX,8,root.innerWidth-d.width-8);
        nowY=clamp(originY+e.clientY-startY,8,root.innerHeight-d.height-8);
        win.style.left=nowX+"px";win.style.top=nowY+"px";
      };
      const finish=()=>{
        root.removeEventListener("pointermove",move);
        root.removeEventListener("pointerup",finish);
        root.removeEventListener("pointercancel",finish);
        if(!moved)return;
        const d=dimensions();
        const maxX=Math.max(8,root.innerWidth-d.width-8),maxY=Math.max(8,root.innerHeight-d.height-8);
        options.x=snap(nowX,maxX);options.y=snap(nowY,maxY);
        save(options);apply();
        win.classList.remove("mc-ai-magnet");
        void win.offsetWidth;
        win.classList.add("mc-ai-magnet");
      };
      root.addEventListener("pointermove",move);
      root.addEventListener("pointerup",finish);
      root.addEventListener("pointercancel",finish);
    });
  }
  const dock=root.MCDock;
  if(!dock)return;
  const original=dock.wire.bind(dock);
  dock.wire=function(){
    original();
    const win=root.document.querySelector(".assistant-window");
    if(!win)return;
    connectResize(win);connectMobileDrag(win);apply();
  };
  root.addEventListener("resize",apply);
  root.MCCompactDock={dimensions,apply};
})(window);
