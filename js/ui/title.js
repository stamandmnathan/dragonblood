// ========================================================================
// DragonBlood · Title screen
// Faction pick, founding a new village, continue.
// ========================================================================
'use strict';
let pickFaction=null,pickTribute='gold';
// Show the title screen.
function showTitle(){started=false;$('#title').hidden=false;updateChrome();
  const has=!!(saved&&S.faction);$('#continueRow').hidden=!has;
  if(has){const k=kingdom();$('#continueMeta').textContent=`${FACTIONS[S.faction].name} · ${k.name} level ${k.level} · ${S.dragons.length} dragon${S.dragons.length===1?'':'s'}`;$('#factionHead').textContent='Or start over with a new faction';$('#foundBtn').textContent='Start a new village';}
  else{$('#factionHead').textContent='Choose your faction';$('#foundBtn').textContent='Found your village';}
  renderFactions();}
// Faction cards for a new game.
function renderFactions(){
  $('#factionCards').innerHTML=FACTION_IDS.map(id=>{const F=FACTIONS[id];return `<button type="button" class="fcard" data-f="${id}" aria-pressed="${pickFaction===id}"><span class="sigil" style="background:${F.color}">${F.sig}</span><span class="fname">${F.name}</span><span class="fmotto">${F.motto}</span><span class="fperk"><b>Perk</b> · ${F.perk}</span></button>`;}).join('');
  $('#tributeSeg').innerHTML=['gold','material','holy'].map(t=>`<button type="button" data-t="${t}" aria-pressed="${pickTribute===t}">${RES_NAMES[t]}${t==='gold'?' (default)':''}</button>`).join('');
  $('#foundBtn').disabled=!pickFaction;$('#foundMeta').textContent=pickFaction?`You will fight for ${FACTIONS[pickFaction].name}.`:'Pick a faction to begin.';}
$('#factionCards').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;pickFaction=b.dataset.f;renderFactions();});
$('#tributeSeg').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;pickTribute=b.dataset.t;renderFactions();});
// Leave the title and start playing.
function enterGame(){ if(S.rangeWeapon){S.weapon=S.rangeWeapon;delete S.rangeWeapon;}$('#title').hidden=true;started=true;holyTick();seasonInit();applyTestBoost();lastTier=kingdom().tier;buildWeaponModel();
  if(!S.tutorialDone){updateChrome();updateHUD();startTutorial();return;}
  setScene(buildHub());P.x=0;P.z=4;P.yaw=0;P.pitch=-.05;P.hp=maxHp();
  if(S.carriedEgg&&S.carriedEgg.expiresAt==null)S.carriedEgg.expiresAt=Date.now()+60000;
  updateChrome();updateHUD();save();
  if(TEST_MODE)toast(`Test mode: rider level ${S.playerLvl}, best gear, stalls at level 5, unlimited gold and material.`,'good');
  checkSeason();
  if(!S.won&&!S.dragons.length){
    toast('Welcome. Open Menu for controls. Walk to the Mission Gate behind you and start an egg hunt (E).');
  }else if(!S.won){
    toast('Tip: the bar at the bottom lists keys for your current mode. Menu has the full guide.');
  }}
$('#foundBtn').addEventListener('click',()=>{if(!pickFaction)return;S=freshState();S.faction=pickFaction;S.tribute=pickTribute;S.tutorialDone=false;enterGame();});
$('#continueBtn').addEventListener('click',enterGame);
