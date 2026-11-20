// ========================================================================
// DragonBlood · Inventory
// One screen (I key, or the Inventory button) that shows what the knight and
// the lead dragon have equipped and everything you carry, so after buying
// weapons, armor, saddles, tools or supplies you can see what is in use.
// Tabs: Knight (stats, weapon, tools, scrolls), Dragon (lead dragon and its
// gear, other dragons), Bag (resources, supplies, food, holy bark, eggs).
// ========================================================================
'use strict';
// Changing gear (equipping a weapon, choosing the lead dragon) works only in the
// kingdom; on a mission the screen is read-only, like the Blacksmith and Roost.
const INV={tab:'knight'};
const invAtHome=()=>!!cur&&cur.kind==='hub';

// --- small pieces
const invSlot=(label,name,desc,tag)=>`<div class="inv-slot"><span class="inv-label">${label}</span><div><b>${name}</b>${desc?`<p class="note">${desc}</p>`:''}</div>${tag||''}</div>`;
const invStats=pairs=>`<div class="dstats">${pairs.map(([k,v])=>`<span>${k} <b>${v}</b></span>`).join('')}</div>`;
const invWhere=v=>`<span class="tag dim">${v}</span>`;
function invWeaponDesc(id){const w=WEAPONS[id],T=WTYPES[w.type||'sword'];
  return `${T.name} · tier ${w.lvl} · ${w.dmg} damage per ${w.type==='bow'?'arrow':'strike'} · ${(1/T.cd).toFixed(1)} attacks/s · ${w.type==='bow'?'cannot block':'can block'}`;}

// --- Knight tab
function invKnight(){const id=S.weapon,w=WEAPONS[id],socks=socketsOf(id),home=invAtHome();let h='';
  h+=`<p class="section-h">Knight</p>`+invStats([['Rider Lv',S.playerLvl],['Health',maxHp()],['Intelligence',intel()],['Dragon Power',dpMax()],['Egg extraction',pct(extractChance())],['Wins',S.won||0]]);
  // equipped weapon, with its bark sockets
  const bonus=barkSummary(id);
  h+=`<p class="section-h">Equipped</p>`;
  h+=invSlot('Weapon',w.name,`${invWeaponDesc(id)}<br>Damage with bark: <b>${weaponDmg()}</b>${bonus?` · ${bonus}`:''}`,'<span class="tag">Equipped</span>');
  h+=invSlot('Sockets',`${socks.filter(Boolean).length} of ${socks.length} set`,socks.map((s,i)=>`Socket ${i+1}: ${s?barkName(s.e,s.t):'empty'}`).join(' · ')+'. Set bark at the Holy Tree.',invWhere('Holy Tree'));
  h+=invSlot('Squire',S.squire.name,sqAway()?'Away on an expedition.':`Level ${S.squire.lvl}. Rides with you on every mission.`,'');
  // other weapons you own
  const others=S.owned.filter(x=>x!==id);
  h+=`<p class="section-h">Other weapons (${others.length})</p>`;
  if(!others.length)h+='<p class="note">You own no other weapons. The Blacksmith forges more as the stall levels up.</p>';
  for(const o of others)h+=row(WEAPONS[o].name,invWeaponDesc(o),'',home?btn('equip',o,'Equip'):invWhere('Equip in the kingdom'));
  // tools (always carried, passive)
  h+=`<p class="section-h">Tools · always carried</p>`;
  for(const[tid,t]of Object.entries(TOOLS)){const own=S.tools.includes(tid);
    h+=row(t.name,`+${pct(t.bonus)} egg extraction chance.`,'',own?'<span class="tag">Carried</span>':invWhere(`Alchemist · stall Lv ${t.lvl}`));}
  // legendary scrolls
  const L=S.scrolls||[];
  h+=`<p class="section-h">Legendary scrolls (${L.length})</p>`;
  h+=L.length?L.map(s=>row(spellOf(s.id).name+' scroll',`${s.uses} of 3 uses left. Slot one on the pre-mission screen, cast with Z.`,'','')).join(''):'<p class="note">None yet. They drop very rarely from mission wins.</p>';
  return h;}

// --- Dragon tab
function invDragonCard(d,lead){const RR=rar(d),E=ELEMENTS[d.element],grown=d.growth>=100,cd=d.cdUntil&&d.cdUntil>Date.now()?(d.cdUntil-Date.now())/1000:0;
  let h=`<div class="dcard${lead?' active':''}"><div class="dhead"><span class="dname">${d.name}</span><span style="color:${RR.css}">${RR.name} ${E.name}</span></div>`;
  h+=invStats(grown?[['Flight Lv',flv(d)],['Health',dHp(d)],['Stamina',dStam(d)],['Attack',dragonPower(d)],['Damage taken',`-${Math.round(dReduce(d)*100)}%`],['Imprint',Math.floor(d.imprint)+'%']]
                    :[['Grown',Math.floor(d.growth)+'%'],['Imprint',Math.floor(d.imprint)+'%'],['Eats',E.food]]);
  if(cd>0)h+=`<p class="note" style="color:var(--ember)">Recovering: ${fmtShort(cd)} left.</p>`;
  return h;}
function invDragon(){const d=activeDragon(),home=invAtHome();let h='';
  if(!d)return '<p class="note">You have no dragon yet. Hunt a mother dragon for an egg, hatch it at the Hatchery, then raise it at the Roost.</p>'+invEggs();
  h+=`<p class="section-h">Lead dragon</p>`+invDragonCard(d,true);
  // its gear: armor and saddle are forged for this dragon (tiers 0-5)
  const next=t=>t>=5?'Max tier':`Next tier at the Armorer (stall Lv ${t+1})`;
  h+=invSlot('Armor',d.armor?`Dragon armor · tier ${d.armor}`:'No armor',`-${6*d.armor}% damage taken, +${8*d.armor}% health. ${next(d.armor)}.`,d.armor?'<span class="tag">Equipped</span>':invWhere('Armorer'));
  h+=invSlot('Saddle',d.saddle?`Riding saddle · tier ${d.saddle}`:'No saddle',`-${3*d.saddle}% damage taken, +${5*d.saddle}% health. ${next(d.saddle)}.`,d.saddle?'<span class="tag">Equipped</span>':invWhere('Armorer'));
  h+=`<p class="note">${d.growth>=100?'Your lead dragon is the one you ride on Sky Patrol.':`${d.name} must be fully grown before it can be ridden.`} Armor and saddles stay with the dragon they were made for.</p></div>`;
  // the rest of the roost
  const others=S.dragons.filter(x=>x!==d);
  h+=`<p class="section-h">Other dragons (${others.length})</p>`;
  if(!others.length)h+='<p class="note">No other dragons yet.</p>';
  for(const o of others)h+=invDragonCard(o,false)+invStats([['Armor',`T${o.armor}`],['Saddle',`T${o.saddle}`]])+
    `<div style="margin-top:8px">${home?btn('setActive',o.id,'Make lead'):invWhere('Change in the kingdom')}</div></div>`;
  return h;}

// --- Bag tab
function invEggs(){let h='';
  if(S.carriedEgg){const e=S.carriedEgg;h+=row(`${RARITY[rIdx(e.rarity)].name} ${ELEMENTS[e.element].name} egg`,'In your hands. Take it to the Hatchery before it goes cold.','','<span class="tag">Carried</span>');}
  if(S.hatchery){const e=S.hatchery,left=(e.start+e.dur-Date.now())/1000;h+=row(`${RARITY[rIdx(e.rarity)].name} ${ELEMENTS[e.element].name} egg`,left>0?`Incubating: ${fmtShort(left)} left.`:'Ready to hatch.','',invWhere('Hatchery'));}
  return h?`<p class="section-h">Eggs</p>${h}`:'';}
function invBag(){let h='';
  h+=`<p class="section-h">Resources</p>`+invStats([['Gold',S.gold>=UNLIMITED?'∞':S.gold],['Material',S.material>=UNLIMITED?'∞':S.material],['Holy water',`${S.holy}/7`]]);
  h+=`<p class="section-h">Supplies</p>`;
  h+=row('Ember Salve',`Restores 45 health on a mission (H). You carry <b>${S.salves}</b>.`,'',invWhere('Alchemist'));
  h+=row('Hunting lure',`Next Dragon Feed mission spawns 4 extra food. You have <b>${S.lures}</b>.`,'',invWhere('Provisioner'));
  h+=`<p class="section-h">Dragon food</p>`+invStats(ELEMENT_IDS.map(el=>[ELEMENTS[el].food,S.food[el]||0]));
  const inv=barkInv(),bark=[];
  for(const e of BARK_IDS)(inv[e]||[]).forEach((n,i)=>{if(n)bark.push([barkName(e,i+1),n]);});
  h+=`<p class="section-h">Holy bark</p>`+(bark.length?invStats(bark):'<p class="note">None. Holy Tree trials yield bark.</p>');
  h+=invEggs();
  if(S.relic)h+=`<p class="section-h">Relic</p><p class="note">You hold the relic. It may carry a dragon into the next season.</p>`;
  return h;}

// --- the panel
const P_inv={eyebrow:()=>invAtHome()?'Equipped and carried':'Equipped and carried · change gear in the kingdom',title:()=>'Inventory',live:true,render(){
  const tabs=[['knight','Knight'],['dragon','Dragon'],['bag','Bag']];
  let h=`<div class="seg" style="margin:6px 0 4px">${tabs.map(([t,n])=>`<button type="button" data-act="invTab" data-arg="${t}" aria-pressed="${INV.tab===t}">${n}</button>`).join('')}</div>`;
  h+=INV.tab==='dragon'?invDragon():INV.tab==='bag'?invBag():invKnight();
  return h;}};
ACT.invTab=t=>{INV.tab=t;};
function openInventory(tab){if(tab)INV.tab=tab;openPanel(P_inv);}
