// ========================================================================
// DragonBlood · Save state & derived stats
// S (the save) with load/save, test mode, and stats computed from S:
// economy, dragon riding stats, max health, kingdom level, XP.
// ========================================================================
'use strict';
// S = persistent save. P = live player pose/vitals. cur = active 3D scene.
// --- save / load
const SAVE_KEY='dragonblood-save-v1';
const dayIndex=()=>Math.floor(Date.now()/86400000);
// Default save for a brand-new village.
function freshState(){return{
  faction:null,           // ember | frost | storm
  tribute:'gold',         // resource spent on War Table assaults
  gold:150,material:50,holy:1,lastHolyDay:dayIndex(),
  playerLvl:1,xp:0,won:0,lost:0,
  vendors:{smith:1,alch:1,armor:1,prov:1}, // stall levels 1–5
  weapon:'iron',owned:['iron'],tools:[],salves:2,lures:0,
  food:{fire:0,ice:0,electric:0,poison:0,lava:0,void:0},
  carriedEgg:null,        // egg in hand (dies if not hatched in time)
  hatchery:null,          // incubating egg {rarity,element,lvl,start,dur}
  dragons:[],active:null,nextId:1,bondReadyAt:0,
  tutorialDone:true,tutDragon:null, // new villages set tutorialDone=false; missing saves inherit true
  squire:{name:'Tobin',lvl:1,xp:0,exp:null,missions:0}, // exp = active expedition or null
  scrolls:[],nextScroll:1,// legendary scrolls {uid,id,uses}
  bark:null,              // holy bark inventory by element/tier
  sockets:{},             // weaponId -> bark socket slots
  season:new Date().getFullYear(),
  relic:false,relicDragon:null,
  regions:REGIONS.map(()=>FACTION_IDS[Math.floor(Math.random()*3)]),
};}
// Read the save from localStorage (null if missing or corrupt).
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw){
      const o=JSON.parse(raw);
      if(o&&o.vendors&&o.faction)return Object.assign(freshState(),o);
    }
  }catch(e){}
  return null;
}
// Write S to localStorage.
function save(){
  if(!S.faction)return;
  if(TEST_MODE){S.gold=UNLIMITED;S.material=UNLIMITED;}
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}
}
// Holy Water income (accrues over real time).
function holyTick(){
  const d=dayIndex();
  if(d>S.lastHolyDay){
    S.holy=Math.min(7,S.holy+(d-S.lastHolyDay));
    S.lastHolyDay=d;
  }
}
const saved=load();
let S=saved||freshState(); // save blob (see freshState fields above)

// --- test mode
// Test mode (temporary): higher rider level, best gear, unlimited gold and material.
// Set TEST_MODE to false to go back to normal progression.
const TEST_MODE=true,UNLIMITED=999999,TEST_LEVEL=10;
function applyTestBoost(){if(!TEST_MODE)return;
  S.playerLvl=Math.max(S.playerLvl,TEST_LEVEL);
  S.owned=Object.keys(WEAPONS);S.weapon='slayer';
  S.tools=Object.keys(TOOLS);
  for(const k in S.vendors)S.vendors[k]=5;
  S.salves=Math.max(S.salves,10);
  if(!S.testScrolls){S.testScrolls=true;for(const id of['fireball','bolt','poison'])addScroll(id);}// test mode: one of each Legendary scroll
  S.gold=UNLIMITED;S.material=UNLIMITED;
  // one fully raised dragon so riding can be tested right away
  if(S.tutorialDone===false)return;// the tutorial hands out the first dragon
  const grown=S.dragons.filter(d=>d.growth>=100).length;
  const starters=[{rarity:'epic',element:'fire',lvl:3}];
  for(let i=grown;i<1;i++){const d=makeDragonFromEgg(starters[i]);d.growth=100;d.imprint=50;S.dragons.push(d);}
  if(!S.active||!S.dragons.some(d=>d.id===S.active&&d.growth>=100))S.active=S.dragons.find(d=>d.growth>=100).id;}

// --- economy & dragon stats (derived from S, never stored)
const regionBonus=key=>S.faction&&REGIONS.some((r,i)=>r.key===key&&S.regions[i]===S.faction);
const goldMul=()=>(S.faction==='ember'?1.2:1)*(regionBonus('gold')?1.25:1);
const vendorCost=lv=>{
  const m=S.faction==='storm'?.85:1; // Stormspire: stalls 15% cheaper
  return{gold:Math.round(90*lv*m),mat:Math.round(35*lv*m)};
};
// Base 45% + 4%/rider level + tools + Frostveil 10%. Clamped 5–95%.
const extractChance=()=>clamp(
  .45+.04*(S.playerLvl-1)+S.tools.reduce((a,t)=>a+TOOLS[t].bonus,0)+(S.faction==='frost'?.1:0),
  .05,.95
);
const hatchSecs=e=>Math.round(RARITY[rIdx(e.rarity)].hatch*(1+.12*(e.lvl-1))*(regionBonus('hatch')?.7:1));
const rar=d=>RARITY[rIdx(d.rarity)]; // rarity row for a dragon or egg
const foodNeeded=d=>Math.ceil(5*rar(d).mult);
// Riding stats: stamina/health/attack rise with flight level (flv) from dragon missions.
// Armor/saddle only cut damage taken and raise health.
const flv=d=>d.flv||1; // flight level (defaults to 1 on older saves)
const dragonLevel=d=>1+Math.floor(d.growth/100*9)+d.armor+d.saddle+(flv(d)-1);
const dragonPower=d=>Math.round(
  20*rar(d).mult*(.15+.85*d.growth/100)*(1+d.imprint/100)*(1+.12*(flv(d)-1))*(1+.05*(d.lvl-1))
);
const dStam=d=>Math.round(100*(1+.1*(flv(d)-1))*(.9+.1*rar(d).mult));
const dHp=d=>Math.round(rar(d).hp*.5*(1+.1*(flv(d)-1))*(1+.08*d.armor+.05*d.saddle));
const dReduce=d=>Math.min(.45,.06*d.armor+.03*d.saddle); // damage reduction while riding
const PROTO_DIV=6; // prototype: recovery cooldowns run 6× faster than design (3–5 min)
const dCoolDesign=d=>(300-(Math.min(flv(d),10)-1)*120/9)*(1-.25*d.imprint/100);
const dCool=d=>dCoolDesign(d)/PROTO_DIV;
function grantDragonXP(d,n){
  d.fxp=(d.fxp||0)+n;
  let up=false;
  while(d.fxp>=100*flv(d)){d.fxp-=100*flv(d);d.flv=flv(d)+1;up=true;}
  if(up)toast(`${d.name} reached flight level ${d.flv}. Stamina, health and attack went up.`,'good');
}
// --- player & kingdom stats
const activeDragon=()=>S.dragons.find(d=>d.id===S.active)||null;
const maxHp=()=>Math.round((100+10*(S.playerLvl-1))*(1+(typeof barkStat==='function'?barkStat('hp'):0)));
// Gear score used by the kingdom level.
function equipScore(){
  return WEAPONS[S.weapon].dmg+S.tools.length*10+S.dragons.reduce((a,d)=>a+(d.armor+d.saddle)*8,0);
}
// Kingdom level, tier and name, computed from buildings, dragons and gear.
function kingdom(){
  const parts=[
    ['Vendors','Sum of stall levels × 4',Object.values(S.vendors).reduce((a,b)=>a+b,0)*4],
    ['Rider','Your level × 6',S.playerLvl*6],
    ['Dragons','Sum of dragon levels × 3',S.dragons.reduce((a,d)=>a+dragonLevel(d),0)*3],
    ['Equipment','Equipment score ÷ 2',Math.round(equipScore()/2)],
    ['Missions','Successful missions × 5',S.won*5],
  ];
  const score=parts.reduce((a,p)=>a+p[2],0);
  let tier=0;TIERS.forEach((t,i)=>{if(score>=t.min)tier=i;});
  return{parts,score,tier,level:1+Math.floor(score/15),name:TIERS[tier].name};
}
// Give rider XP and handle level-ups.
function grantXP(n){
  S.xp+=n;
  let msg=null;
  while(S.xp>=100*S.playerLvl){S.xp-=100*S.playerLvl;S.playerLvl++;msg=`Rider level ${S.playerLvl}`;}
  if(msg)toast(msg+'. Max health, Intelligence and extraction chance went up.','good');
}
