// ========================================================================
// DragonBlood · Seasons & the relic
// The yearly wipe, rival relic tallies, and the secret relic hunt mission.
// ========================================================================
'use strict';
// Every account is wiped at the end of each calendar year. The only thing that can survive is one dragon,
// reborn as an egg, and only for players who hold the relic AND whose faction holds the most relics that
// season. Only one faction wins; every other player (relic or not) starts from zero.
// The relic comes from the secret mission "Was I right?", unlocked only at end game: a fully grown Kingdom
// and the best gear in slot (a tier 5 weapon with every bark socket filled). Each search has a 0.1% chance.
// This prototype is single-player, so rival factions' relic counts are simulated from the season seed.
const RELIC_CHANCE=.001;
const seasonYear=()=>new Date().getFullYear();
function seasonInit(){if(!S.season)S.season=seasonYear();}
function endGameReady(){const k=kingdom(),w=WEAPONS[S.weapon];const socks=socketsOf(S.weapon);
  return{kingdom:k.tier>=TIERS.length-1,weapon:w.lvl>=5,sockets:socks.every(Boolean),get ok(){return this.kingdom&&this.weapon&&this.sockets;}};}
function rivalRelics(){const r=rng(S.season*7919+13),out={};
  // relics are vanishingly rare, so most factions hold 0-2 per season
  for(const f of FACTION_IDS){const x=r();out[f]=x<.45?0:x<.8?1:2;}return out;}
function relicTally(){const t=rivalRelics();if(S.relic)t[S.faction]++;return t;}
function seasonWinner(){const t=relicTally(),max=Math.max(...Object.values(t));if(max<=0)return null;
  const top=FACTION_IDS.filter(f=>t[f]===max);if(top.length===1)return top[0];
  // tie: the faction holding more regions wins; then a seeded draw
  const reg=f=>S.regions.filter(x=>x===f).length;const best=Math.max(...top.map(reg));const t2=top.filter(f=>reg(f)===best);
  return t2[Math.floor(rng(S.season*31+7)()*t2.length)];}
const daysToWipe=()=>Math.max(0,Math.ceil((new Date(S.season+1,0,1)-Date.now())/86400000));
function relicDragon(){return S.dragons.find(d=>d.id===S.relicDragon)||null;}
function checkSeason(force){if(!S||!S.faction)return;seasonInit();if(!force&&seasonYear()<=S.season)return;doWipe(force?S.season+1:seasonYear());}
function doWipe(newYear){
  const winner=seasonWinner(),tally=relicTally(),F=S.faction,carried=(S.relic&&winner===F)?relicDragon()||S.dragons.find(d=>d.id===S.active)||S.dragons[0]:null;
  const old=S;S=freshState();S.faction=F;S.tribute=old.tribute;S.season=newYear;S.squire.name=old.squire?old.squire.name:S.squire.name;
  S.testScrolls=old.testScrolls;S.seasonsPlayed=(old.seasonsPlayed||0)+1;
  if(carried)S.hatchery={rarity:carried.rarity,element:carried.element,lvl:carried.lvl,name:carried.name,reborn:true,start:Date.now(),dur:hatchSecs(carried)*1000};
  S.lastWipe={year:old.season,winner,tally,carried:carried?carried.name:null,hadRelic:!!old.relic};
  applyTestBoost();save();
  if(started){missionOver=false;closePanel(true);setScene(buildHub());P.x=0;P.z=4;P.yaw=0;P.pitch=0;P.hp=maxHp();buildWeaponModel();updateHUD();}
  openPanel(P_wipe);}
const P_wipe={eyebrow:()=>`Season ${S.lastWipe.year} has ended`,title:()=>'The world begins again',noClose:false,render(){const L=S.lastWipe;
  let h=`<p class="note" style="color:var(--ash)">The year turned and every kingdom fell to dust. All accounts start again from zero.</p>`;
  h+=`<p class="section-h">Relic holders by faction</p><table class="ktable">${FACTION_IDS.map(f=>`<tr><td style="color:${FACTIONS[f].color}">${FACTIONS[f].name}</td><td>${f===L.winner?'Winner':''}</td><td>${L.tally[f]}</td></tr>`).join('')}</table>`;
  h+=L.winner?`<p class="note">${FACTIONS[L.winner].name} held the most relics. Only its relic holders could carry a dragon into the new year.</p>`:'<p class="note">No faction held a relic. No dragon crossed into the new year.</p>';
  h+=L.carried?`<p class="note" style="color:var(--good)">Your relic answered. <b>${L.carried}</b> waits in your Hatchery as an egg, ready to be reborn.</p>`
    :L.hadRelic?'<p class="note" style="color:var(--ember)">You held the relic, but your faction did not hold the most. You start from ground zero.</p>':'<p class="note">You start from ground zero.</p>';
  return h+btn('close',null,'Begin the new season',false,'primary');}};
function seasonSheet(){const eg=endGameReady(),t=relicTally(),w=seasonWinner();
  let h=`<p class="section-h">Season ${S.season}</p><p class="note">Every account is wiped at the end of the year (${daysToWipe()} day${daysToWipe()===1?'':'s'} left). Only relic holders in the faction with the most relics carry one dragon into the next season, reborn as an egg. Only one faction can win; everyone else starts from zero.</p>`;
  h+=`<table class="ktable">${FACTION_IDS.map(f=>`<tr><td style="color:${FACTIONS[f].color}">${FACTIONS[f].name}${f===S.faction?' (you)':''}</td><td>${f===w?'Leading':''}</td><td>${t[f]} relic${t[f]===1?'':'s'}</td></tr>`).join('')}</table>`;
  if(S.relic){const d=relicDragon();h+=`<p class="note" style="color:#ecb64e">You hold the relic.</p>`;
    h+=S.dragons.length?S.dragons.map(x=>row(x.name,`${rar(x).name} ${ELEMENTS[x.element].name}`,'',x.id===S.relicDragon?'<span class="tag">Carried by the relic</span>':btn('bindRelic',x.id,'Carry this dragon'))).join(''):'<p class="note">You have no dragon for the relic to carry yet.</p>';
    if(!d&&S.dragons.length)h+='<p class="note">If you choose none, your active dragon is carried.</p>';}
  else if(eg.ok)h+='<p class="note" style="color:#ecb64e">Something stirs beyond the Mission Gate.</p>';
  else h+=`<p class="note">End game: ${eg.kingdom?'✓':'·'} grow your settlement into a Kingdom · ${eg.weapon?'✓':'·'} equip a tier 5 weapon · ${eg.sockets?'✓':'·'} fill every bark socket on it.</p>`;
  return h;}

// the secret mission (open-ended for now): walk into the drowned ruins and search the vault
function startRelicHunt(){if(!endGameReady().ok)return;const cfg={kind:'relic',lvl:8,seed:Math.floor(Math.random()*1e9)};
  closePanel(true);missionOver=false;setScene(buildRelicHunt(cfg));P.x=0;P.z=34;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  toast('Was I right?');}
function buildRelicHunt(cfg){
  const sc=baseScene(0x0d0c12,10,70);const colliders=[],interact=[];
  const ground=mesh(new THREE.CircleGeometry(60,48),M(0x17151c));ground.rotation.x=-Math.PI/2;sc.add(ground);
  const rand=rng(cfg.seed);
  for(let i=0;i<26;i++){const a=rand()*Math.PI*2,r=10+rand()*28,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.hypot(x,z-34)<6)continue;
    const h=2+rand()*6,p=mesh(new THREE.BoxGeometry(1.2,h,1.2),M(0x3a3640),x,h/2,z);p.rotation.y=rand()*3;sc.add(p);colliders.push({x,z,r:1,obj:p});}
  addWall(sc,colliders,-9,8,.3,8);addWall(sc,colliders,9,8,-.3,8);
  const vault=new THREE.Group();vault.add(mesh(new THREE.BoxGeometry(4,2.4,4),M(0x2a2630),0,1.2,0));
  const glow=mesh(new THREE.OctahedronGeometry(.6,0),new THREE.MeshStandardMaterial({color:0xecb64e,emissive:0xecb64e,emissiveIntensity:1.6}),0,3.4,0);vault.add(glow);sc.add(vault);colliders.push({x:0,z:0,r:2.6});
  const pl=new THREE.PointLight(0xecb64e,1.4,18);pl.position.set(0,4,0);sc.add(pl);
  const lab=makeLabel('Was I right?','',.6);lab.position.set(0,5.4,0);sc.add(lab);
  const portal=makePortal(0x6a6070);portal.position.set(0,0,38);sc.add(portal);
  let searched=false;
  function end(success,reason,found){if(missionOver)return;finishMission({kind:'relic',success,reason,cfg,found});}
  interact.push({x:0,z:0,r:4.2,enabled:()=>!searched,label:()=>'Search the vault',action:()=>{searched=true;const found=Math.random()<RELIC_CHANCE;setTimeout(()=>end(true,'',found),900);toast(found?'Your hand closes around something cold...':'Dust. Only dust.',found?'good':'');}});
  interact.push({x:0,z:38,r:3.4,label:()=>'Leave the ruins',action:()=>end(false,'You left the ruins without searching the vault.')});
  setObjective('Find the vault in the ruins.');
  return{kind:'relic',scene:sc,colliders,interact,radius:44,squireTargets:()=>[],
    abandon(){end(false,'You left the ruins.');},onDeath(){end(false,'You fell in the ruins.');},onAttack(){},
    update(dt,t){glow.rotation.y+=dt;glow.position.y=3.4+Math.sin(t*1.5)*.2;portal.userData.disc.material.opacity=.3+Math.sin(t*2)*.1;}};}
