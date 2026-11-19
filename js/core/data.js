// ========================================================================
// DragonBlood · Data & helpers
// Math/format helpers and the static game tables: elements, rarity, factions,
// regions, settlement tiers, weapons, tools, vendors, dragon names.
// ========================================================================
'use strict';
const $=s=>document.querySelector(s);
if(!window.THREE){ document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:auto 16px 16px;color:#ece3d6">The 3D engine failed to load. Check your connection and reload the page.</p>'); throw new Error('three.js failed to load'); }

// Math/format helpers, then static tables: elements, rarity, factions, regions,
// settlement tiers, weapons, tools, vendors, dragon names.
// --- small helpers
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pct=v=>Math.round(v*100)+'%';
const fmtTime=s=>{s=Math.max(0,Math.ceil(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return [h,m,x].map(n=>String(n).padStart(2,'0')).join(':');};
const fmtShort=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

// --- elements, rarity, factions, regions, settlement tiers
const ELEMENTS={
  fire:{name:'Fire',color:0xe2552b,food:'Deep Lava Beetles',ground:0x3a2016,sky:0x3a1d14},
  ice:{name:'Ice',color:0x9ad8f2,food:'Glacier Krill',ground:0x5b6f7c,sky:0x8ea6b6},
  electric:{name:'Electric',color:0xf2d64b,food:'Storm Eels',ground:0x2c2c3e,sky:0x2b2c48},
  poison:{name:'Poison',color:0x7bc043,food:'Bog Toadstools',ground:0x26321c,sky:0x2c3a24},
  lava:{name:'Lava',color:0xff8a1f,food:'Molten Cores',ground:0x2c140a,sky:0x2e130b},
  void:{name:'Void',color:0x9b6bff,food:'Null Shards',ground:0x18131f,sky:0x1a1426},
};
const ELEMENT_IDS=Object.keys(ELEMENTS);
const RARITY=[
  {id:'normal',name:'Normal',w:50,mult:1,hatch:30,hp:420,css:'#bdb5a8'},
  {id:'uncommon',name:'Uncommon',w:25,mult:1.25,hatch:45,hp:560,css:'#79c47c'},
  {id:'rare',name:'Rare',w:14,mult:1.6,hatch:60,hp:720,css:'#62a8ec'},
  {id:'epic',name:'Epic',w:8,mult:2.1,hatch:90,hp:900,css:'#b67fea'},
  {id:'legendary',name:'Legendary',w:3,mult:3,hatch:120,hp:1150,css:'#ecb64e'},
];
const rIdx=id=>RARITY.findIndex(r=>r.id===id);
const FACTIONS={
  ember:{name:'House of Embers',color:'#d9693a',hex:0xd9693a,motto:'Born of the first flame.',perk:'+20% gold from every mission',sig:'E'},
  frost:{name:'Frostveil Order',color:'#7fb6d6',hex:0x7fb6d6,motto:'Patience outlasts fire.',perk:'+10% egg extraction chance',sig:'F'},
  storm:{name:'Stormspire Pact',color:'#d8c05a',hex:0xd8c05a,motto:'Strike first, build higher.',perk:'Stall upgrades cost 15% less',sig:'S'},
};
const FACTION_IDS=Object.keys(FACTIONS);
const REGIONS=[
  {name:'Cinder Reach',bonus:'Eggs hatch 30% faster',key:'hatch'},
  {name:'Rimefall Basin',bonus:'+3 food on Dragon Feed missions',key:'feed'},
  {name:'Tempest Crags',bonus:'+25% gold from missions',key:'gold'},
];
const TIERS=[{name:'Village',min:0},{name:'Town',min:70},{name:'Stronghold',min:140},{name:'City',min:230},{name:'Kingdom',min:340}];
// Three weapon types, five tiers each (tier = Blacksmith stall level needed).
// Sword: balanced, can block. Dagger: strikes about twice as fast for less per hit, can block.
// Bow: fires arrows up to ~60m at whatever the crosshair is on (including dragons in the air); cannot block.
// --- weapons
const WTYPES={
  sword:{name:'Sword',cd:.45,anim:.32,desc:'Balanced reach and damage. Can block.'},
  dagger:{name:'Dagger',cd:.25,anim:.2,desc:'Strikes about twice as fast for less damage per hit. Can block.'},
  bow:{name:'Bow',cd:.75,anim:.45,desc:'Fires arrows at whatever the crosshair is on, out to about 60m, including dragons in the air. Cannot block.'},
};
const WEAPONS={
  iron:{type:'sword',name:'Iron Blade',dmg:12,lvl:1,gold:0,mat:0,color:0xb8b8c0},
  glaive:{type:'sword',name:'Steel Longsword',dmg:20,lvl:2,gold:140,mat:20,color:0xd0d6e0},
  spear:{type:'sword',name:'Dragonbone Blade',dmg:32,lvl:3,gold:320,mat:70,color:0xe8dcc0},
  great:{type:'sword',name:'Runed Greatsword',dmg:48,lvl:4,gold:620,mat:140,color:0x9fd4ff},
  slayer:{type:'sword',name:'Wyrmslayer',dmg:70,lvl:5,gold:1100,mat:260,color:0xffc46b},
  dIron:{type:'dagger',name:'Iron Dagger',dmg:7,lvl:1,gold:40,mat:0,color:0xb8b8c0},
  dSteel:{type:'dagger',name:'Steel Stiletto',dmg:12,lvl:2,gold:120,mat:20,color:0xd0d6e0},
  dBone:{type:'dagger',name:'Dragonbone Fang',dmg:19,lvl:3,gold:300,mat:70,color:0xe8dcc0},
  dRune:{type:'dagger',name:'Runed Kris',dmg:28,lvl:4,gold:600,mat:140,color:0x9fd4ff},
  dWyrm:{type:'dagger',name:'Wyrmfang',dmg:41,lvl:5,gold:1050,mat:260,color:0xffc46b},
  bHunt:{type:'bow',name:'Hunting Bow',dmg:10,lvl:1,gold:60,mat:0,color:0x7a5230},
  bSteel:{type:'bow',name:'Steel Recurve',dmg:17,lvl:2,gold:140,mat:20,color:0x8a8f99},
  bBone:{type:'bow',name:'Dragonbone Longbow',dmg:27,lvl:3,gold:320,mat:70,color:0xe8dcc0},
  bRune:{type:'bow',name:'Runed Warbow',dmg:41,lvl:4,gold:620,mat:140,color:0x6f9fd0},
  bWyrm:{type:'bow',name:'Wyrmstring',dmg:60,lvl:5,gold:1100,mat:260,color:0xffb04a},
};
const wType=()=>WEAPONS[S.weapon].type||'sword';
// --- tools, vendor stalls, names
const TOOLS={
  tongs:{name:'Obsidian Tongs',bonus:.12,lvl:1,gold:90,mat:10},
  gauntlets:{name:'Heat Gauntlets',bonus:.15,lvl:2,gold:180,mat:30},
  cradle:{name:'Runic Egg Cradle',bonus:.2,lvl:4,gold:420,mat:90},
};
const VENDORS={
  smith:{name:'Blacksmith',eyebrow:'Weapons',awning:0x8c2f22},
  alch:{name:'Alchemist',eyebrow:'Extraction tools and salves',awning:0x3f6b4a},
  armor:{name:'Armorer',eyebrow:'Dragon armor and saddles',awning:0x4a4f7a},
  prov:{name:'Provisioner',eyebrow:'Trade and lures',awning:0x8a6a2a},
};
const DRAGON_NAMES=['Ashka','Velkyr','Morrow','Isenne','Thrask','Calyx','Orrin','Sable','Nyx','Brannoc','Zephra','Kaldra','Vesh','Ithra','Corvane'];
const RES_NAMES={gold:'Gold',material:'Material',holy:'Holy Water'};
