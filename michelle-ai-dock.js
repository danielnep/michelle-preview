/* Duas barras deslizantes: navegação e Copiloto. Sem botão flutuante. */
(function(root){
 'use strict';
 const KEY='michelle.panels.v2',doc=root.document;
 let cfg={width:380,pinned:true,navCollapsed:false},leftTimer=null,rightTimer=null,suppressUntil=0,suppressSide='';
 try{cfg={...cfg,...JSON.parse(root.localStorage.getItem(KEY)||'{}')};}catch(_){}
 const save=()=>{try{root.localStorage.setItem(KEY,JSON.stringify(cfg));}catch(_){}};
 const compact=()=>root.innerWidth<=900;
 const reduced=()=>!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const b=()=>root.MichelleBridge;
 const state=()=>b()?.getState();
 const aiAllowed=()=>!root.MCAccess||root.MCAccess.owner||root.MCAccess.rights?.ai;
 const clamp=(n,a,z)=>Math.max(a,Math.min(z,n));
 function dimensions(){
  const nav=state()?.navCollapsed?0:253;
  return {width:compact()?root.innerWidth:clamp(Number(cfg.width)||380,280,Math.max(280,Math.min(520,root.innerWidth-(cfg.pinned?nav+320:24)))),height:root.innerHeight};
 }
 function navOpen(){return !!state()&&(compact()?state().sidebar:!state().navCollapsed);}
 function sync(){
  const s=state();if(!s)return;
  if(s.navCollapsed===null||s.navCollapsed===undefined)s.navCollapsed=!!cfg.navCollapsed;
  doc.body.classList.toggle('mc-nav-collapsed',!compact()&&s.navCollapsed);
  doc.body.classList.toggle('mc-nav-open',compact()&&s.sidebar);
  doc.body.classList.toggle('mc-chat-open',!!s.assistantOpen&&aiAllowed());
  doc.body.classList.toggle('mc-chat-pinned',!!s.assistantOpen&&cfg.pinned&&!compact()&&aiAllowed());
  doc.body.classList.remove('mc-ai-hidden','mc-ai-sidebar-open');
  doc.body.style.setProperty('--mc-chat-width',dimensions().width+'px');
  const nav=doc.querySelector('.sidebar'),win=doc.querySelector('.assistant-window');
  if(nav){nav.inert=compact()?!s.sidebar:!!s.navCollapsed;nav.querySelector('.brand')?.setAttribute('data-panel-drag','left');nav.querySelector('.sidebar-close')?.setAttribute('aria-label','Recolher navegação');}
  if(win){win.inert=!s.assistantOpen;win.setAttribute('aria-hidden',String(!s.assistantOpen));win.setAttribute('aria-modal',String(compact()));}
  const toggle=doc.querySelector('[data-toggle]');if(toggle){toggle.setAttribute('aria-expanded',String(navOpen()));toggle.setAttribute('aria-label',navOpen()?'Recolher barra de navegação':'Abrir barra de navegação');}
  const pin=doc.querySelector('[data-mc-ai-pin]');if(pin){pin.setAttribute('aria-pressed',String(cfg.pinned));pin.setAttribute('aria-label',cfg.pinned?'Desafixar Copiloto':'Fixar Copiloto');pin.title=cfg.pinned?'Desafixar Copiloto':'Fixar Copiloto';}
  const edge=doc.querySelector('.mc-chat-edge');if(edge){edge.hidden=!aiAllowed()||s.assistantOpen;edge.classList.toggle('has-insight',!!root.MCAutoReview?.current());}
  let left=doc.getElementById('mc-nav-edge');
  if(!left){left=doc.createElement('button');left.id='mc-nav-edge';left.type='button';left.className='mc-nav-edge';left.dataset.panelDrag='left';left.setAttribute('aria-label','Abrir navegação');left.setAttribute('aria-controls','panel-navigation');left.innerHTML='<span aria-hidden="true">☰</span>';left.onclick=()=>openNav();doc.body.appendChild(left);}
  left.hidden=navOpen();
 }
 function arrive(node,side){if(!node||reduced())return;node.classList.remove('mc-arrive-'+side);void node.offsetWidth;node.classList.add('mc-arrive-'+side);}
 function openNav(){
  if(!state())return;root.clearTimeout(leftTimer);
  if(compact()){state().sidebar=true;state().assistantOpen=false;}else{state().navCollapsed=false;cfg.navCollapsed=false;save();}
  b().render();arrive(doc.querySelector('.sidebar'),'left');doc.querySelector('.sidebar-close')?.focus({preventScroll:true});
 }
 function closeNav(after){
  if(!state())return;root.clearTimeout(leftTimer);
  if(compact())state().sidebar=false;else{state().navCollapsed=true;cfg.navCollapsed=true;save();}
  const nav=doc.querySelector('.sidebar');
  const end=()=>{if(typeof after==='function')after();else b()?.render();doc.querySelector('[data-toggle]')?.focus({preventScroll:true});};
  if(nav&&!reduced()){nav.inert=true;nav.classList.add('mc-leave-left');leftTimer=root.setTimeout(end,240);}else end();
 }
 function toggleNav(){if(navOpen())closeNav();else openNav();}
 function openChat(){
  if(!state()||!aiAllowed())return;root.clearTimeout(rightTimer);state().assistantOpen=true;
  if(compact())state().sidebar=false;
  b().render();arrive(doc.querySelector('.assistant-window'),'right');doc.querySelector('.mc-chat-back')?.focus({preventScroll:true});
 }
 function closeChat(){
  if(!state())return;root.clearTimeout(rightTimer);state().assistantOpen=false;
  const win=doc.querySelector('.assistant-window');
  const end=()=>{b()?.render();doc.querySelector('.mc-chat-edge')?.focus({preventScroll:true});};
  if(win&&!reduced()){win.inert=true;win.classList.add('mc-leave-right');rightTimer=root.setTimeout(end,240);}else end();
 }
 function togglePin(){if(compact())return;cfg.pinned=!cfg.pinned;save();sync();}
 function gestureDecision(side,dx,dy,open){
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return null;
  if(side==='left')return dx>0&&!open?'open':dx<0&&open?'close':null;
  return dx<0&&!open?'open':dx>0&&open?'close':null;
 }
 function resizeWidth(value){cfg.width=clamp(value,280,520);save();sync();}
 function wire(){
  doc.querySelectorAll('.assistant-fab,#mc-ai-return,#mc-ai-dropzone').forEach(n=>n.remove());
  const pin=doc.querySelector('[data-mc-ai-pin]');if(pin&&!pin.dataset.liveBound){pin.dataset.liveBound='1';pin.onclick=togglePin;}
  const handle=doc.querySelector('[data-mc-ai-resize]');
  if(handle&&!handle.dataset.liveBound){
   handle.dataset.liveBound='1';
   handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();resizeWidth(dimensions().width+(e.key==='ArrowLeft'?16:-16));});
   handle.addEventListener('pointerdown',e=>{
    if(compact()||(e.button!=null&&e.button!==0))return;e.preventDefault();
    const x=e.clientX,width=dimensions().width;
    const move=ev=>resizeWidth(width+x-ev.clientX);
    const end=()=>{root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',end);root.removeEventListener('pointercancel',end);};
    root.addEventListener('pointermove',move);root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
   });
  }
  sync();
 }
 doc.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-panel-drag]');if(!handle||!state()||(e.button!=null&&e.button!==0))return;
  if(e.target.closest('button,input,textarea,select,a')!==handle && e.target.closest('button,input,textarea,select,a'))return;
  const side=handle.dataset.panelDrag,startX=e.clientX,startY=e.clientY;
  const open=side==='left'?navOpen():state().assistantOpen;
  const panel=doc.querySelector(side==='left'?'.sidebar':'.assistant-window');
  let dx=0,dy=0,dragging=false;
  const move=ev=>{
   if(e.pointerId!==ev.pointerId)return;dx=ev.clientX-startX;dy=ev.clientY-startY;
   if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.15)return;dragging=true;ev.preventDefault();
   if(open&&panel){const shift=side==='left'?Math.min(0,dx):Math.max(0,dx);panel.classList.add('mc-panel-dragging');panel.style.setProperty('--mc-drag-shift',shift+'px');}
  };
  const finish=(ev,cancelled=false)=>{
   if(e.pointerId!==ev.pointerId)return;
   root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',end);root.removeEventListener('pointercancel',cancel);
   panel?.classList.remove('mc-panel-dragging');panel?.style.removeProperty('--mc-drag-shift');
   if(!dragging)return;suppressUntil=Date.now()+350;suppressSide=side;
   const action=cancelled?null:gestureDecision(side,dx,dy,open);
   if(action==='open')side==='left'?openNav():openChat();else if(action==='close')side==='left'?closeNav():closeChat();else sync();
  };
  const end=ev=>finish(ev),cancel=ev=>finish(ev,true);
  root.addEventListener('pointermove',move,{passive:false});root.addEventListener('pointerup',end);root.addEventListener('pointercancel',cancel);
 });
 doc.addEventListener('click',e=>{if(Date.now()<suppressUntil&&e.target.closest('[data-panel-drag]')?.dataset.panelDrag===suppressSide){e.preventDefault();e.stopImmediatePropagation();}},true);
 doc.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!compact()||!state()?.assistantOpen)return;
  const win=doc.querySelector('.assistant-window');if(!win)return;
  const buttons=[...win.querySelectorAll('button:not(:disabled),textarea,input,select,a[href]')].filter(n=>!n.hidden&&n.getAttribute('tabindex')!=='-1');
  const first=buttons[0],last=buttons.at(-1);
  if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus();}
 });
 root.addEventListener('resize',sync);
 root.MCDock={wire,sync,openChat,closeChat,openNav,closeNav,toggleNav,togglePin,toggleSidebar:togglePin,dimensions,gestureDecision,getConfig:()=>({...cfg})};
})(window);
