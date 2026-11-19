// ========================================================================
// DragonBlood · HUD
// Toasts, objective text, boss bar, stat bars and the per-frame HUD.
// ========================================================================
'use strict';
// --- toasts, objective, boss bar
const toastsEl=$('#toasts');
function toast(msg,tone){const d=document.createElement('div');d.className='toast'+(tone?' '+tone:'');d.textContent=msg;toastsEl.appendChild(d);while(toastsEl.children.length>4)toastsEl.firstChild.remove();setTimeout(()=>d.remove(),4200);}
function setObjective(t){const o=$('#objective');if(o.textContent!==t)o.textContent=t;}
function showBoss(name,f){$('#bossWrap').hidden=false;$('#bossName').textContent=name;setBoss(f);}
function setBoss(f){$('#bossFill').style.width=(clamp(f,0,1)*100)+'%';}
function hideBoss(){$('#bossWrap').hidden=true;}
// --- stat bars & chrome
function updateHUD(){if(!S.faction)return;const k=kingdom();
  $('#kTier').textContent=k.name;$('#kLv').textContent='Lv '+k.level;$('#kFac').textContent=FACTIONS[S.faction].name;
  $('#rGold').textContent=TEST_MODE?'∞':S.gold;$('#rMat').textContent=TEST_MODE?'∞':S.material;$('#rHoly').textContent=S.holy+'/7';$('#rLvl').textContent='Lv '+S.playerLvl;$('#rXp').style.width=(S.xp/(100*S.playerLvl)*100)+'%';
  $('#salveText').textContent=S.salves;}
const isTouch=(window.matchMedia&&matchMedia('(pointer: coarse)').matches)||('ontouchstart' in window);
let locked=false,lockFailed=false;
function updateChrome(){const inGame=started;
  $('#hud').hidden=!inGame;$('#cross').hidden=!inGame||modalOpen;$('#touch').hidden=!(inGame&&isTouch&&!modalOpen);
  $('#hpBox').hidden=!inGame||!cur||cur.kind==='hub';weaponRig.visible=inGame;
  const ride=!!(cur&&cur.kind==='patrol');document.querySelectorAll('.ridebtn').forEach(b=>b.hidden=!ride);document.querySelector('.tbtns').classList.toggle('ride',ride);
  if(!ride)$('#drBox').hidden=true;updateLockHint();}
function updateLockHint(){const h=$('#lockHint');const show=started&&!modalOpen&&!locked&&!isTouch;h.hidden=!show;if(show)h.textContent=lockFailed?'Drag to look. Press F to strike.':'Click the view to look.';}
// --- per-frame HUD
let hudAcc=0,liveAcc=0;const DEFAULT_KEYS=$('#keyHints').innerHTML;
function hudTick(dt){hurtA=Math.max(0,hurtA-dt*1.6);$('#hurt').style.opacity=hurtA;
  if(!started)return;hudAcc+=dt;liveAcc+=dt;
  if(curPanel&&curPanel.live&&liveAcc>1){liveAcc=0;renderPanel();}
  if(hudAcc<.15)return;hudAcc=0;
  // prompt
  const pr=$('#prompt');const it=!modalOpen&&cur?nearestInteract():null;const hint=!it&&!modalOpen&&cur&&cur.hint?cur.hint():null;
  if(it){pr.hidden=false;const t=`<kbd>${isTouch?'Use':'E'}</kbd>${it.label()}`;if(pr.innerHTML!==t)pr.innerHTML=t;}else if(hint){pr.hidden=false;if(pr.innerHTML!==hint)pr.innerHTML=hint;}else pr.hidden=true;
  const kh=$('#keyHints'),khT=cur&&cur.keyHints?cur.keyHints():DEFAULT_KEYS;if(kh.innerHTML!==khT)kh.innerHTML=khT;
  const db=$('#drBox'),dh=cur&&cur.dragonHud?cur.dragonHud():null;db.hidden=!dh;
  if(dh){$('#drName').textContent=dh.name;$('#drState').textContent=dh.status;$('#drHpT').textContent=Math.ceil(dh.hp)+' / '+dh.hpMax;$('#drHp').style.width=(dh.hp/dh.hpMax*100)+'%';
    $('#drStT').textContent=Math.ceil(dh.st)+' / '+dh.stMax;$('#drSt').style.width=(dh.st/dh.stMax*100)+'%';}
  // hp
  if(cur&&cur.kind!=='hub'){$('#hpText').textContent=Math.ceil(P.hp)+' / '+maxHp();$('#hpFill').style.width=(P.hp/maxHp()*100)+'%';}
  // egg timer
  const et=$('#eggTimer');
  if(S.carriedEgg&&S.carriedEgg.expiresAt){const left=(S.carriedEgg.expiresAt-Date.now())/1000;
    if(left<=0){S.carriedEgg=null;save();toast('The egg went cold and died. It needed the Hatchery within a minute.','bad');et.hidden=true;hubDirty=true;if(cur.kind==='hub'&&!modalOpen){const px=P.x,pz=P.z;setScene(buildHub());P.x=px;P.z=pz;hubDirty=false;}}
    else{et.hidden=false;et.textContent=`Egg dies in ${fmtShort(left)}. Take it to the Hatchery.`;}}else et.hidden=true;
  if(S.hatchery&&!S.hatchery.notified&&Date.now()>=S.hatchery.start+S.hatchery.dur){S.hatchery.notified=true;save();toast('An egg is ready to hatch in the Hatchery.','good');}
  if(cur&&cur.kind==='hub'&&!modalOpen&&!S.carriedEgg){setObjective(hubObjective());}}
// Objective text shown while in the kingdom.
function hubObjective(){
  if(S.carriedEgg)return'Take the egg to the Hatchery before it dies.';
  if(S.hatchery&&Date.now()>=S.hatchery.start+S.hatchery.dur)return'Your egg is ready. Walk to the Hatchery and hatch it (E).';
  if(S.hatchery)return'The Hatchery is incubating. Visit stalls, or wait for the egg to hatch.';
  if(!S.dragons.length)return'Turn around. Walk to the Mission Gate. Start an egg hunt (E).';
  const d=activeDragon();
  if(d&&d.growth<100){
    return S.food[d.element]>0
      ?`Feed ${d.name} at the Dragon Roost (E).`
      :`Start a ${ELEMENTS[d.element].name} Dragon Feed at the Mission Gate. Raise ${d.name}.`;
  }
  if(S.dragons.some(x=>x.growth>=100))return'Your dragon is grown. Try Sky Patrol at the Mission Gate, or upgrade stalls.';
  return'';}
