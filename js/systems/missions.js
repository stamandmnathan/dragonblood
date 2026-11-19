// ========================================================================
// DragonBlood · Mission flow
// Starting missions, rolling rarity, finishing missions and returning to the hub.
// ========================================================================
'use strict';
// --- starting missions
function startEggHunt(party,high){
  const lvl=1+Math.floor((S.playerLvl-1)/2)+(high?3:0);
  let r=rollRarity();if(high){const r2=rollRarity();if(rIdx(r2.id)>rIdx(r.id))r=r2;}
  const element=ELEMENT_IDS[Math.floor(Math.random()*ELEMENT_IDS.length)];
  if(high)S.holy--;
  const cfg={party,rarity:r.id,element,lvl,high,timeLimit:(high?20:15)*60,seed:Math.floor(Math.random()*1e9)};_lastEggCfg=cfg;
  closePanel(true);missionOver=false;
  setScene(buildEggMission(cfg));P.x=0;P.z=27;P.yaw=0;P.pitch=0;P.hp=maxHp();
  toast(`Scouts report a ${r.name} ${ELEMENTS[element].name} mother dragon. Egg level ${lvl}.`,ri2tone(r));save();
}
const ri2tone=r=>rIdx(r.id)>=3?'good':'';
function rollRarity(){let t=Math.random()*100;for(const r of RARITY){if((t-=r.w)<0)return r;}return RARITY[0];}
function startFeed(el){
  const lure=S.lures>0;if(lure)S.lures--;
  const cfg={element:el,lure,seed:Math.floor(Math.random()*1e9)};
  closePanel(true);missionOver=false;
  setScene(buildFeedMission(cfg));P.x=0;P.z=34;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  if(lure)toast('Hunting lure used: more food spawns.');
}
function startPatrol(){if(S.carriedEgg||!S.dragons.some(d=>d.growth>=100))return;
  const cfg={lvl:1+Math.floor((S.playerLvl-1)/2),seed:Math.floor(Math.random()*1e9)};
  closePanel(true);missionOver=false;
  setScene(buildPatrol(cfg));P.x=0;P.z=90;P.y=0;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  toast('Sky Patrol: no time limit. Your dragon waits ahead of you. Press R to mount.');}
// --- ending missions
function finishMission(r){
  missionOver=true;eggVM.visible=false;hideBoss();
  const lines=[];let title,eyebrow;const gm=goldMul();
  if(r.kind==='egg'){const ri=rIdx(r.cfg.rarity),RR=RARITY[ri],E=ELEMENTS[r.cfg.element];eyebrow=`${RR.name} ${E.name} egg hunt`;
    if(r.success){title='Egg secured';const g=Math.round((70+45*ri)*gm),m=20+12*ri,xp=70+35*ri+10*r.cfg.lvl;
      S.gold+=g;S.material+=m;S.won++;S.carriedEgg={rarity:RR.id,element:r.cfg.element,lvl:r.cfg.lvl,expiresAt:null};
      lines.push(`You carry a <b style="color:${RR.css}">${RR.name}</b> ${E.name} egg (level ${r.cfg.lvl}). Once you step through the gate you have 60 seconds to put it in the Hatchery.`,`+${g} gold · +${m} material · +${xp} XP`);grantXP(xp);}
    else{title='Mission failed';S.lost++;let g=0,xp=15;if(r.bossKilled){g=Math.round(30*gm);xp=35;}S.gold+=g;
      lines.push(r.reason);lines.push(g?`+${g} gold for the kill · +${xp} XP`:`+${xp} XP`);grantXP(xp);}}
  else if(r.kind==='patrol'){eyebrow='Dragon mission · Sky Patrol';
    if(r.success){title='Patrol complete';const g=Math.round((120+25*r.cfg.lvl)*gm),m=60,xp=120+15*r.cfg.lvl;S.gold+=g;S.material+=m;S.won++;
      lines.push('All 4 enemy riders unseated, both crates delivered and the scout rescued.',`+${g} gold · +${m} material · +${xp} XP`);grantXP(xp);
      for(const d of r.used){const dx=120+20*r.cfg.lvl;grantDragonXP(d,dx);lines.push(`${d.name} +${dx} flight XP (flight level ${flv(d)})`);}}
    else{title='Mission failed';S.lost++;lines.push(r.reason,`Progress: riders ${r.unseated}/4 · crates ${r.delivered}/2 · scout ${r.scoutSaved?'rescued':'not rescued'}`,'+20 XP');grantXP(20);
      for(const d of r.used)grantDragonXP(d,25);if(r.used.length)lines.push('Each dragon you rode +25 flight XP');}}
  else if(r.kind==='relic'){eyebrow='Was I right?';
    if(r.success&&r.found&&!S.relic){title='The relic';S.relic=true;S.relicDragon=S.relicDragon||S.active;lines.push('<b style="color:#ecb64e">You found the relic.</b> If your faction holds the most relics when the year ends, it will carry one of your dragons into the next season as an egg. Choose which one in the kingdom panel (Tab).');}
    else if(r.success&&r.found){title='Another relic';lines.push('You found another relic, but you can only carry one.');}
    else if(r.success){title='Dust';lines.push('The vault held nothing this time.');}
    else{title='You left';lines.push(r.reason);}}
  else if(r.kind==='trial'){const T_=TRIALS[r.cfg.diff];eyebrow=`Holy Tree Trial · ${T_.name} · ${ELEMENTS[r.cfg.element||'fire'].name} grove`;
    if(r.success){title='The holy tree takes root';const n=T_.bark[0]+Math.floor(Math.random()*(T_.bark[1]-T_.bark[0]+1)),g=Math.round(40*T_.mul*gm),xp=Math.round(60*T_.mul);const be=r.cfg.element||'fire';barkInv()[be][0]+=n;S.gold+=g;S.won++;
      lines.push(`The tree you planted gives <b>${n} ${barkName(be,1)}</b> (you now have ${barkInv()[be][0]}). Combine and socket it at the Holy Tree in your kingdom.`,`+${g} gold · +${xp} XP${r.deaths?` · ${r.deaths} death${r.deaths>1?'s':''}`:''}`);grantXP(xp);}
    else{title='Trial failed';S.lost++;lines.push(r.reason,'+15 XP');grantXP(15);}}
  else if(r.kind==='tutorial'){eyebrow='Tutorial';S.tutorialDone=true;const d=S.dragons.find(x=>x.id===S.tutDragon);
    if(r.success){title='Tutorial complete';S.gold+=100;S.material+=30;
      lines.push(`${d?d.name+' is yours and fully grown. ':''}You have used every key you need. Z reads a Legendary scroll once you find one, and E trades at the stalls in your kingdom.`,'+100 gold · +30 material · +50 XP');grantXP(50);}
    else{title='Tutorial skipped';lines.push(d?`${d.name} is yours and waits at the Dragon Roost.`:'Start an egg hunt at the Mission Gate to get your first dragon.','The controls are always listed in the bottom corner of the screen.');}}
  else{const E=ELEMENTS[r.cfg.element];eyebrow=`Dragon Feed · ${E.name}`;
    if(r.success){title='Feed run complete';S.food[r.cfg.element]+=r.collected;const g=Math.round(15*gm),xp=25+5*r.collected;S.gold+=g;S.material+=15;if(r.collected>=3)S.won++;
      lines.push(`+${r.collected} ${E.food} (you now have ${S.food[r.cfg.element]})`,`+${g} gold · +15 material · +${xp} XP`);grantXP(xp);
      if(r.collected<3)lines.push('Fewer than 3 gathered, so this run does not count toward mission success.');}
    else{title='Mission failed';S.lost++;lines.push(r.reason,'+10 XP');grantXP(10);}}
  if(r.kind!=='tutorial'&&Math.random()<.3){const i=Math.floor(Math.random()*3),opts=FACTION_IDS.filter(f=>f!==S.regions[i]);const nf=opts[Math.floor(Math.random()*opts.length)];S.regions[i]=nf;
    lines.push(`While you were away, ${FACTIONS[nf].name} seized ${REGIONS[i].name}.`);}
  if(r.kind!=='relic'&&r.kind!=='tutorial')rollScroll(r,lines);
  sqMissionEnd(r,lines);
  save();updateHUD();
  openPanel({eyebrow:()=>eyebrow,title:()=>title,noClose:true,render:()=>`<ul class="result-lines">${lines.map(l=>`<li>${l}</li>`).join('')}</ul><button class="btn primary" type="button" data-act="returnHome">Return to the kingdom</button>`});
}
// Return to the kingdom.
function goHub(fromMission){
  missionOver=false;eggVM.visible=false;hideBoss();setObjective('');
  setScene(buildHub());
  if(fromMission){P.x=0;P.z=11;P.yaw=0;P.pitch=0;}P.y=0;P.vy=0;P.grounded=true;
  P.hp=maxHp();
  if(S.carriedEgg&&!S.carriedEgg.expiresAt){S.carriedEgg.expiresAt=Date.now()+60000;save();toast('Take the egg to the Hatchery left of the plaza. You have 60 seconds.','bad');}
  updateHUD();
}
let hubDirty=false;
