// ========================================================================
// DragonBlood · Input
// Keyboard, mouse, pointer lock and touch controls.
// ========================================================================
'use strict';
// --- keyboard
const keys={};
addEventListener('keydown',e=>{
  if(!started)return;
  if(modalOpen){if(e.code==='Escape'){closePanel();e.preventDefault();}return;}
  keys[e.code]=true;if(e.repeat)return;
  if(cur&&cur.onKey&&!missionOver&&cur.onKey(e.code)){e.preventDefault();return;}
  if(CH&&chantKey(e.code)){e.preventDefault();return;}
  if(e.code==='Space'){if(tryJump())e.preventDefault();}
  else if(e.code==='KeyE')interact();else if(e.code==='KeyF')attack();else if(e.code==='KeyQ')breath();else if(e.code==='KeyH')drinkSalve();
  else if(/^Digit[1-4]$/.test(e.code))castDP(+e.code[5]-1);
  else if(e.code==='KeyZ')castScroll();
  else if(e.code==='Tab'){e.preventDefault();TUTF.tab=true;openPanel(P_kingdom);}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
// --- mouse & pointer lock
let drag=null;
cvs.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousedown',e=>{if(e.button===2&&started&&!modalOpen)keys.Mouse2=true;});
addEventListener('mouseup',e=>{if(e.button===2)keys.Mouse2=false;});
cvs.addEventListener('mousedown',e=>{if(!started||modalOpen||isTouch||e.button===2)return;if(locked){if(e.button===0)attack();return;}drag={x:e.clientX,y:e.clientY,moved:false};});
addEventListener('mousemove',e=>{if(!started||modalOpen)return;if(locked){look(e.movementX||0,e.movementY||0);}else if(drag&&(e.buttons&1)){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;look(dx*1.4,dy*1.4);drag.x=e.clientX;drag.y=e.clientY;if(Math.abs(dx)+Math.abs(dy)>1)drag.moved=true;}});
addEventListener('mouseup',e=>{if(drag&&!drag.moved&&!locked&&!modalOpen&&started&&e.button===0){if(lockFailed)attack();else requestLock();}drag=null;});
function requestLock(){try{const r=cvs.requestPointerLock();if(r&&r.catch)r.catch(()=>{lockFailed=true;updateLockHint();});}catch(err){lockFailed=true;updateLockHint();}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cvs;updateLockHint();});
document.addEventListener('pointerlockerror',()=>{lockFailed=true;updateLockHint();});
// --- touch: joystick, look pad, action buttons
const joy={id:null,ox:0,oy:0,x:0,y:0};const jz=$('#joyZone'),knob=$('#joyKnob'),lz=$('#lookZone');
jz.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;try{jz.setPointerCapture(e.pointerId);}catch(err){}});
jz.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx*=m/l;dy*=m/l;}joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`;});
const jend=e=>{if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;knob.style.transform='';};
jz.addEventListener('pointerup',jend);jz.addEventListener('pointercancel',jend);
let lk=null;
lz.addEventListener('pointerdown',e=>{lk={id:e.pointerId,x:e.clientX,y:e.clientY};try{lz.setPointerCapture(e.pointerId);}catch(err){}});
lz.addEventListener('pointermove',e=>{if(!lk||e.pointerId!==lk.id)return;look((e.clientX-lk.x)*1.5,(e.clientY-lk.y)*1.5);lk.x=e.clientX;lk.y=e.clientY;});
lz.addEventListener('pointerup',()=>{lk=null;});lz.addEventListener('pointercancel',()=>{lk=null;});
$('#tAtk').addEventListener('pointerdown',e=>{e.preventDefault();attack();});
$('#tUse').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('#tBreath').addEventListener('pointerdown',e=>{e.preventDefault();breath();});
$('#tHeal').addEventListener('pointerdown',e=>{e.preventDefault();drinkSalve();});
$('#tJump').addEventListener('pointerdown',e=>{e.preventDefault();tryJump();});
const rideTap=code=>e=>{e.preventDefault();if(started&&!modalOpen&&cur&&cur.onKey&&!missionOver)cur.onKey(code);};
$('#tRide').addEventListener('pointerdown',rideTap('KeyR'));$('#tGrab').addEventListener('pointerdown',rideTap('KeyG'));$('#tSend').addEventListener('pointerdown',rideTap('KeyV'));
$('#tDive').addEventListener('pointerdown',e=>{e.preventDefault();touchHold.dive=true;});
for(const ev of['pointerup','pointercancel','pointerleave'])$('#tDive').addEventListener(ev,()=>{touchHold.dive=false;});
$('#qteKeys').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-k]');if(b&&cur&&cur.onKey){e.preventDefault();cur.onKey(b.dataset.k);}});
$('#kBadge').addEventListener('click',()=>{if(started&&!modalOpen){TUTF.tab=true;openPanel(P_kingdom);}});
$('#menuBtn').addEventListener('click',()=>{if(started&&!(curPanel&&curPanel.noClose)){resetArm=false;openPanel(P_menu);}});
