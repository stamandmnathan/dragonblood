// ========================================================================
// DragonBlood · Pre-mission screen
// The loadout/briefing panel shown before riding out.
// ========================================================================
'use strict';
const LO={kind:null,tab:'knight',scroll:null};
function openLoadout(kind){LO.kind=kind;LO.tab='knight';if(LO.scroll&&!scrollByUid(LO.scroll))LO.scroll=null;openPanel(P_loadout);}
function briefing(){const k=LO.kind;
  if(k==='egg'){const lvl=1+Math.floor((S.playerLvl-1)/2)+(MP.high?3:0);return{name:`${MP.high?'High-level egg hunt':'Egg hunt'}${MP.party>1?` · party of ${MP.party}`:''}`,
    goal:'Bring down a mother dragon on foot with weapons, extract her egg from the nest, and escape with it.',
    rules:[`On foot · ${MP.high?20:15} minute limit`,'Falling respawns you at the last checkpoint, except while carrying the egg: a wild dragon that kills you takes it','Running out of time fails the hunt',`Egg level ${lvl}${MP.high?' · costs 1 holy water':''}`],
    reward:`Gold, material, XP and the egg. Wins have a ${MP.high?3:1}% chance of a Legendary scroll.`};}
  if(k==='feed'){const E=ELEMENTS[MP.el];return{name:`${E.name} Dragon Feed`,goal:`Gather ${E.food} for your ${E.name} dragons and return to the gate before time runs out. Critters will defend the grounds.`,
    rules:['On foot · 90 second run','Falling ends the run and loses what you gathered',S.lures?'A hunting lure will be used':'No hunting lure'],reward:`${E.food}, gold, material and XP. Wins have a 1% chance of a Legendary scroll.`};}
  if(k==='relic')return{name:'Was I right?',goal:'Somewhere in the drowned ruins there is a vault. Search it.',rules:['On foot','No time limit','Falling sends you back to the kingdom'],reward:'Almost certainly nothing. Perhaps the relic.'};
  if(k==='trial'){const T_=TRIALS[MP.trial];return{name:`Holy Tree Trial · ${T_.name} · ${ELEMENTS[MP.trialEl].name}`,goal:'Destroy the three corrupted shrines, then plant the holy seed at the sacred spring and stay beside it until the tree takes root. Hollow husks will try to stop you.',
    rules:['On foot · 15 minute limit','Falling respawns you at the last checkpoint','Running out of time fails the trial',T_.gold?`Costs ${T_.gold} gold, paid when you begin`:'Free'],
    reward:`${T_.bark[0]===T_.bark[1]?T_.bark[0]:T_.bark[0]+'–'+T_.bark[1]} Seedling ${BARK_TYPES[MP.trialEl].name} (${BARK_TYPES[MP.trialEl].fx(BARK_TYPES[MP.trialEl].vals[0])} each), gold and XP. Wins have a ${T_.D>2?3:1}% chance of a Legendary scroll.`};}
  const PD=PATROL_DIFFS[MP.patrol]||PATROL_DIFFS.medium;
  return{name:`Sky Patrol · ${PD.name}`,goal:`Ride against rival riders: unseat ${PD.riders} of them, deliver 2 supply crates to the war camp and carry a stranded scout home.`,
    rules:['Dragon mission · no time limit',`Up to ${PD.together} enemy rider${PD.together>1?'s':''} in the air at once`,`Grab prompts: 4 keys, ${PD.freeTime}s to break free, ${PD.pullTime}s to rip a rider off`,'Falling sends you back to the kingdom','One dragon flies as your mount; when it tires it must land and recover'],
    reward:`Gold, material, XP and flight XP for every dragon you ride (×${PD.mul}). Wins have a ${PD.high?3:1}% chance of a Legendary scroll.`};}
const P_loadout={eyebrow:()=>'Before you ride out',title:()=>briefing().name,live:true,render(){
  const B=briefing(),riding=LO.kind==='patrol';let h='';
  if(riding)h+=`<div class="seg" style="margin:6px 0 4px">${['knight','dragon'].map(t=>`<button type="button" data-act="loTab" data-arg="${t}" aria-pressed="${LO.tab===t}">${t==='knight'?'Knight':'Dragon'}</button>`).join('')}</div>`;
  if(!riding||LO.tab==='knight'){
    h+=`<p class="section-h">Mission</p><p class="note" style="color:var(--ash)">${B.goal}</p><p class="note">${B.rules.join(' · ')}</p><p class="note">Reward: ${B.reward}</p>`;
    h+=`<p class="section-h">Knight</p><div class="dstats"><span>Rider Lv <b>${S.playerLvl}</b></span><span>Health <b>${maxHp()}</b></span><span>Intelligence <b>${intel()}</b></span><span>Dragon Power <b>${dpMax()}</b></span><span>Weapon <b>${WEAPONS[S.weapon].name} (${WTYPES[wType()].name}) · ${weaponDmg()}</b></span><span>Salves <b>${S.salves}</b></span></div>`;
    h+=`<p class="note">Squire: ${sqAway()?`${S.squire.name} is away on an expedition and will not join.`:`${S.squire.name} (level ${S.squire.lvl}) rides with you.`}</p>`;
    const L=S.scrolls||[];
    h+=`<p class="section-h">Scroll slot</p><p class="note">One scroll per mission, read once with Z (stand still, 3 keys). Massive ${SCROLL_R}m blast that breaks walls; leaves you at 10% health. A use is spent only if the spell goes off.</p>`;
    h+=`<div class="grid2"><button type="button" class="pick" data-act="loScroll" data-arg="" aria-pressed="${!LO.scroll}"><b>Empty slot</b><span>Go in without a scroll</span></button>`+
      L.map(s=>`<button type="button" class="pick" data-act="loScroll" data-arg="${s.uid}" aria-pressed="${LO.scroll===s.uid}"><b>${spellOf(s.id).name}</b><span>${s.uses} of 3 uses left</span></button>`).join('')+'</div>';
    if(!L.length)h+='<p class="note">You have no Legendary scrolls. They are very hard to find.</p>';}
  else{const grown=S.dragons.filter(d=>d.growth>=100);
    h+='<p class="note">Your lead dragon waits for you at the start. For now only that one dragon flies as a mount; when it tires, wait for it to recover before riding again.</p>';
    for(const d of grown){const RR=rar(d),E=ELEMENTS[d.element],cd=d.cdUntil&&d.cdUntil>Date.now()?(d.cdUntil-Date.now())/1000:0;
      h+=`<div class="dcard${d.id===S.active?' active':''}"><div class="dhead"><span class="dname">${d.name}</span><span style="color:${RR.css}">${RR.name} ${E.name}</span></div>
        <div class="dstats"><span>Flight Lv <b>${flv(d)}</b></span><span>Health <b>${dHp(d)}</b></span><span>Stamina <b>${dStam(d)}</b></span><span>Attack <b>${dragonPower(d)}</b></span><span>Damage taken <b>-${Math.round(dReduce(d)*100)}%</b></span><span>Armor <b>T${d.armor}</b></span><span>Saddle <b>T${d.saddle}</b></span></div>
        ${cd>0?`<p class="note" style="color:var(--ember)">Recovering: ${fmtShort(cd)} left.</p>`:''}
        <div class="acts" style="display:flex;gap:8px">${d.id===S.active?'<span class="tag">Lead dragon</span>':btn('setActive',d.id,'Make lead',cd>0)}</div></div>`;}}
  h+=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">${btn('loBack',null,'Back to mission board')}${btn('loBegin',null,'Begin mission',false,'primary')}</div>`;
  return h;}};
