// ========================================================================
// DragonBlood · Panels
// Modal UI: open/close, costs, vendors, hatchery, roost, mission gate,
// war table, kingdom, menu, and ACT (every button action).
// ========================================================================
'use strict';
// --- open / render / close
let curPanel=null;
const modal=$('#modal');
function openPanel(def){curPanel=def;modalOpen=true;try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}modal.hidden=false;renderPanel();
  $('#sheetClose').hidden=!!def.noClose;$('#prompt').hidden=true;updateChrome();
  setTimeout(()=>{const f=modal.querySelector('.btn:not(:disabled),.closex:not([hidden])');f&&f.focus({preventScroll:true});},30);}
function renderPanel(){if(!curPanel)return;const body=$('#sheetBody'),st=body.parentElement.scrollTop;
  $('#sheetEyebrow').textContent=curPanel.eyebrow();$('#sheetTitle').textContent=curPanel.title();body.innerHTML=curPanel.render();body.parentElement.scrollTop=st;}
function closePanel(silent){if(!curPanel)return;if(curPanel.noClose&&!silent)return;curPanel=null;modalOpen=false;modal.hidden=true;
  if(hubDirty&&cur&&cur.kind==='hub'&&!silent){hubDirty=false;const px=P.x,pz=P.z;setScene(buildHub());P.x=px;P.z=pz;}
  updateChrome();}
modal.addEventListener('click',e=>{if(e.target===modal){closePanel();return;}const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  const fn=ACT[b.dataset.act];if(fn){fn(b.dataset.arg);save();if(curPanel)renderPanel();updateHUD();}});

// --- paying costs & shared HTML snippets
const canPay=c=>S.gold>=(c.gold||0)&&S.material>=(c.mat||0)&&S.holy>=(c.holy||0);
const pay=c=>{S.gold-=c.gold||0;S.material-=c.mat||0;S.holy-=c.holy||0;};
function costHTML(c){const p=[];if(c.gold)p.push(`<span class="cost${S.gold<c.gold?' short':''}">${c.gold} gold</span>`);if(c.mat)p.push(`<span class="cost${S.material<c.mat?' short':''}">${c.mat} material</span>`);if(c.holy)p.push(`<span class="cost${S.holy<c.holy?' short':''}">${c.holy} holy water</span>`);return p.join('');}
const btn=(act,arg,label,dis,cls)=>`<button type="button" class="btn ${cls||''}" data-act="${act}" data-arg="${arg==null?'':arg}"${dis?' disabled':''}>${label}</button>`;
const row=(title,desc,cost,action)=>`<div class="row"><div><b>${title}</b><p>${desc}</p>${cost||''}</div><div class="acts">${action}</div></div>`;
function upgradeRow(id){const lv=S.vendors[id];if(lv>=5)return row('Stall fully upgraded','Level 5 of 5.','','<span class="tag">Max</span>');
  const c=vendorCost(lv);return row(`Upgrade stall to level ${lv+1}`,'Unlocks better stock and raises your kingdom score.',costHTML(c),btn('upgrade',id,'Upgrade',!canPay(c)));}
const meter=(cls,label,val,max,txt)=>`<div class="meter ${cls}"><div class="lab"><span>${label}</span><b>${txt}</b></div><div class="bar"><i style="width:${clamp(val/max*100,0,100)}%"></i></div></div>`;

// --- vendor stalls
function openVendor(id){const V=VENDORS[id];openPanel({eyebrow:()=>`${V.eyebrow} · Stall level ${S.vendors[id]}`,title:()=>V.name,render:()=>VRENDER[id]()});}
const VRENDER={
  smith(){let h=upgradeRow('smith');
    for(const[tid,T_]of Object.entries(WTYPES)){h+=`<p class="section-h">${T_.name}s</p><p class="note">${T_.desc}</p>`;
    for(const[id,w]of Object.entries(WEAPONS)){if(w.type!==tid)continue;const owned=S.owned.includes(id);let a;
      if(S.weapon===id)a='<span class="tag">Equipped</span>';else if(owned)a=btn('equip',id,'Equip');else if(S.vendors.smith<w.lvl)a=`<span class="tag dim">Needs stall Lv ${w.lvl}</span>`;else a=btn('buyWeapon',id,'Forge',!canPay(w));
      h+=row(w.name,`${w.dmg} damage per ${tid==='bow'?'arrow':'strike'} · tier ${w.lvl} · ${slotsFor(id)} bark socket${slotsFor(id)>1?'s':''}${socketsOf(id).filter(Boolean).length?` (${socketsOf(id).filter(Boolean).length} set)`:''}.`,owned?'':costHTML(w),a);}}
    h+='<p class="note">Only weapons may be used against a mother dragon. Equip any weapon you own at any time here.</p>';return h;},
  alch(){let h=upgradeRow('alch')+`<p class="section-h">Extraction tools</p><p class="note">Your current egg extraction chance is <b>${pct(extractChance())}</b>. It rises with rider level and tools.</p>`;
    for(const[id,t]of Object.entries(TOOLS)){const owned=S.tools.includes(id);let a;
      if(owned)a='<span class="tag">Owned</span>';else if(S.vendors.alch<t.lvl)a=`<span class="tag dim">Needs stall Lv ${t.lvl}</span>`;else a=btn('buyTool',id,'Buy',!canPay(t));
      h+=row(t.name,`+${pct(t.bonus)} egg extraction chance. Always carried.`,owned?'':costHTML(t),a);}
    const sc={gold:Math.max(15,35-5*S.vendors.alch)};
    h+='<p class="section-h">Supplies</p>'+row('Ember Salve',`Restores 45 health in a mission (press H). You carry ${S.salves}.`,costHTML(sc),btn('buySalve',null,'Buy one',!canPay(sc)));
    return h;},
  armor(){const d=activeDragon();let h=upgradeRow('armor');
    if(!d)return h+'<p class="note">Armor and saddles are forged for a specific dragon. Hatch a dragon and make it active at the Roost first.</p>';
    h+=`<p class="section-h">Fitting for ${d.name}</p><p class="note">Armor cuts the damage your dragon takes by 6% per tier and raises its health 8%. Saddles cut 3% and raise health 5%. Gear never raises stamina or attack; those only rise with flight level. Max tier equals this stall's level.</p>`;
    const at=d.armor+1,ac={gold:70*at,mat:45*at},st=d.saddle+1,scst={gold:55*st,mat:55*st};
    h+=row(`Dragon armor · tier ${at}`,`Currently tier ${d.armor}.`,at>5?'':costHTML(ac),at>5?'<span class="tag">Max</span>':at>S.vendors.armor?`<span class="tag dim">Needs stall Lv ${at}</span>`:btn('craftArmor',null,'Forge',!canPay(ac)));
    h+=row(`Riding saddle · tier ${st}`,`Currently tier ${d.saddle}.`,st>5?'':costHTML(scst),st>5?'<span class="tag">Max</span>':st>S.vendors.armor?`<span class="tag dim">Needs stall Lv ${st}</span>`:btn('craftSaddle',null,'Craft',!canPay(scst)));
    return h;},
  prov(){const lv=S.vendors.prov,gm=20+lv*4,mg=20+lv*5;let h=upgradeRow('prov')+'<p class="section-h">Trade</p>';
    h+=row(`Buy ${gm} material`,'Better rates at higher stall levels.',costHTML({gold:40}),btn('trade','g2m','Trade',S.gold<40));
    h+=row(`Sell 30 material for ${mg} gold`,'',costHTML({mat:30}),btn('trade','m2g','Trade',S.material<30));
    h+=row('Hunting lure',`Next Dragon Feed mission spawns 4 extra food. You have ${S.lures}.`,costHTML({gold:35}),btn('buyLure',null,'Buy',S.gold<35));
    h+='<p class="note">Elemental dragon food cannot be bought. It is only found on Dragon Feed missions.</p>';return h;},
};

// --- buildings: hatchery, roost, mission gate, war table, kingdom
const P_hatch={eyebrow:()=>'Incubation',title:()=>'Hatchery',live:true,render(){
  if(S.carriedEgg){const e=S.carriedEgg,RR=RARITY[rIdx(e.rarity)],left=e.expiresAt?(e.expiresAt-Date.now())/1000:60;
    if(S.hatchery)return `<p class="note">The hatchery is occupied. This egg will die.</p>`;
    return `<p class="note">You are holding a <b style="color:${RR.css}">${RR.name}</b> ${ELEMENTS[e.element].name} egg, level ${e.lvl}. It dies in <b>${fmtShort(left)}</b> without warmth.</p>`+
      row('Place the egg','Starts incubation. Hatch time depends on rarity and egg level.',`<span class="cost">Hatch time ${fmtTime(hatchSecs(e))}</span>`,btn('placeEgg',null,'Place egg',false,'primary'));}
  if(S.hatchery){const h=S.hatchery,RR=RARITY[rIdx(h.rarity)],left=(h.start+h.dur-Date.now())/1000;
    let out=`<p class="note"><b style="color:${RR.css}">${RR.name}</b> ${ELEMENTS[h.element].name} egg, level ${h.lvl}.${regionBonus('hatch')?' Your faction holds Cinder Reach, so it hatches 30% faster.':''}</p>`;
    out+=meter('grow','Incubation',h.dur/1000-Math.max(0,left),h.dur/1000,left>0?fmtTime(left)+' left':'Ready');
    out+=left>0?'<p class="note">Prototype speed: hatch times run in seconds rather than hours. Go on a mission while you wait.</p>':row('Hatch now','Being present at hatching gives a 15% starting imprint.','',btn('hatch',null,'Hatch',false,'primary'));
    return out;}
  return '<p class="note">The hatchery is empty. The only way to get an egg is to kill a mother dragon on an egg hunt. Breeding does not exist.</p><p class="note">When you return with an egg you have 60 seconds to place it here.</p>';}};

const P_roost={eyebrow:()=>'Raising and imprinting',title:()=>'Dragon Roost',live:true,render(){
  if(!S.dragons.length)return '<p class="note">No dragons yet. Hunt a mother dragon from the Mission Gate, carry her egg home, and hatch it.</p>';
  const bondLeft=Math.max(0,(S.bondReadyAt-Date.now())/1000);
  let h='<p class="note">A dragon can only fight once it is 100% grown. Growth comes only from food of its element. Imprint adds that same percentage to every stat. Feeding it yourself and bonding raise imprint.</p>';
  for(const d of S.dragons){const RR=rar(d),E=ELEMENTS[d.element],need=foodNeeded(d),fed=Math.round(d.growth/100*need),grown=d.growth>=100;
    h+=`<div class="dcard${d.id===S.active?' active':''}"><div class="dhead"><span class="dname">${d.name}</span><span style="color:${RR.css}">${RR.name} ${E.name} · ${grown?'Fully raised':'Growing'}</span></div>
      <div class="dstats"><span>Level <b>${dragonLevel(d)}</b></span><span>Power <b>${dragonPower(d)}</b></span><span>Armor <b>T${d.armor}</b></span><span>Saddle <b>T${d.saddle}</b></span><span>${E.food} <b>${S.food[d.element]}</b></span></div>
      ${meter('grow','Growth',d.growth,100,grown?'100%':`${fed} of ${need} fed`)}
      ${meter('imp','Imprint',d.imprint,100,`${Math.round(d.imprint)}% · +${Math.round(d.imprint)}% stats`)}
      ${grown?`<div class="dstats"><span>Flight Lv <b>${flv(d)}</b></span><span>Stamina <b>${dStam(d)}</b></span><span>Health <b>${dHp(d)}</b></span><span>Attack <b>${dragonPower(d)}</b></span><span>Damage taken <b>-${Math.round(dReduce(d)*100)}%</b></span><span>Cooldown <b>${fmtShort(dCool(d))}</b></span></div>${meter('',`Flight XP to level ${flv(d)+1}`,d.fxp||0,100*flv(d),`${Math.round(d.fxp||0)} / ${100*flv(d)}`)}${d.cdUntil&&d.cdUntil>Date.now()?`<p class="note" style="color:var(--ember)">Recovering from exhaustion: ${fmtShort((d.cdUntil-Date.now())/1000)} left.</p>`:''}`:''}
      <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap">${btn('feed',d.id,`Feed ${E.food}`,grown||S.food[d.element]<1)}${btn('bond',d.id,bondLeft>0?`Bond in ${Math.ceil(bondLeft)}s`:'Bond (+3%)',bondLeft>0||d.imprint>=100)}${d.id===S.active?'<span class="tag">Active</span>':btn('setActive',d.id,'Make active')}</div></div>`;}
  return h;}};

const MP={party:1,high:false,el:'fire',trial:'easy',trialEl:'fire',patrol:'medium'};
const P_gate={eyebrow:()=>'Mission board',title:()=>'Mission Gate',render(){
  let block='';if(S.carriedEgg)block='You are carrying an egg. Take it to the Hatchery first.';
  const eggBlock=block||(S.hatchery?'Your hatchery is occupied. An egg would not survive the trip home. Hatch the current egg first.':'');
  const odds=RARITY.map((r,i)=>{const F=RARITY.slice(0,i+1).reduce((a,x)=>a+x.w,0)/100,Fp=RARITY.slice(0,i).reduce((a,x)=>a+x.w,0)/100;const p=MP.high?F*F-Fp*Fp:r.w/100;return `<tr><td style="color:${r.css}">${r.name}</td><td>${(p*100).toFixed(1)}%</td></tr>`;}).join('');
  const lvl=1+Math.floor((S.playerLvl-1)/2)+(MP.high?3:0);
  const grownAny=S.dragons.some(d=>d.growth>=100);
  let h=`<p class="note">${sqAway()?`${S.squire.name} is away on an expedition and won't join this mission.`:`${S.squire.name} (squire level ${S.squire.lvl}) goes with you on any mission and earns XP from it.`}</p><p class="section-h">Dragon mission · Sky Patrol</p><p class="note">Ride your dragon against rival riders. Unseat the riders by grabbing them off their dragons or downing them, deliver 2 supply crates, and carry a stranded scout to the war camp. Every riding action uses stamina, and flying slowly drains it. <b>No time limit.</b> If you fall, you are sent back to the kingdom.</p>
  ${grownAny?'':'<p class="note" style="color:var(--ember)">Needs at least one fully raised dragon.</p>'}
  <p class="note">One dragon flies as your mount (your active grown dragon). When it tires it must land and recover.</p>
  <p class="note">Difficulty</p><div class="grid2">${Object.entries(PATROL_DIFFS).map(([id,D])=>`<button type="button" class="pick" data-act="patrolDiff" data-arg="${id}" aria-pressed="${MP.patrol===id}"><b>${D.name}</b><span>${D.riders} riders · ${D.together} at a time · ${D.freeTime}s to break free · rewards ×${D.mul}</span></button>`).join('')}</div>
  ${btn('startPatrol',null,`Start ${PATROL_DIFFS[MP.patrol].name} Sky Patrol`,!grownAny||!!block,'primary')}
  <p class="section-h" style="margin-top:22px">Practice range</p><p class="note">Try every weapon, any dragon, Legendary scrolls and Dragon Power, and spawn enemies from tablets at the camp. No rewards, no cost, no risk.</p>
  ${btn('startRange',null,'Open the practice range',!!block)}
  <p class="section-h" style="margin-top:22px">Egg hunt</p><p class="note">Kill a mother dragon on foot with weapons only. Her rarity and element are random. Difficulty scales with party size. Only the player who starts the hunt gets the egg.</p>
  <p class="note">On-foot mission: <b>15 minute limit</b> (20 for a high-level hunt). Running out of time fails the hunt. If you fall, you respawn at the last checkpoint. Once you hold the egg, wild dragons attack you, and if they kill you they take the egg.</p>
  <p class="note">Party</p><div class="seg">${[1,2,3].map(n=>`<button type="button" data-act="party" data-arg="${n}" aria-pressed="${MP.party===n}">${n===1?'Solo':n+' players'}</button>`).join('')}</div>
  <p class="note">Allies are AI riders in this prototype. Each extra player adds 55% to the mother's health and 25% to her damage.</p>
  <div class="grid2"><button type="button" class="pick" data-act="hunt" data-arg="std" aria-pressed="${!MP.high}"><b>Standard hunt</b><span>Egg level ${1+Math.floor((S.playerLvl-1)/2)}</span></button>
  <button type="button" class="pick" data-act="hunt" data-arg="high" aria-pressed="${MP.high}"${S.holy<1?' disabled':''}><b>High-level hunt</b><span>Costs 1 holy water · egg level +3 · better rarity odds</span></button></div>
  <table class="odds" style="margin-top:10px">${odds}</table>
  <p class="note">Egg level ${lvl} · Extraction chance ${pct(extractChance())} · Weapon ${WEAPONS[S.weapon].name} (${WTYPES[wType()].name}, ${WEAPONS[S.weapon].dmg} dmg)</p>
  ${eggBlock?`<p class="note" style="color:var(--ember)">${eggBlock}</p>`:''}
  ${btn('startEgg',null,'Start egg hunt',!!eggBlock||(MP.high&&S.holy<1),'primary')}
  <p class="section-h" style="margin-top:22px">Dragon Feed</p><p class="note">Gather elemental food for your hatchlings. A fully raised active dragon flies with you and breathes on Q.</p>
  <div class="grid2">${ELEMENT_IDS.map(el=>{const E=ELEMENTS[el];return `<button type="button" class="pick" data-act="feedEl" data-arg="${el}" aria-pressed="${MP.el===el}"><b>${E.name}</b><span>${E.food} · have ${S.food[el]}</span></button>`;}).join('')}</div>
  <p class="note">${S.lures?`A hunting lure will be used (${S.lures} left).`:'No hunting lure. The Provisioner sells them.'}</p>
  ${block?`<p class="note" style="color:var(--ember)">${block}</p>`:''}
  ${btn('startFeed',null,`Start ${ELEMENTS[MP.el].name} feed run`,!!block,'primary')}
  ${endGameReady().ok?`<p class="section-h" style="margin-top:22px;color:#ecb64e">Was I right?</p><p class="note">A path you have never seen before.${S.relic?' You already hold the relic.':''}</p>${btn('startRelic',null,'Follow it',!!block,'primary')}`:''}
  <p class="section-h" style="margin-top:22px">Holy Tree Trial</p><p class="note">On foot. Destroy three corrupted shrines, then plant a holy seed at the sacred spring and hold it while the tree takes root. The new tree gives holy bark of the grove's element for your weapon sockets. 15 minute limit; falling respawns you at the last checkpoint.</p>
  <p class="note">Grove</p><div class="grid2">${BARK_IDS.map(e=>{const T=BARK_TYPES[e];return `<button type="button" class="pick" data-act="trialEl" data-arg="${e}" aria-pressed="${MP.trialEl===e}"><b>${ELEMENTS[e].name} · ${T.name}</b><span>${T.fx(T.vals[0])} at Seedling</span></button>`;}).join('')}</div>
  <p class="note">Difficulty</p>
  <div class="grid2">${Object.entries(TRIALS).map(([id,T_])=>`<button type="button" class="pick" data-act="trialDiff" data-arg="${id}" aria-pressed="${MP.trial===id}"><b>${T_.name}</b><span>${T_.bark[0]===T_.bark[1]?T_.bark[0]:T_.bark[0]+'–'+T_.bark[1]} holy bark · ${T_.gold?T_.gold+' gold':'free'}</span></button>`).join('')}</div>
  ${block?`<p class="note" style="color:var(--ember)">${block}</p>`:''}
  ${btn('startTrial',null,`Start ${TRIALS[MP.trial].name} trial${TRIALS[MP.trial].gold?` · ${TRIALS[MP.trial].gold} gold`:''}`,!!block||S.gold<TRIALS[MP.trial].gold,'primary')}`;
  return h;}};

const P_war={eyebrow:()=>'Region control',title:()=>'War Table',render(){
  const cost=S.tribute==='holy'?{holy:1}:S.tribute==='material'?{mat:40}:{gold:40};
  const k=kingdom(),grown=S.dragons.filter(d=>d.growth>=100).length,chance=clamp(.2+.025*k.level+.08*grown,.1,.9);
  let h=`<p class="note">The three factions fight over these regions. Holding one gives your faction its bonus. Rivals take regions while you are on missions.</p><div class="regions">`;
  REGIONS.forEach((r,i)=>{const o=S.regions[i],F=FACTIONS[o],mine=o===S.faction;
    h+=`<div class="region"><span class="flag" style="background:${F.color}"></span><div><b>${r.name}</b><p class="note" style="margin:2px 0">${r.bonus} · held by ${F.name}</p></div>${mine?'<span class="tag">Yours</span>':btn('assault',i,'Lead assault',!canPay(cost))}</div>`;});
  h+=`</div><p class="note">Assault chance ${pct(chance)}, from kingdom level ${k.level} and ${grown} fully raised dragon${grown===1?'':'s'}. Each assault costs ${costHTML(cost)}</p>
  <p class="note">Tribute resource</p><div class="seg">${['gold','material','holy'].map(t=>`<button type="button" data-act="tribute" data-arg="${t}" aria-pressed="${S.tribute===t}">${RES_NAMES[t]}</button>`).join('')}</div>`;
  return h;}};

const P_kingdom={eyebrow:()=>FACTIONS[S.faction].name,title:()=>{const k=kingdom();return `${k.name} · Level ${k.level}`;},render(){
  const k=kingdom(),next=TIERS[k.tier+1];
  let h=`<div class="ladder">${TIERS.map((t,i)=>`<span class="${i===k.tier?'on':i<k.tier?'done':''}">${t.name}</span>`).join('')}</div>`;
  h+=next?meter('','Progress to '+next.name,k.score-TIERS[k.tier].min,next.min-TIERS[k.tier].min,`${k.score} / ${next.min}`):'<p class="note">Your village has become a full kingdom.</p>';
  h+=`<table class="ktable">${k.parts.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td></tr>`).join('')}<tr class="total"><td>Kingdom score</td><td></td><td>${k.score}</td></tr></table>`;
  h+=charSheet()+spellSheet()+seasonSheet();
  h+=`<p class="note">Missions won ${S.won} · lost ${S.lost}. Holy water refills by one per day from your faction's holy tree, up to 7.</p>`;
  return h;}};

// --- menu
let resetArm=false;
const ctrl=(key,desc)=>`<div class="ctrl"><kbd>${key}</kbd><span>${desc}</span></div>`;
const P_menu={eyebrow:()=>'DragonBlood',title:()=>'Menu',render(){
  let h='<p class="section-h">How to play</p>';
  h+='<p class="note">Hunt a mother dragon for an egg. Place it in the Hatchery. Feed the hatchling at the Roost until it is fully grown. Then take Sky Patrol and Dragon Feed missions. Upgrade stalls to grow your village into a kingdom. The bottom of the screen always shows the keys for your current mode. Open this Menu anytime for the full list.</p>';

  h+='<p class="section-h">On foot</p><div class="ctrls">';
  h+=ctrl('WASD','Move. Hold Shift to sprint (uses stamina).');
  h+=ctrl('Space','Jump. Jumping cancels a Dragon Power or scroll cast.');
  h+=ctrl('Mouse','Look. Click the view to lock the cursor. Esc unlocks.');
  h+=ctrl('Click / F','Strike. With a bow, this shoots an arrow.');
  h+=ctrl('Right mouse','Block. Cuts rider melee damage by 90%. Bows cannot block.');
  h+=ctrl('E','Use nearby objects (stalls, hatchery, mission gate).');
  h+=ctrl('H','Drink a salve (+45 health). Buy more at the Alchemist.');
  h+=ctrl('Q','Dragon breath (on missions that allow your dragon).');
  h+=ctrl('Tab','Kingdom panel: score, Intelligence, dragons, seasons.');
  h+='</div>';

  h+='<p class="section-h">Dragon Power &amp; scrolls</p><div class="ctrls">';
  h+=ctrl('1–4','Cast a Dragon Power. Stand still, then press the 4 keys shown in order. Moving or taking damage cancels the cast (no power spent).');
  h+=ctrl('1 Mending','Heal yourself.');
  h+=ctrl('2 Fury','Raise your attack for a short time.');
  h+=ctrl('3 Hide','Raise your defense for a short time.');
  h+=ctrl('4 Wind','Restore stamina faster.');
  h+=ctrl('Z','Read the Legendary scroll you slotted before the mission. Stand still, then press the 3 keys shown. One cast per mission.');
  h+='</div>';
  h+='<p class="note">Intelligence (rider level) makes Dragon Power stronger and refills the pool faster. Details are in the kingdom panel under Intelligence.</p>';

  h+='<p class="section-h">Squire</p>';
  h+='<p class="note">Tobin follows you on missions and fights nearby foes. Talk to him at his post left of the plaza to train him or send expeditions. While he is away, he cannot join you.</p>';

  h+='<p class="section-h">Riding · Sky Patrol</p><div class="ctrls">';
  h+=ctrl('R','Call, mount, take off, or land. While falling, call the dragon to catch you (needs stamina, not in recovery).');
  h+=ctrl('W / S','Faster or slower flight.');
  h+=ctrl('Mouse','Steer.');
  h+=ctrl('Space / C','Climb or dive in altitude.');
  h+=ctrl('Shift','Dive-bomb (costs stamina; damages foes you hit).');
  h+=ctrl('Click','Bite.');
  h+=ctrl('Q','Ranged breath.');
  h+=ctrl('G','Grab or drop a crate, scout, soldier, or enemy rider.');
  h+=ctrl('X','Dismount after you land.');
  h+=ctrl('V','Send the dragon away to rest. It recovers stamina faster and heals 15%.');
  h+='</div>';
  h+='<p class="note">Grabbing uses the movement keys. If an enemy snatches you, press the movement keys shown, in order, to break free, then Space for a parachute. When you grab an enemy rider (G), press the keys shown to rip them from the saddle before they wriggle free. It is always 4 keys; harder patrols give you less time. Fall damage depends on height and when you open the chute. At zero stamina the dragon force-lands and needs recovery (design: 3–5 minutes; this prototype runs 6× faster). For now only your active dragon flies as a mount, so wait out its cooldown before riding again.</p>';

  h+='<p class="note">Touch screens: use the stick and the round buttons. Progress saves automatically in this browser.</p>';
  if(TEST_MODE)h+='<p class="note" style="color:var(--brass)">Test mode is on: higher rider level, best gear, unlimited gold and material, one grown dragon (skipped while the tutorial runs).</p>'+row('Test: grant the relic','Skips the 0.1% search roll.','',btn('testRelic',null,'Grant relic',!!S.relic))+row('Test: end the year now','Ends the year now with the current relic standings.','',btn('testWipe',null,'Trigger wipe',false,'danger'));
  if(cur&&cur.kind!=='hub'&&!missionOver)h+=cur.range?row('Leave practice range','Back to your kingdom.','',btn('abandon',null,'Leave',false,'danger')):cur.tut?row('Skip tutorial','Go straight to your kingdom. You keep your dragon if you already have it.','',btn('abandon',null,'Skip',false,'danger')):row('Abandon mission','This counts as a failed mission.','',btn('abandon',null,'Abandon',false,'danger'));
  h+=row('Start over','This erases this save and returns you to faction selection.','',resetArm?btn('resetYes',null,'Erase everything',false,'danger')+btn('resetNo',null,'Keep my save'):btn('resetAsk',null,'Start over',false,'danger'));
  return h;}};

// --- button actions (data-act handlers for every panel)
function makeDragonFromEgg(e){const name=DRAGON_NAMES.filter(n=>!S.dragons.some(d=>d.name===n));const nm=name.length?name[Math.floor(Math.random()*name.length)]:'Wyrm '+S.nextId;
  return{id:S.nextId++,name:e.name||nm,rarity:e.rarity,element:e.element,lvl:e.lvl,growth:0,imprint:e.reborn?40:15,armor:0,saddle:0,reborn:!!e.reborn};}
const ACT={
  close:()=>closePanel(),
  upgrade(id){const c=vendorCost(S.vendors[id]);if(!canPay(c))return;pay(c);S.vendors[id]++;hubDirty=true;toast(`${VENDORS[id].name} upgraded to level ${S.vendors[id]}.`,'good');checkTier();},
  buyWeapon(id){const w=WEAPONS[id];if(!canPay(w))return;pay(w);S.owned.push(id);S.weapon=id;buildWeaponModel();toast(`${w.name} forged and equipped.`,'good');checkTier();},
  equip(id){S.weapon=id;buildWeaponModel();},
  buyTool(id){const t=TOOLS[id];if(!canPay(t)||S.tools.includes(id))return;pay(t);S.tools.push(id);toast(`${t.name} added. Extraction chance is now ${pct(extractChance())}.`,'good');checkTier();},
  buySalve(){const c={gold:Math.max(15,35-5*S.vendors.alch)};if(!canPay(c))return;pay(c);S.salves++;},
  buyLure(){if(S.gold<35)return;S.gold-=35;S.lures++;},
  trade(k){const lv=S.vendors.prov;if(k==='g2m'&&S.gold>=40){S.gold-=40;S.material+=20+lv*4;}if(k==='m2g'&&S.material>=30){S.material-=30;S.gold+=20+lv*5;}},
  craftArmor(){const d=activeDragon();if(!d)return;const t=d.armor+1,c={gold:70*t,mat:45*t};if(t>S.vendors.armor||t>5||!canPay(c))return;pay(c);d.armor=t;toast(`Tier ${t} armor fitted to ${d.name}.`,'good');checkTier();},
  craftSaddle(){const d=activeDragon();if(!d)return;const t=d.saddle+1,c={gold:55*t,mat:55*t};if(t>S.vendors.armor||t>5||!canPay(c))return;pay(c);d.saddle=t;toast(`Tier ${t} saddle crafted for ${d.name}.`,'good');checkTier();},
  placeEgg(){if(!S.carriedEgg||S.hatchery)return;const e=S.carriedEgg;S.hatchery={rarity:e.rarity,element:e.element,lvl:e.lvl,start:Date.now(),dur:hatchSecs(e)*1000};S.carriedEgg=null;hubDirty=true;toast('The egg is warm and safe.','good');},
  hatch(){const h=S.hatchery;if(!h||Date.now()<h.start+h.dur)return;const d=makeDragonFromEgg(h);S.dragons.push(d);if(!S.active)S.active=d.id;S.hatchery=null;hubDirty=true;
    toast(`${d.name} hatched and imprinted on you at 15%. Feed it ${ELEMENTS[d.element].food}.`,'good');checkTier();},
  feed(id){const d=S.dragons.find(x=>x.id===+id);if(!d||d.growth>=100||S.food[d.element]<1)return;S.food[d.element]--;
    d.growth=Math.min(100,d.growth+100/foodNeeded(d)+.001);if(d.growth>99.9)d.growth=100;d.imprint=Math.min(100,d.imprint+5);hubDirty=true;
    if(d.growth>=100)toast(`${d.name} is fully raised and ready to fight.`,'good');checkTier();},
  bond(id){const d=S.dragons.find(x=>x.id===+id);if(!d||Date.now()<S.bondReadyAt)return;d.imprint=Math.min(100,d.imprint+3);S.bondReadyAt=Date.now()+30000;},
  setActive(id){S.active=+id;hubDirty=true;},
  party(n){MP.party=+n;},hunt(t){MP.high=t==='high';},feedEl(el){MP.el=el;},
  startEgg(){if(S.carriedEgg||S.hatchery||(MP.high&&S.holy<1))return;openLoadout('egg');},
  startFeed(){if(S.carriedEgg)return;openLoadout('feed');},
  combineBark(a){const[e,i0]=a.split(':');const i=+i0,inv=barkInv();if(!inv[e]||i>=4||inv[e][i]<BARK_COMBINE)return;inv[e][i]-=BARK_COMBINE;inv[e][i+1]++;toast(`Combined into ${barkName(e,i+2)}.`,'good');},
  setBark(a){const[si0,e,t0]=a.split(':');const si=+si0,t=+t0,s=socketsOf(S.weapon),inv=barkInv();if(!inv[e]||!inv[e][t-1]||si>=s.length)return;if(s[si])inv[s[si].e][s[si].t-1]++;inv[e][t-1]--;s[si]={e,t};},
  removeBark(si){si=+si;const s=socketsOf(S.weapon);if(!s[si])return;barkInv()[s[si].e][s[si].t-1]++;s[si]=0;},
  trialDiff(d){MP.trial=d;},patrolDiff(d){if(PATROL_DIFFS[d])MP.patrol=d;},trialEl(e){MP.trialEl=e;},startTrial(){if(S.carriedEgg)return;if(S.gold<TRIALS[MP.trial].gold){toast(`Not enough gold for a ${TRIALS[MP.trial].name} trial.`,'bad');return;}openLoadout('trial');},
  bindRelic(id){S.relicDragon=+id;},startRelic(){if(!endGameReady().ok)return;openLoadout('relic');},
  testRelic(){if(!TEST_MODE)return;S.relic=true;toast('Test: relic granted.','good');},testWipe(){if(!TEST_MODE)return;checkSeason(true);},
  loTab(t){LO.tab=t;},loScroll(u){LO.scroll=u?+u:null;},loBack(){openPanel(P_gate);},
  loBegin(){SCR.pending=LO.scroll;const k=LO.kind;if(k==='egg'){if(S.carriedEgg||S.hatchery||(MP.high&&S.holy<1))return;startEggHunt(MP.party,MP.high);}else if(k==='feed'){if(S.carriedEgg)return;startFeed(MP.el);}else if(k==='trial'){startTrial(MP.trial);}else if(k==='relic'){startRelicHunt();}else startPatrol(MP.patrol);},
  sendSq(id){const E=EXPEDITIONS.find(e=>e.id===id),q=S.squire;if(!E||q.exp||q.lvl<E.minLvl)return;q.exp={id,start:Date.now(),dur:E.secs*1000};hubDirty=true;toast(`${q.name} sets out: ${E.name}.`);},
  claimSq(){const q=S.squire;if(!q.exp||!sqExpDone())return;const E=EXPEDITIONS.find(e=>e.id===q.exp.id),mul=(1+.08*(q.lvl-1))*(q.lvl>=SQ_MAX?1.25:1);
    const g=Math.round(rnd(E.gold[0],E.gold[1])*mul),m=Math.round(rnd(E.mat[0],E.mat[1])*mul);S.gold+=g;S.material+=m;let msg=`${q.name}'s report: +${g} gold · +${m} material · +${E.xp} squire XP`;
    if(E.holy&&S.holy<7&&Math.random()<E.holy){S.holy++;msg+=' · +1 holy water';}const up=sqGrantXP(E.xp);q.exp=null;hubDirty=true;toast(msg,'good');if(up)toast(up,'good');},
  startRange(){if(S.carriedEgg)return;startPracticeRange();},
  rg(arg){if(cur&&cur.rangeAct)cur.rangeAct(arg);},
  startPatrol(){if(S.carriedEgg||!S.dragons.some(d=>d.growth>=100))return;openLoadout('patrol');},
  assault(i){i=+i;const cost=S.tribute==='holy'?{holy:1}:S.tribute==='material'?{mat:40}:{gold:40};if(!canPay(cost))return;pay(cost);
    const k=kingdom(),grown=S.dragons.filter(d=>d.growth>=100).length,chance=clamp(.2+.025*k.level+.08*grown,.1,.9);
    if(Math.random()<chance){S.regions[i]=S.faction;hubDirty=true;toast(`${FACTIONS[S.faction].name} now holds ${REGIONS[i].name}. ${REGIONS[i].bonus}.`,'good');}
    else toast(`The assault on ${REGIONS[i].name} was repelled.`,'bad');},
  tribute(t){S.tribute=t;},
  abandon(){closePanel(true);if(cur.abandon){cur.abandon();return;}if(cur.kind==='egg')finishMission({kind:'egg',success:false,reason:'You abandoned the hunt.',cfg:cur._cfg||lastCfg(),bossKilled:false});else finishMission({kind:'feed',success:false,reason:'You abandoned the feed run.',cfg:{element:MP.el},collected:0});},
  resetAsk(){resetArm=true;},resetNo(){resetArm=false;},
  resetYes(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}resetArm=false;S=freshState();closePanel(true);started=false;buildWeaponModel();setScene(buildHub());showTitle();},
  returnHome(){closePanel(true);goHub(true);},
};
// --- misc progress tracking
let _lastEggCfg=null;const lastCfg=()=>_lastEggCfg||{rarity:'normal',element:'fire',lvl:1,party:1};
let lastTier=-1;
function checkTier(){const k=kingdom();if(lastTier>=0&&k.tier>lastTier){toast(`Your settlement has grown into a ${k.name}!`,'good');hubDirty=true;}lastTier=k.tier;}
