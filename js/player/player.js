// ========================================================================
// DragonBlood · Player
// P (live player pose), stamina, jumping, damage, on-foot movement, camera,
// scene switching (setScene + the scene contract), strike/use/breath/salve.
// ========================================================================
'use strict';
// Live pose (not saved). mode: foot | mounted | falling | chute | grabbed
const P={x:0,y:0,z:4,yaw:0,pitch:0,hp:100,bob:0,mode:'foot',blocking:false,st:100,stDelay:0,winded:false,vy:0,grounded:true};
// Sprint stamina: drains while sprinting, refills after a short pause (faster when still).
// Emptying it leaves you winded until 30% — you cannot feather sprint at zero.
const ST_MAX=100,ST_DRAIN=20,ST_REGEN=16,ST_DELAY=.8,ST_RECOVER=.3;
const JUMP_V=7.2,JUMP_G=22; // on-foot jump (~1.2 m apex); Space / Jump button
// --- stamina & jumping
let stShown=null;
function updateStaminaHUD(){
  const show=started&&!!cur&&P.mode==='foot';
  if(show!==stShown){$('#stBox').hidden=!show;stShown=show;}
  if(!show)return;
  $('#stFill').style.width=(P.st/ST_MAX*100)+'%';
  $('#stText').textContent=Math.floor(P.st);
  const bar=$('#stFill').parentElement;
  if(bar.classList.contains('winded')!==P.winded){
    bar.classList.toggle('winded',P.winded);
    $('#stLab').innerHTML=P.winded?'Winded':'Stamina <kbd style="font-family:var(--mono);color:var(--brass)">Shift</kbd>';
  }
}
// --- scene switching
let cur=null,started=false,modalOpen=false,missionOver=false; // cur = active scene object
let swingT=0,swingCD=0,hurtA=0;
// Scene contract: a scene object (built by buildHub, buildEggMission, ...) has
//   kind, scene, colliders, interact[], radius, update(dt,T,active)
// and may add: move, placeCam, cleanup, onKey, onAttack, onBreath, onDeath, abandon,
//   squireTargets, arrowTargets, scrollTargets, dynCollide, dragonHud, keyHints, hint.
// Swap the active scene and reset per-scene player state.
function setScene(next){
  if(cur){if(cur.cleanup)cur.cleanup();cur.scene.remove(camera);disposeScene(cur.scene);}
  cur=next;cur.scene.add(camera);
  P.y=0;P.vy=0;P.grounded=true;P.mode='foot';P.st=ST_MAX;P.stDelay=0;P.winded=false;
  dpReset();spReset();arrowsReset();sqSpawn();updateHUD();updateChrome();
}
function tryJump(){
  if(!started||modalOpen||missionOver||!cur||P.mode!=='foot'||!P.grounded)return false;
  P.vy=JUMP_V;P.grounded=false;
  if(CH)chantCancel('broke: you jumped.');
  return true;
}
// --- damage, looking, movement
// Block (hold RMB): 90% of player-melee only. Dragons, critters, projectiles, fire, falls ignore block.
const BLOCK_REDUCE=.9;let blockToastT=0;
function hurt(n,src){
  if(!started||missionOver||cur.kind==='hub')return;
  if(src==='player-melee'&&P.blocking){
    n*=1-BLOCK_REDUCE;TUTF.blocked=true;
    if(performance.now()-blockToastT>1500){toast('Blocked','good');blockToastT=performance.now();}
  }
  if(DPS.buff.hide>0)n*=1-hidePct();
  n*=1-barkStat('def');
  if(CH&&n>0)chantCancel('was interrupted by damage.');
  P.hp-=n;hurtA=Math.min(.9,hurtA+.35+n/40);
  if(P.hp<=0){P.hp=0;cur.onDeath&&cur.onDeath();}
}
function look(dx,dy){P.yaw-=dx*.0022;P.pitch=clamp(P.pitch-dy*.0022,-1.35,1.35);}
const fwd=()=>({x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)});
function facing(x,z){const f=fwd(),dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz)||1;return(dx*f.x+dz*f.z)/d;}

// On-foot movement with sprint, jump and collision (scenes may replace this with cur.move).
function updatePlayer(dt){
  P.blocking=!!(keys.Mouse2&&!modalOpen&&!missionOver&&wType()!=='bow');
  let fx=0,fz=0;
  if(keys.KeyW||keys.ArrowUp)fz+=1;
  if(keys.KeyS||keys.ArrowDown)fz-=1;
  if(keys.KeyD||keys.ArrowRight)fx+=1;
  if(keys.KeyA||keys.ArrowLeft)fx-=1;
  fx+=joy.x;fz-=joy.y;
  const len=Math.hypot(fx,fz);
  if(len>1){fx/=len;fz/=len;}
  const wantSprint=(keys.ShiftLeft||keys.ShiftRight||Math.hypot(joy.x,joy.y)>.95)&&len>.1;
  const sprint=wantSprint&&!P.blocking&&!P.winded&&P.st>0;
  if(sprint){
    P.st=Math.max(0,P.st-ST_DRAIN*dt);
    P.stDelay=ST_DELAY;
    if(P.st<=0){P.winded=true;toast('Out of breath. Stamina must recover before you can sprint again.','bad');}
  }else{
    P.stDelay=Math.max(0,P.stDelay-dt);
    if(P.stDelay<=0){
      const regenMul=(len>.1?1:1.5)*(DPS.buff.wind>0?1+windPct():1);
      P.st=Math.min(ST_MAX,P.st+ST_REGEN*regenMul*dt);
    }
    if(P.winded&&P.st>=ST_MAX*ST_RECOVER)P.winded=false;
  }
  const sp=(sprint?11:7)*(cur.speedMul?cur.speedMul():1);
  const s=Math.sin(P.yaw),c=Math.cos(P.yaw);
  P.x+=(-s*fz+c*fx)*sp*dt;
  P.z+=(-c*fz-s*fx)*sp*dt;
  for(const col of cur.colliders){
    const dx=P.x-col.x,dz=P.z-col.z,d=Math.hypot(dx,dz),m=col.r+.5;
    if(d<m&&d>1e-4){P.x=col.x+dx/d*m;P.z=col.z+dz/d*m;}
  }
  if(cur.dynCollide)cur.dynCollide();
  const r=Math.hypot(P.x,P.z);
  if(r>cur.radius){P.x*=cur.radius/r;P.z*=cur.radius/r;}
  // vertical: jump + gravity (flat ground at y=0)
  if(!P.grounded||P.vy!==0){
    P.vy-=JUMP_G*dt;
    P.y+=P.vy*dt;
    if(P.y<=0){P.y=0;P.vy=0;P.grounded=true;}
  }else P.y=0;
  if(len>.1&&P.grounded)P.bob+=dt*(sprint?13:9);
}
// First-person camera from the player pose.
function placeCamera(){
  weaponRig.visible=started;
  const bob=P.grounded?Math.sin(P.bob)*.05:0;
  camera.position.set(P.x,P.y+1.7+bob,P.z);
  camera.rotation.set(P.pitch,P.yaw,0);
}
// Weapon swing / bob animation.
function updateViewmodel(dt){const g=weaponRig.userData.blade;if(!g)return;
  if(swingT>0){swingT+=dt/WTYPES[wType()].anim;if(swingT>=1)swingT=0;}swingCD=Math.max(0,swingCD-dt);
  const s=swingT>0?Math.sin(swingT*Math.PI):0,b=Math.sin(P.bob*.5)*.015;
  P.blockT=(P.blockT||0)+((P.blocking&&P.mode==='foot'?1:0)-(P.blockT||0))*Math.min(1,dt*14);const k=P.blockT;
  if(wType()==='bow'){// draw back then loose: the nocked arrow vanishes for the second half of the cycle
    const pull=swingT>0&&swingT<.5?Math.sin(swingT*Math.PI):0;g.position.set(.34,-.3+b,-.95+pull*.08);g.rotation.set(0,Math.PI/2,.12);
    if(g.userData.arrow){g.userData.arrow.visible=!(swingT>=.5);g.userData.arrow.position.x=.2-pull*.15;}if(g.userData.string)g.userData.string.position.x=-.17-pull*.15;}
  else if(wType()==='dagger'){// quick forward stab
    g.rotation.set(-1.2+s*.2+k*1.2,k*.2,-.1+k*1.2);g.position.set(.36-k*.3,-.4+b+k*.2,-.62-s*.35+k*.1);}
  else{g.rotation.set(-.3-s*1.5+k*.3,s*.5+k*.2,-.25+s*.9+k*1.35);g.position.set(.42-s*.32-k*.4,-.42+s*.1+b+k*.22,-.7-s*.2+k*.12);}
  if(eggVM.visible){eggVM.rotation.y+=dt*.8;eggVM.position.y=-.5+b;}}

// --- player actions (strike, use, breath, salve)
function attack(){if(!started||modalOpen||!cur||swingCD>0||P.blocking)return;const T_=WTYPES[wType()];swingCD=T_.cd/(1+barkStat('spd'));swingT=.001;
  const crit=Math.random()<barkStat('crit'),dmg=weaponDmg()*(DPS.buff.fury>0?1+furyPct():1)*(crit?2:1);
  if(wType()!=='bow'&&P.mode==='foot'){const L=WEAPON_LOOKS[S.weapon]||{};fxSlash(wType(),crit?0xffd060:L.rune);}// swoosh
  if(wType()==='bow'){if(P.mode==='foot')fireArrow(dmg);else cur.onAttack&&cur.onAttack(dmg);return;}
  cur.onAttack&&cur.onAttack(dmg);}
