// ========================================================================
// DragonBlood · Intelligence & Dragon Power
// The Dragon Power pool, the four abilities (keys 1-4) and chant casting.
// ========================================================================
'use strict';
// Intelligence powers the knight's Dragon Power: a resource spent on four abilities (keys 1-4).
// Intelligence starts at 5 and rises by 1 with every rider level; it raises the Dragon Power pool,
// its regen, and the strength of every ability.
const intel=()=>4+S.playerLvl;
const dpMax=()=>40+6*intel();
const dpRegen=()=>(1.5+.25*intel())*(1+barkStat('dpr'));
const furyPct=()=>Math.min(1,(10+2*intel())/100);
const hidePct=()=>Math.min(.6,(8+1.5*intel())/100);
const windPct=()=>(50+5*intel())/100;
const DP_ABIL=[
  {id:'heal',key:'1',name:'Mending',cost:30,cd:6,desc:()=>`Heal ${10+4*intel()} health`},
  {id:'fury',key:'2',name:'Fury',cost:35,cd:20,dur:12,desc:()=>`+${Math.round(furyPct()*100)}% attack damage for 12s`},
  {id:'hide',key:'3',name:'Dragonhide',cost:35,cd:20,dur:12,desc:()=>`-${Math.round(hidePct()*100)}% damage taken for 12s`},
  {id:'wind',key:'4',name:'Second Wind',cost:25,cd:15,dur:10,desc:()=>`Restore ${30+4*intel()} stamina, clear Winded, +${Math.round(windPct()*100)}% stamina regen for 10s`},
];
const DPS={cd:{heal:0,fury:0,hide:0,wind:0},buff:{fury:0,hide:0,wind:0}};
function dpReset(){CH=null;if(typeof renderChant==='function')try{renderChant();}catch(e){}P.dp=dpMax();for(const k in DPS.cd)DPS.cd[k]=0;for(const k in DPS.buff)DPS.buff[k]=0;}
// Casting: stand still and press 4 keys in order. Moving, taking damage, being grabbed or a wrong key cancels it.
// Dragon Power is only spent and the cooldown only starts when the cast completes.
const CH_KEYS=['KeyJ','KeyK','KeyL','KeyU','KeyI','KeyO'],CH_TIME=4.5;let CH=null;
const isMoving=()=>!P.grounded||keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||Math.hypot(joy.x,joy.y)>.15;
function castDP(i){const A=DP_ABIL[i];if(!A||!started||modalOpen||!cur||missionOver)return;
  if(cur.kind==='hub'){toast('Dragon Power is used on missions.');return;}
  if(P.mode!=='foot'){toast('Dragon Power abilities are used on foot.');return;}
  if(CH){toast('Already casting.');return;}
  if(DPS.cd[A.id]>0){toast(`${A.name} is ready in ${Math.ceil(DPS.cd[A.id])}s.`);return;}
  if(P.dp<A.cost){toast(`Not enough Dragon Power for ${A.name} (${A.cost} needed).`,'bad');return;}
  if(A.id==='heal'&&P.hp>=maxHp()){toast('Already at full health.');return;}
  if(isMoving()){toast('Stand still to cast.','bad');return;}
  CH={name:A.name,seq:Array.from({length:4},()=>CH_KEYS[Math.floor(Math.random()*CH_KEYS.length)]),i:0,t:CH_TIME,max:CH_TIME,done:()=>applyDP(A)};renderChant();}
function chantCancel(why){if(!CH)return;const n=CH.name;CH=null;renderChant();toast(`${n} ${why}`,'bad');}
function chantKey(code){if(!CH)return false;if(!CH_KEYS.includes(code))return false;
  if(code!==CH.seq[CH.i]){chantCancel('fizzled: wrong key.');return true;}
  CH.i++;if(CH.i>=CH.seq.length){const d=CH.done;CH=null;renderChant();d();}else renderChant();return true;}
function renderChant(){const box=$('#chant');if(!CH){box.hidden=true;return;}box.hidden=false;$('#chTitle').textContent=`Casting ${CH.name}`;
  $('#chKeys').innerHTML=CH.seq.map((k,j)=>`<button type="button" class="${j<CH.i?'done':j===CH.i?'next':''}" tabindex="-1">${k.slice(3)}</button>`).join('');
  $('#chFill').style.width=(CH.t/CH.max*100)+'%';}
function applyDP(A){if(P.dp<A.cost){toast(`Not enough Dragon Power for ${A.name}.`,'bad');return;}
  P.dp-=A.cost;DPS.cd[A.id]=A.cd;TUTF.dp=true;
  if(A.id==='heal'){const n=10+4*intel();P.hp=Math.min(maxHp(),P.hp+n);toast(`Mending: +${n} health`,'good');}
  else if(A.id==='fury'){DPS.buff.fury=A.dur;toast(`Fury: +${Math.round(furyPct()*100)}% attack for ${A.dur}s`,'good');}
  else if(A.id==='hide'){DPS.buff.hide=A.dur;toast(`Dragonhide: -${Math.round(hidePct()*100)}% damage taken for ${A.dur}s`,'good');}
  else if(A.id==='wind'){P.st=Math.min(ST_MAX,P.st+30+4*intel());P.winded=false;DPS.buff.wind=A.dur;toast('Second Wind: stamina restored','good');}
  updateHUD();dpHUD(true);}
function dpUpdate(dt){if(P.dp==null)dpReset();
  if(CH){CH.t-=dt;if(P.mode!=='foot')chantCancel('was cancelled.');else if(isMoving())chantCancel('broke: you moved.');else if(CH.t<=0)chantCancel('faded: too slow.');else $('#chFill').style.width=(CH.t/CH.max*100)+'%';}P.dp=Math.min(dpMax(),P.dp+dpRegen()*dt);
  for(const k in DPS.cd)DPS.cd[k]=Math.max(0,DPS.cd[k]-dt);for(const k in DPS.buff)DPS.buff[k]=Math.max(0,DPS.buff[k]-dt);}
let dpAcc=0;
function dpHUD(force){dpAcc+=1;if(!force&&dpAcc%6)return;// ~10 updates/sec
  if($('#hpBox').hidden)return;
  $('#dpFill').style.width=(P.dp/dpMax()*100)+'%';$('#dpText').textContent=Math.floor(P.dp)+' / '+dpMax();
  DP_ABIL.forEach(A=>{const el=$('#ab-'+A.id);const cd=DPS.cd[A.id],on=DPS.buff[A.id]>0;
    el.classList.toggle('on',on);el.classList.toggle('cd',!on&&cd>0);el.classList.toggle('short',!on&&cd<=0&&P.dp<A.cost);
    el.querySelector('i').textContent=on?Math.ceil(DPS.buff[A.id])+'s':cd>0?Math.ceil(cd)+'s':'';});}
function charSheet(){return `<p class="section-h">Knight</p><div class="dstats"><span>Intelligence <b>${intel()}</b></span><span>Dragon Power <b>${dpMax()}</b></span><span>Regen <b>${dpRegen().toFixed(1)}/s</b></span><span>Max health <b>${maxHp()}</b></span></div>
  <p class="note">Intelligence rises by 1 with every rider level. It raises your Dragon Power pool, how fast it refills, and the strength of each ability below. Use them on foot during missions with keys 1 to 4: stand still and press the 4 keys shown in order. Moving, taking damage, being grabbed or a wrong key cancels the cast, and no Dragon Power is spent.</p>
  ${DP_ABIL.map(A=>row(`${A.key} · ${A.name}`,`${A.desc()}. Costs ${A.cost} Dragon Power, ${A.cd}s cooldown.`,'','')).join('')}`;}
