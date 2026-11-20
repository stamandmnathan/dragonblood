// ========================================================================
// DragonBlood · Enemy models
// Enemy soldiers, armored knights, dragon riders, nest critters and corrupted
// husks, plus their walk and attack animation (enemyAnim / enemyStrike).
// ========================================================================
'use strict';
// Rules the scenes rely on (keep these when editing a model):
//   models face +z (AI turns them with rotation.y = atan2(dx, dz)) and stand on y=0;
//   userData.mats are the materials the red hit flash tints (tickFlash);
//   humanoids are about 1.9 tall, critters about 1 tall and 2 long.
// Call enemyAnim(m, dt) every frame while an enemy is alive: it works out walking
// speed from how far the model moved, so the AI code doesn't need to report it.

// --- humanoid builder (soldier, knight, rider)
// Limbs are groups pivoting at the hip/shoulder so they can swing.
function eLimb(parent,x,y,z,parts){const g=new THREE.Group();g.position.set(x,y,z);for(const p of parts)g.add(p);parent.add(g);return g;}
function makeHumanoid(o){
  const g=new THREE.Group(),V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const body=M(o.body,{roughness:.6,metalness:o.metal?.6:.1});
  const cloth=M(o.cloth,{roughness:.9});
  const trim=M(o.trim||0xc9a35a,{roughness:.5,metalness:.5});
  const skin=M(0xd9b48f),dark=M(0x2a211c,{roughness:.8});
  const steel=M(0xc8ccd4,{metalness:.8,roughness:.3,flatShading:false});
  const mats=[body,cloth,skin];
  const root=new THREE.Group();g.add(root);// bobs while walking
  // legs: thigh, shin, boot
  const legs=[-1,1].map(s=>eLimb(root,s*.15,.92,0,[
    dBone(V(0,0,0),V(0,-.46,.02),.11,.09,o.metal?body:cloth,6),dBone(V(0,-.46,.02),V(0,-.84,0),.09,.08,body,6),
    mesh(new THREE.BoxGeometry(.17,.13,.3),dark,0,-.86,.05)]));
  // torso, belt, tabard front and back, shoulders
  root.add(mesh(new THREE.CylinderGeometry(.3,.24,.62,8),body,0,1.22,0));
  root.add(mesh(new THREE.CylinderGeometry(.26,.26,.08,8),M(0x3a2a1e),0,.95,0));
  root.add(mesh(new THREE.SphereGeometry(.03,6,4),trim,0,.95,.26));// buckle
  for(const z of[.24,-.24]){const tb=mesh(new THREE.BoxGeometry(.36,.72,.02),cloth,0,.98,z);tb.rotation.x=z>0?.06:-.06;root.add(tb);}
  if(o.emblem!=null)root.add(mesh(new THREE.OctahedronGeometry(.07,0),M(o.emblem,{metalness:.5,roughness:.4}),0,1.2,.27));
  for(const s of[-1,1])root.add(mesh(new THREE.SphereGeometry(o.metal?.17:.13,8,6),o.metal?body:cloth,s*.33,1.5,0));// pauldrons
  // head and neck
  root.add(mesh(new THREE.CylinderGeometry(.08,.1,.12,6),skin,0,1.58,0));
  const head=new THREE.Group();head.position.set(0,1.74,0);root.add(head);
  head.add(mesh(new THREE.SphereGeometry(.17,10,8),skin));
  // arms: right holds the weapon, left the shield
  const arm=(s,extra)=>eLimb(root,s*.36,1.46,0,[dBone(V(0,0,0),V(0,-.3,.02),.07,.06,o.metal?body:cloth,6),dBone(V(0,-.3,.02),V(0,-.56,.08),.06,.05,o.metal?body:skin,6),
    mesh(new THREE.SphereGeometry(.055,6,5),o.metal?body:skin,0,-.6,.1),...extra]);
  const wpn=new THREE.Group();wpn.position.set(0,-.6,.12);
  const armR=arm(1,[wpn]);
  const shield=new THREE.Group();shield.position.set(-.08,-.42,.14);
  const armL=arm(-1,[shield]);
  g.userData={mats,flash:0,legs,arms:[armL,armR],armR,head,root,walk:0};
  return {g,root,head,wpn,shield,body,cloth,trim,steel,dark,mats,V};}

// Enemy foot soldier: chain shirt, red tabard, kettle helm, sword or axe, round shield.
function makeSoldier(color){const h=makeHumanoid({body:0x7a7f88,cloth:color||0x8a2f2f,metal:false,emblem:0x2a1a14});
  const{head,wpn,shield,steel,dark,trim,mats}=h;
  const helm=M(0x6a6e76,{metalness:.7,roughness:.4});mats.push(helm);
  head.add(mesh(new THREE.SphereGeometry(.19,10,6,0,Math.PI*2,0,Math.PI/2),helm,0,.03,0));
  const brim=mesh(new THREE.CylinderGeometry(.3,.3,.03,12),helm,0,.04,0);head.add(brim);
  for(const s of[-1,1])head.add(mesh(new THREE.SphereGeometry(.025,5,4),dark,s*.065,0,.15));// eyes
  if(Math.random()<.5){// sword
    const bl=mesh(new THREE.BoxGeometry(.05,.75,.015),steel,0,0,.38);bl.rotation.x=Math.PI/2;wpn.add(bl);
    const gd=mesh(new THREE.BoxGeometry(.2,.04,.05),trim,0,0,.02);wpn.add(gd);}
  else{// axe
    const hd=mesh(new THREE.CylinderGeometry(.025,.025,.8,6),M(0x5a3d26),0,0,.28);hd.rotation.x=Math.PI/2;wpn.add(hd);
    const bl=mesh(new THREE.BoxGeometry(.03,.22,.18),steel,0,.1,.56);wpn.add(bl);}
  const sh=mesh(new THREE.CylinderGeometry(.3,.3,.05,14),M(0x6b4a2a),0,0,0);sh.rotation.x=Math.PI/2;shield.add(sh);// faces forward
  shield.add(mesh(new THREE.SphereGeometry(.08,8,6),trim,0,0,.04));// boss
  shield.add(mesh(new THREE.TorusGeometry(.3,.02,4,16),M(0x5a5d64,{metalness:.6}),0,0,0));// rim
  return h.g;}

// Armored knight: full plate, great helm with plume, cape, longsword, kite shield.
function makeKnight(){const h=makeHumanoid({body:0xa8adb8,cloth:0x2a2d3a,metal:true,emblem:0xc9a35a,trim:0xc9a35a});
  const{g,root,head,wpn,shield,steel,trim,mats}=h;
  const plate=M(0x9a9fa9,{metalness:.8,roughness:.3});mats.push(plate);
  head.add(mesh(new THREE.CylinderGeometry(.2,.21,.36,10),plate,0,.02,0));
  head.add(mesh(new THREE.BoxGeometry(.3,.025,.04),M(0x111111),0,.04,.19));// visor slit
  head.add(mesh(new THREE.BoxGeometry(.02,.22,.04),trim,0,0,.2));
  const plume=M(0xb02a2a,{roughness:.9});mats.push(plume);
  for(let i=0;i<5;i++)head.add(mesh(new THREE.SphereGeometry(.07-i*.006,6,5),plume,0,.24-i*.03,-.04-i*.07));
  const cape=mesh(new THREE.BoxGeometry(.6,1.05,.03),M(0x2a2d3a,{side:THREE.DoubleSide}),0,1.0,-.3);cape.rotation.x=.12;root.add(cape);
  const bl=mesh(new THREE.BoxGeometry(.06,1.0,.02),steel,0,0,.52);bl.rotation.x=Math.PI/2;wpn.add(bl);
  wpn.add(mesh(new THREE.BoxGeometry(.28,.05,.06),trim,0,0,.02));
  const ks=new THREE.Shape();ks.moveTo(0,.36);ks.lineTo(.24,.25);ks.lineTo(.2,-.1);ks.lineTo(0,-.42);ks.lineTo(-.2,-.1);ks.lineTo(-.24,.25);ks.closePath();
  const kg=new THREE.ExtrudeGeometry(ks,{depth:.05,bevelEnabled:false});kg.translate(0,0,-.025);shield.add(new THREE.Mesh(kg,M(0x2a2d3a)));
  shield.add(mesh(new THREE.BoxGeometry(.08,.5,.02),trim,0,0,.04));shield.add(mesh(new THREE.BoxGeometry(.32,.08,.02),trim,0,.08,.04));// gold cross
  g.scale.setScalar(1.25);return g;}

// Enemy dragon rider: leather armor, flight cap and goggles, red scarf, short sword.
function makeRider(){const h=makeHumanoid({body:0x6a4a30,cloth:0x4a3020,metal:false,emblem:null});
  const{root,head,wpn,steel,dark,mats}=h;
  const cap=M(0x5a3d26,{roughness:.8});mats.push(cap);
  head.add(mesh(new THREE.SphereGeometry(.185,10,6,0,Math.PI*2,0,Math.PI*.6),cap,0,.02,0));
  for(const s of[-1,1]){const rim=mesh(new THREE.CylinderGeometry(.055,.055,.04,10),M(0x9a6a2a,{metalness:.6}),s*.07,.04,.15);rim.rotation.x=Math.PI/2;head.add(rim);// goggles
    head.add(mesh(new THREE.CircleGeometry(.045,10),new THREE.MeshBasicMaterial({color:0x8fd8ff}),s*.07,.04,.175));}
  const scarf=M(0xb02a2a,{roughness:.9,side:THREE.DoubleSide});mats.push(scarf);
  const wrap=mesh(new THREE.TorusGeometry(.13,.05,6,12),scarf,0,1.56,0);wrap.rotation.x=Math.PI/2;root.add(wrap);
  const tail=mesh(new THREE.BoxGeometry(.12,.45,.02),scarf,.06,1.38,-.18);tail.rotation.set(.5,0,.2);root.add(tail);
  const bl=mesh(new THREE.BoxGeometry(.04,.5,.015),steel,0,0,.27);bl.rotation.x=Math.PI/2;wpn.add(bl);wpn.add(mesh(new THREE.BoxGeometry(.14,.035,.04),dark,0,0,.02));
  return h.g;}

// --- nest critter: a beetle-like crawler tinted by element (feed, tutorial, practice range)
function makeCritter(color){const g=new THREE.Group(),V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const c=new THREE.Color(color);
  const shell=M(c.clone().multiplyScalar(.45),{roughness:.35,metalness:.3});
  const under=M(c.clone().multiplyScalar(.22),{roughness:.8});
  const legM=M(0x1e1814,{roughness:.6});
  const eye=new THREE.MeshBasicMaterial({color:c.clone().lerp(new THREE.Color(0xffffff),.35)});
  const root=new THREE.Group();g.add(root);
  // abdomen, thorax, head (ridged shell plates on top)
  const ab=mesh(new THREE.SphereGeometry(.55,10,8),shell,0,.6,-.45);ab.scale.set(1,.75,1.25);root.add(ab);
  for(let i=0;i<3;i++){const r=mesh(new THREE.TorusGeometry(.42-i*.08,.035,4,12,Math.PI),under,0,.62,-.2-i*.3);r.rotation.y=Math.PI/2;r.rotation.z=Math.PI/2;r.scale.set(1,1,.9);root.add(r);}
  root.add(mesh(new THREE.SphereGeometry(.36,8,6),under,0,.55,.25));
  const head=new THREE.Group();head.position.set(0,.58,.62);root.add(head);
  head.add(mesh(new THREE.SphereGeometry(.28,8,6),shell));
  for(const s of[-1,1]){head.add(mesh(new THREE.SphereGeometry(.07,6,5),eye,s*.15,.1,.2));
    head.add(dBone(V(s*.1,.18,.12),V(s*.32,.62,.42),.02,.008,legM,4));}// antennae
  // mandibles (snap on attack)
  const mand=[-1,1].map(s=>{const m=new THREE.Group();m.position.set(s*.12,-.08,.22);head.add(m);
    m.add(dSpike(V(0,0,0),V(s*-.5,0,1),.05,.32,legM,4));return m;});
  // back spikes
  for(let i=0;i<3;i++)root.add(dSpike(V(0,.98-i*.04,-.15-i*.35),V(0,1,-.4),.06,.22,legM,4));
  // six legs in groups (skitter while walking)
  const legs=[];
  for(const s of[-1,1])for(let i=0;i<3;i++){const z=.35-i*.4,leg=new THREE.Group();leg.position.set(s*.3,.55,z);root.add(leg);legs.push(leg);
    leg.add(dBone(V(0,0,0),V(s*.38,.12,0),.05,.04,legM,4));leg.add(dBone(V(s*.38,.12,0),V(s*.58,-.55,(1-i)*.12),.04,.02,legM,4));}
  g.userData={mats:[shell,under],flash:0,legs,mand,root,walk:0,crawl:true};return g;}

// --- corrupted husk: a hunched creature of rotten bark with a glowing core (Holy Tree trial)
function makeHusk(color){const g=new THREE.Group(),V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const bark=M(0x3a3040,{roughness:.95}),moss=M(0x2a3a2a,{roughness:1});
  const glow=new THREE.MeshBasicMaterial({color:color||0x9b6bff});
  const root=new THREE.Group();g.add(root);
  // root legs
  const legs=[-1,1].map(s=>eLimb(root,s*.2,.8,0,[dBone(V(0,0,0),V(s*.1,-.45,.1),.13,.1,bark,5),dBone(V(s*.1,-.45,.1),V(s*.05,-.8,-.05),.1,.07,bark,5),
    dSpike(V(s*.05,-.78,0),V(s*.3,-.1,1),.05,.25,bark,4),dSpike(V(s*.05,-.78,0),V(-s*.2,-.1,1),.05,.22,bark,4)]));
  // hunched trunk, cracked open over a glowing core
  const trunk=dBone(V(0,.75,0),V(0,1.55,.35),.36,.24,bark,7);root.add(trunk);
  root.add(mesh(new THREE.SphereGeometry(.17,8,6),glow,0,1.15,.24));
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;root.add(mesh(new THREE.BoxGeometry(.04,.3,.04),glow,Math.sin(a)*.2,1.15+Math.cos(a)*.08,.3+Math.cos(a)*.05));}
  root.add(mesh(new THREE.SphereGeometry(.2,6,5),moss,.18,1.4,-.1));
  // head: a knot with glowing eyes and branch horns
  const head=new THREE.Group();head.position.set(0,1.65,.45);root.add(head);
  head.add(mesh(new THREE.SphereGeometry(.2,7,6),bark));
  for(const s of[-1,1]){head.add(mesh(new THREE.SphereGeometry(.045,6,5),glow,s*.08,.02,.17));
    dHorn(head,V(s*.1,.12,-.05),V(s*.6,1,-.4),-.2,.05,.6,3,bark);}
  // long branch arms with claws
  const arm=s=>eLimb(root,s*.36,1.45,.25,[dBone(V(0,0,0),V(s*.12,-.45,.25),.08,.06,bark,5),dBone(V(s*.12,-.45,.25),V(s*.1,-.9,.4),.06,.035,bark,5),
    dSpike(V(s*.1,-.9,.4),V(0,-1,.5),.03,.2,bark,4),dSpike(V(s*.1,-.9,.4),V(s*.4,-1,.3),.03,.18,bark,4)]);
  const armL=arm(-1),armR=arm(1);
  g.userData={mats:[bark,moss],flash:0,legs,arms:[armL,armR],armR,head,root,walk:0};return g;}

// --- animation
// Walk cycle from distance moved; attack swing after enemyStrike(); hit flash.
function enemyAnim(m,dt){const u=m.userData;if(!u.root)return;tickFlash(m,dt);
  const p=m.position;if(!u.last){u.last=p.clone();u.mv=0;}
  const d=Math.hypot(p.x-u.last.x,p.z-u.last.z);u.last.copy(p);
  const speed=dt>0?d/dt:0;u.mv+=((speed>.3?1:0)-u.mv)*Math.min(1,dt*8);
  u.walk+=d*(u.crawl?9:3.2);const w=u.walk,k=u.mv;
  if(u.atk>0)u.atk=Math.max(0,u.atk-dt);const pr=u.atk>0?1-u.atk/.35:0,a=u.atk>0?Math.sin(pr*Math.PI):0;// pr: 0..1 through the swing
  if(u.crawl){// critter: alternating leg ripples, mandibles snap
    u.legs.forEach((l,i)=>{const ph=w+(i%3)*2.1+(i<3?0:Math.PI);l.rotation.y=Math.sin(ph)*.45*k;l.rotation.z=Math.max(0,Math.cos(ph))*.25*k*(i<3?1:-1);});
    u.mand.forEach((md,i)=>{md.rotation.y=(i?-1:1)*(.15+a*.7);});
    u.root.rotation.x=-a*.25;return;}
  // humanoid / husk: legs and arms swing opposite, body bobs, weapon arm swings on attack
  u.legs.forEach((l,i)=>{l.rotation.x=Math.sin(w+(i?Math.PI:0))*.6*k;});
  u.arms.forEach((ar,i)=>{ar.rotation.x=Math.sin(w+(i?0:Math.PI))*.4*k;});
  u.root.position.y=Math.abs(Math.sin(w))*.05*k;
  if(u.atk>0){u.armR.rotation.x=pr<.35?-2.6*pr/.35:-2.6+(pr-.35)/.65*2;u.armR.rotation.z=-.3*a;}else u.armR.rotation.z=0;// raise overhead, then chop forward
  if(u.head)u.head.rotation.y=Math.sin(performance.now()*.0012+p.x)*.25*(1-k);}
// Start an attack swing (call when the enemy lands a hit).
function enemyStrike(m){if(m&&m.userData)m.userData.atk=.35;}
