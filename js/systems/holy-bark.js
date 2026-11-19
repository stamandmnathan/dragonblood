// ========================================================================
// DragonBlood · Holy bark
// Weapon affixes: bark types and tiers, sockets, and the stats they give.
// ========================================================================
'use strict';
// Holy bark works like a gem affix. There is one kind per dragon element, each with its own effect, and five
// tiers. It drops as Seedling (tier 1) of the grove's element from Holy Tree Trials; three of the same kind and
// tier combine into one of the next tier at the Holy Tree. Only the equipped weapon's sockets count.
// Sockets per weapon: tier 1-2 weapons have 1, tier 3-4 have 2, tier 5 has 3. Bark can be removed freely.
const BARK_TIERS=['Seedling','Sapling','Heartwood','Elder','Ancient'];
const BARK_TYPES={
  fire:{name:'Emberbark',stat:'dmg',vals:[.04,.09,.16,.26,.40],fx:v=>`+${Math.round(v*100)}% weapon damage`},
  ice:{name:'Frostbark',stat:'def',vals:[.03,.06,.10,.15,.22],fx:v=>`-${Math.round(v*100)}% damage taken`},
  electric:{name:'Stormbark',stat:'spd',vals:[.03,.07,.12,.18,.26],fx:v=>`+${Math.round(v*100)}% attack speed`},
  poison:{name:'Venombark',stat:'crit',vals:[.04,.08,.13,.19,.27],fx:v=>`${Math.round(v*100)}% chance to strike for double damage`},
  lava:{name:'Magmabark',stat:'hp',vals:[.05,.10,.17,.26,.38],fx:v=>`+${Math.round(v*100)}% max health`},
  void:{name:'Voidbark',stat:'dpr',vals:[.08,.18,.30,.45,.65],fx:v=>`+${Math.round(v*100)}% Dragon Power regen`},
};
const BARK_IDS=Object.keys(BARK_TYPES);
const BARK_COMBINE=3,STAT_CAP={def:.6,crit:.75};
const barkName=(e,t)=>`${BARK_TIERS[t-1]} ${BARK_TYPES[e].name}`;
const slotsFor=id=>{const l=WEAPONS[id].lvl;return l>=5?3:l>=3?2:1;};
function barkInv(){// migrate the old single-kind array (plain damage) into Emberbark
  if(Array.isArray(S.bark)){const old=S.bark;S.bark={};for(const e of BARK_IDS)S.bark[e]=[0,0,0,0,0];old.forEach((n,i)=>S.bark.fire[i]=n);}
  S.bark=S.bark||{};for(const e of BARK_IDS)if(!S.bark[e])S.bark[e]=[0,0,0,0,0];return S.bark;}
function socketsOf(id){S.sockets=S.sockets||{};const n=slotsFor(id);let a=(S.sockets[id]||[]).map(s=>typeof s==='number'?(s?{e:'fire',t:s}:0):s);while(a.length<n)a.push(0);S.sockets[id]=a;return a;}
function barkStat(stat,id){if(!S||!S.weapon)return 0;let v=0;for(const s of socketsOf(id||S.weapon))if(s&&BARK_TYPES[s.e].stat===stat)v+=BARK_TYPES[s.e].vals[s.t-1];return STAT_CAP[stat]?Math.min(STAT_CAP[stat],v):v;}
const weaponDmg=()=>Math.round(WEAPONS[S.weapon].dmg*(1+barkStat('dmg')));
function barkSummary(id){const parts=[];for(const e of BARK_IDS){const T=BARK_TYPES[e];const v=barkStat(T.stat,id);if(v)parts.push(T.fx(v));}return parts.join(' · ');}
