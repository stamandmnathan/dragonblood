// ========================================================================
// DragonBlood · Weapon models
// The first-person weapon: a distinct model for each of the 15 weapons,
// built from a per-weapon design (blade shape, guard, grip, pommel, runes, glow).
// ========================================================================
'use strict';
// Rules the rest of the game relies on (see updateViewmodel in player.js):
//   weaponRig.userData.blade is the held group; its position/rotation are set every frame.
//   Swords and daggers: blade points up +y from the guard at the origin.
//   Bows: string rests at local x=-.17 (moved on draw), arrow is centred at x=.2,
//   and both live in g.userData.string / g.userData.arrow; the group is scaled .55.

// --- designs
// blade: straight | taper | bone | broad | flame | stiletto | fang | kris
// guard: bar | quillon | claw | ornate | wings      pommel: ball | disc | gem | fang
// rune: glowing rune color (null = none)              edge: edge inlay color (null = none)
const WEAPON_LOOKS={
  iron:  {blade:'straight',len:.9, w:.07, guard:'bar',    pommel:'ball',grip:0x3a2a1e,rune:null,    edge:null},
  glaive:{blade:'taper',   len:.98,w:.075,guard:'quillon',pommel:'disc',grip:0x2b1d16,rune:null,    edge:null,fuller:true},
  spear: {blade:'bone',    len:.95,w:.09, guard:'claw',   pommel:'fang',grip:0x5a4632,rune:null,    edge:null},
  great: {blade:'broad',   len:1.08,w:.11,guard:'ornate', pommel:'gem', grip:0x1e2a3a,rune:0x6fd0ff, edge:null,gem:0x6fd0ff,fuller:true},
  slayer:{blade:'flame',   len:1.1, w:.1, guard:'wings',  pommel:'gem', grip:0x3a1810,rune:0xffb347, edge:0xffc46b,gem:0xff6a2a},
  dIron: {blade:'straight',len:.42,w:.06, guard:'bar',    pommel:'ball',grip:0x3a2a1e,rune:null,    edge:null},
  dSteel:{blade:'stiletto',len:.5, w:.04, guard:'quillon',pommel:'disc',grip:0x2b1d16,rune:null,    edge:null},
  dBone: {blade:'fang',    len:.46,w:.08, guard:'claw',   pommel:'fang',grip:0x5a4632,rune:null,    edge:null},
  dRune: {blade:'kris',    len:.5, w:.065,guard:'ornate', pommel:'gem', grip:0x1e2a3a,rune:0x6fd0ff, edge:null,gem:0x6fd0ff},
  dWyrm: {blade:'fang',    len:.52,w:.085,guard:'wings',  pommel:'gem', grip:0x3a1810,rune:0xffb347, edge:0xffc46b,gem:0xff6a2a},
  // bows: limb: plain | recurve | bone | runed | wyrm; h = half length of the bow
  bHunt: {bow:'plain',  h:.52,limb:0x7a5230,wrap:0x3a2a1e,rune:null},
  bSteel:{bow:'recurve',h:.52,limb:0x8a8f99,wrap:0x2b1d16,rune:null},
  bBone: {bow:'bone',   h:.6, limb:0xe8dcc0,wrap:0x5a4632,rune:null},
  bRune: {bow:'runed',  h:.56,limb:0x4a5a78,wrap:0x1e2a3a,rune:0x6fd0ff},
  bWyrm: {bow:'wyrm',   h:.58,limb:0xb8862a,wrap:0x3a1810,rune:0xffb347,string:0xffd890},
};

// --- blade outlines (half-width profile along the length, mirrored)
// Each returns [[y, halfWidth], ...] from the guard (y=0) to the tip.
function bladeProfile(kind,len,w){const P=[];const n=12;
  for(let i=0;i<=n;i++){const t=i/n,y=t*len;let hw;
    switch(kind){
      case 'taper':   hw=w*(1-.35*t)*(t>.86?(1-t)/.14:1);break;
      case 'broad':   hw=w*(1-.15*t)*(t>.8?(1-t)/.2:1);break;
      case 'stiletto':hw=w*(1-t*.95);break;
      case 'flame':   hw=w*(.85+.18*Math.sin(t*Math.PI*5))*(t>.82?(1-t)/.18:1);break;
      case 'kris':    hw=w*(1-.4*t)*(t>.85?(1-t)/.15:1);break;
      case 'bone':    hw=w*(.75+.25*Math.sin(t*Math.PI))*(t>.8?(1-t)/.2:1);break;
      case 'fang':    hw=w*(1-t*.9);break;
      default:        hw=w*(t>.88?(1-t)/.12:1);}
    P.push([y,Math.max(.002,hw)]);}return P;}
// Outline -> extruded blade. curve bends the blade sideways (fang); wave makes it wavy (kris).
function bladeMesh(kind,len,w,mat,curve,wave){const P=bladeProfile(kind,len,w),sh=new THREE.Shape();
  const off=y=>{const t=y/len;return (curve?curve*t*t:0)+(wave?Math.sin(t*Math.PI*4)*wave*(1-t*.5):0);};
  sh.moveTo(-P[0][1]+off(0),0);for(const[y,hw]of P)sh.lineTo(-hw+off(y),y);
  for(let i=P.length-1;i>=0;i--){const[y,hw]=P[i];sh.lineTo(hw+off(y),y);}
  const geo=new THREE.ExtrudeGeometry(sh,{depth:.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,steps:1});
  geo.translate(0,0,-.006);return {m:new THREE.Mesh(geo,mat),off};}

// --- swords & daggers
function buildBladeWeapon(g,w,L,isDagger){
  const BW=L.w*.5;// half-width (L.w is the full blade width)
  const metal=M(w.color,{metalness:.85,roughness:.28,flatShading:false});
  const gold=M(0xc9a35a,{metalness:.75,roughness:.32});
  const boneM=M(0xe8dcc0,{roughness:.6});
  const grip=M(L.grip,{roughness:.9});
  const glow=c=>new THREE.MeshBasicMaterial({color:c});
  const bladeMat=(L.blade==='bone'||(L.blade==='fang'&&w.color===0xe8dcc0))?boneM:metal;// bone blades
  const curve=L.blade==='fang'?BW*1.4:0,wave=L.blade==='kris'?BW*.35:0;
  const b=bladeMesh(L.blade,L.len,BW,bladeMat,curve,wave);b.m.position.y=.05;g.add(b.m);
  // fuller (dark groove) along the blade
  if(L.fuller){const f=mesh(new THREE.BoxGeometry(BW*.28,L.len*.62,.02),M(0x2a2c30,{metalness:.6,roughness:.4}),0,.05+L.len*.36,0);g.add(f);}
  // serrations on bone blades
  if(L.blade==='bone')for(let i=1;i<7;i++){const y=.05+L.len*i/8;const t=mesh(new THREE.ConeGeometry(.012,.04,4),boneM,BW*.95,y,0);t.rotation.z=-Math.PI/2+.4;g.add(t);}
  // glowing runes down the middle
  if(L.rune){const rm=glow(L.rune);const n=isDagger?3:5;for(let i=0;i<n;i++){const y=.05+L.len*(.15+i*.6/n),off=b.off(y-.05);
    const r=mesh(new THREE.BoxGeometry(BW*.35,.025,.03),rm,off,y,0);r.rotation.z=(i%2?.5:-.5);g.add(r);}}
  // inlaid edge glow (Wyrmslayer / Wyrmfang)
  if(L.edge){const em=M(L.edge,{emissive:L.edge,emissiveIntensity:.6,metalness:.8,roughness:.3});
    const e=mesh(new THREE.BoxGeometry(.008,L.len*.8,.024),em,0,.05+L.len*.42,0);g.add(e);}
  // guard
  const gw=isDagger?.16:.3;
  if(L.guard==='bar')g.add(mesh(new THREE.BoxGeometry(gw,.045,.06),M(0x6a6a70,{metalness:.7,roughness:.4}),0,.05,0));
  else if(L.guard==='quillon'){g.add(mesh(new THREE.BoxGeometry(gw*.5,.05,.06),gold,0,.05,0));
    for(const s of[-1,1]){const q=mesh(new THREE.CylinderGeometry(.014,.02,gw*.42,6),gold,s*gw*.36,.08,0);q.rotation.z=s*(Math.PI/2-.45);g.add(q);
      g.add(mesh(new THREE.SphereGeometry(.022,6,5),gold,s*gw*.52,.13,0));}}
  else if(L.guard==='claw'){g.add(mesh(new THREE.BoxGeometry(gw*.45,.06,.07),boneM,0,.05,0));
    for(const s of[-1,1])for(const k of[0,1]){const c=mesh(new THREE.ConeGeometry(.018,gw*.38,4),boneM,s*gw*(.28+k*.08),.06+k*.03,0);c.rotation.z=s*(-Math.PI/2+.6+k*.35);g.add(c);}}
  else if(L.guard==='ornate'){g.add(mesh(new THREE.BoxGeometry(gw,.05,.07),gold,0,.05,0));
    for(const s of[-1,1])g.add(mesh(new THREE.SphereGeometry(.03,8,6),gold,s*gw*.5,.05,0));
    g.add(mesh(new THREE.OctahedronGeometry(.03,0),glow(L.gem),0,.05,.04));}
  else if(L.guard==='wings'){g.add(mesh(new THREE.BoxGeometry(gw*.35,.06,.07),gold,0,.05,0));
    for(const s of[-1,1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(s*gw*.3,.12,s*gw*.62,.16);sh.lineTo(s*gw*.5,.07);sh.lineTo(s*gw*.42,.11);sh.lineTo(s*gw*.3,.03);sh.lineTo(0,-.02);
      const wg=new THREE.ExtrudeGeometry(sh,{depth:.02,bevelEnabled:false});wg.translate(0,0,-.01);const m=new THREE.Mesh(wg,gold);m.position.y=.04;g.add(m);}
    g.add(mesh(new THREE.OctahedronGeometry(.032,0),glow(L.gem),0,.05,.04));}
  // grip: wrapped leather rings
  const gl=isDagger?.15:.24;g.add(mesh(new THREE.CylinderGeometry(.028,.03,gl,8),grip,0,-gl/2+.02,0));
  for(let i=0;i<(isDagger?3:5);i++){const r=mesh(new THREE.TorusGeometry(.031,.006,4,10),grip,0,-i*gl/(isDagger?3.2:5.2),0);r.rotation.x=Math.PI/2;g.add(r);}
  // pommel
  const py=-gl;
  if(L.pommel==='ball')g.add(mesh(new THREE.SphereGeometry(.04,8,6),M(0x6a6a70,{metalness:.7,roughness:.4}),0,py,0));
  else if(L.pommel==='disc'){const d=mesh(new THREE.CylinderGeometry(.045,.045,.025,10),gold,0,py,0);d.rotation.x=Math.PI/2;g.add(d);}
  else if(L.pommel==='fang'){const f=mesh(new THREE.ConeGeometry(.03,.09,5),boneM,0,py-.02,0);f.rotation.x=Math.PI;g.add(f);}
  else if(L.pommel==='gem'){g.add(mesh(new THREE.SphereGeometry(.035,8,6),gold,0,py+.01,0));g.add(mesh(new THREE.OctahedronGeometry(.032,0),glow(L.gem),0,py-.03,0));}
}

// --- bows
function buildBow(g,w,L){
  const limbM=M(L.limb,{roughness:L.bow==='recurve'||L.bow==='wyrm'?.35:.65,metalness:L.bow==='recurve'?.7:L.bow==='wyrm'?.6:.05});
  const wrap=M(L.wrap,{roughness:.9});
  const h=L.h,SX=-.17;// string line
  // limb centreline: tips sit on the string line, belly bows forward to the grip at x=.08
  const half=s=>{const pts=[new THREE.Vector3(.08,0,0),new THREE.Vector3(.06,s*h*.3,0),new THREE.Vector3(-.02,s*h*.65,0),new THREE.Vector3(SX+.04,s*h*.92,0),new THREE.Vector3(SX,s*h,0)];
    if(L.bow==='recurve'||L.bow==='wyrm')pts.push(new THREE.Vector3(SX+.05,s*(h+.07),0),new THREE.Vector3(SX+.1,s*(h+.09),0));// tips curl forward
    return new THREE.CatmullRomCurve3(pts);};
  for(const s of[-1,1]){const c=half(s);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c,20,L.bow==='bone'?.032:.026,6,false),limbM));
    // bone bow: knuckle segments; runed bow: glowing runes; wyrm bow: wing spikes
    for(let i=1;i<=4;i++){const p=c.getPoint(i/5);
      if(L.bow==='bone')g.add(mesh(new THREE.SphereGeometry(.04,6,5),limbM,p.x,p.y,0));
      if(L.rune){const r=mesh(new THREE.BoxGeometry(.03,.03,.06),new THREE.MeshBasicMaterial({color:L.rune}),p.x+.02,p.y,0);r.rotation.z=i*.7;g.add(r);}
      if(L.bow==='wyrm'&&i%2){const sp=mesh(new THREE.ConeGeometry(.018,.14,4),limbM,p.x+.07,p.y,0);sp.rotation.z=-Math.PI/2+s*.5;g.add(sp);}}
    // nock caps
    g.add(mesh(new THREE.SphereGeometry(.022,6,5),wrap,SX,s*h,0));}
  // grip wrap and arrow rest
  const gr=mesh(new THREE.CylinderGeometry(.04,.04,.2,8),wrap,.08,0,0);g.add(gr);
  for(let i=0;i<4;i++){const t=mesh(new THREE.TorusGeometry(.041,.006,4,10),wrap,.08,-.075+i*.05,0);t.rotation.x=Math.PI/2;g.add(t);}
  if(L.bow==='wyrm'||L.bow==='runed'){g.add(mesh(new THREE.OctahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:L.rune}),.13,0,0));}
  // string (spans tip to tip; moved along x when drawn)
  const strM=L.string?new THREE.MeshBasicMaterial({color:L.string}):M(0xe8e0d0);
  const str=mesh(new THREE.BoxGeometry(.006,.006,2*h),strM,0,0,0);str.rotation.x=Math.PI/2;str.position.x=SX;g.userData.string=str;g.add(str);
  // nocked arrow: shaft, head, fletching (points +x, nock at the string)
  const arrow=new THREE.Group();
  arrow.add(mesh(new THREE.CylinderGeometry(.01,.01,.75,5),M(0x8a6a48),0,0,0));
  arrow.add(mesh(new THREE.ConeGeometry(.026,.09,4),M(L.rune||0xb8b8c0,{metalness:.7,roughness:.3}),0,.42,0));
  const fl=M(L.rune?0x2a3040:0xb03a2a,{side:THREE.DoubleSide});
  for(let k=0;k<3;k++){const f=mesh(new THREE.PlaneGeometry(.035,.12),fl,0,-.3,0);f.rotation.y=k*Math.PI*2/3;f.translateX(.02);arrow.add(f);}
  arrow.rotation.z=-Math.PI/2;arrow.position.set(.2,0,0);g.add(arrow);g.userData.arrow=arrow;
  g.rotation.set(0,Math.PI/2,.12);g.scale.setScalar(.55);g.position.set(.34,-.3,-.95);
}

// --- build the held weapon for S.weapon
function buildWeaponModel(){weaponRig.clear();const w=WEAPONS[S.weapon],t=w.type||'sword';const g=new THREE.Group();
  const L=WEAPON_LOOKS[S.weapon]||(t==='bow'?WEAPON_LOOKS.bHunt:t==='dagger'?WEAPON_LOOKS.dIron:WEAPON_LOOKS.iron);
  if(t==='bow')buildBow(g,w,L);
  else{buildBladeWeapon(g,w,L,t==='dagger');g.position.set(.42,-.42,-.7);g.rotation.set(-.3,0,-.25);}
  weaponRig.add(g);weaponRig.userData.blade=g;}
buildWeaponModel();
