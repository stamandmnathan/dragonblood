// ========================================================================
// DragonBlood · Kingdom stages
// What the settlement looks like at each stage of growth: walls, gate,
// houses, props and the keep for Village, Town, Stronghold, City, Kingdom.
// buildHub() calls buildSettlement(); the plaza buildings stay in hub.js.
// ========================================================================
'use strict';
// Stage at a glance (tier = kingdom().tier):
//   0 Village    - log palisade, watchtowers, round thatched huts, hay and woodpiles, chief's longhouse
//   1 Town       - taller palisade and gatehouse, timber-framed houses, market carts, lamps, a windmill
//   2 Stronghold - stone walls with battlements and towers, stone cottages, barracks, braziers, stone keep
//   3 City       - higher walls, two-storey townhouses, paved roads, street lamps, a cathedral, great hall
//   4 Kingdom    - gilded roofs, dragon statues at the gate, a grand castle with a crown, dragons overhead
// Walls are scenery only: the hub keeps the player inside with its radius (33).
// Everything static is merged by material (batchStatic) so a big kingdom stays a few draw calls.

// --- static batching
// Merge every mesh in `src` into one mesh per material. Geometry is baked into world space.
function batchStatic(src){src.updateMatrixWorld(true);const by=new Map();
  src.traverse(o=>{if(o.isMesh){if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(o);}});
  const out=new THREE.Group();
  for(const[mat,list]of by){const P=[],N=[];let n=0;
    for(const m of list){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
      if(!g.attributes.normal)g.computeVertexNormals();P.push(g.attributes.position.array);N.push(g.attributes.normal.array);n+=g.attributes.position.count;g.dispose();m.geometry.dispose();}
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;for(let i=0;i<P.length;i++){pos.set(P[i],o);nor.set(N[i],o);o+=P[i].length;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    out.add(new THREE.Mesh(geo,mat));}
  return out;}

// --- palette (shared materials so batching can merge them)
function kPalette(F,tier){const glow=c=>new THREE.MeshBasicMaterial({color:c});
  return{log:M(0x7a5634),wood:M(0x6e4d2f),dark:M(0x3d2a1a),thatch:M(0xb8964a),wattle:M(0x9a7a52),hay:M(0xd4b860),
    plaster:[M(0xd8cbb0),M(0xc9b48e),M(0xb8c4c8),M(0xd8b8a0)],beam:M(0x3d2a1a),tile:M(0x8a3d2b),slate:M(0x47506a),
    stone:M(tier>=3?0x9a938a:0x8b847a),stoneD:M(0x6a645c),cobble:M(0x5d554e),iron:M(0x3a3a40,{metalness:.6,roughness:.4}),
    faction:M(F.hex),gold:M(0xd8b04a,{metalness:.65,roughness:.35}),water:M(0x4a7aa0,{roughness:.15,metalness:.3}),
    window:glow(0xffc477),fire:glow(0xffa040),lamp:glow(0xffe0a0)};}

// --- shape helpers
// Triangular prism roof (a gable) running along x, or along z when alongZ.
// len = ridge length, w = width across, h = height; the eaves sit h/3 below y, the ridge 2h/3 above.
function gable(mat,len,w,h,x,y,z,alongZ){const m=mesh(new THREE.CylinderGeometry(1,1,len,3),mat,0,0,0);
  m.rotation.set(-Math.PI/2,0,Math.PI/2);m.scale.set(w/1.732,1,h/1.5);// apex up, axis along x
  const g=new THREE.Group();g.position.set(x,y,z);if(alongZ)g.rotation.y=Math.PI/2;g.add(m);return g;}
// Ring of merlons (battlements) around a cylinder top.
function merlonRing(g,mat,r,y,n,x,z){for(let i=0;i<n;i+=1){if(i%2)continue;const a=i/n*Math.PI*2;
  const b=mesh(new THREE.BoxGeometry(r*2*Math.PI/n*.9,.7,.5),mat,(x||0)+Math.sin(a)*r,y,(z||0)+Math.cos(a)*r);b.rotation.y=a;g.add(b);}}
// A round tower with a battlement ring or a cone roof.
function tower(g,K,x,z,r,h,roof){g.add(mesh(new THREE.CylinderGeometry(r,r*1.1,h,10),K.stone,x,h/2,z));
  if(roof)g.add(mesh(new THREE.ConeGeometry(r*1.25,r*1.6,10),roof,x,h+r*.8,z));
  else merlonRing(g,K.stone,r,h+.35,16,x,z);}
// A pennant on a pole (cloth stays a separate mesh so it can wave).
function flag(sc,K,x,y,z,flags){sc.add(mesh(new THREE.CylinderGeometry(.05,.05,2.2,5),K.dark,x,y+1.1,z));
  const c=mesh(new THREE.PlaneGeometry(1.2,.6),new THREE.MeshStandardMaterial({color:K.faction.color,side:THREE.DoubleSide,roughness:.9}),x+.6,y+1.85,z);sc.add(c);flags.push(c);}

// --- walls and gate
// Wall ring: radius 36, 36 segments, a gap at the south (z>0) for the gate.
const K_WALL_R=36,K_WALL_SEG=36;
function wallSegs(cb){for(let i=0;i<K_WALL_SEG;i++){const a=i/K_WALL_SEG*Math.PI*2;if(Math.abs(Math.sin(a))<.12&&Math.cos(a)>0)continue;
  cb(a,Math.sin(a)*K_WALL_R,Math.cos(a)*K_WALL_R,i);}}
function buildWalls(B,sc,K,tier,flags){const segLen=2*Math.PI*K_WALL_R/K_WALL_SEG;
  if(tier<=1){// log palisade with sharpened tops
    const h=tier?4:2.8;
    wallSegs((a,x,z)=>{const tx=Math.cos(a),tz=-Math.sin(a);
      for(let j=0;j<7;j++){const o=(j-3)*segLen/7,hh=h+((j*37)%3)*.25;
        B.add(mesh(new THREE.CylinderGeometry(.3,.32,hh,6),K.log,x+tx*o,hh/2,z+tz*o));B.add(mesh(new THREE.ConeGeometry(.3,.6,6),K.log,x+tx*o,hh+.3,z+tz*o));}
      if(tier){const walk=mesh(new THREE.BoxGeometry(segLen,.15,1),K.wood,x*.975,h-.9,z*.975);walk.rotation.y=a;B.add(walk);}});// wall walk
    // gate: two watchtowers on stilts (village) or a timber gatehouse (town)
    for(const sx of[-4,4]){const z=K_WALL_R,th=tier?7:6;// tower legs, platform, rail, roof, roof posts
      for(const[px,pz]of[[-.9,-.9],[.9,-.9],[-.9,.9],[.9,.9]])B.add(mesh(new THREE.CylinderGeometry(.15,.15,th,5),K.log,sx+px,th/2,z+pz));
      B.add(mesh(new THREE.BoxGeometry(2.6,.25,2.6),K.wood,sx,th,z));B.add(mesh(new THREE.BoxGeometry(2.6,1,.15),K.wood,sx,th+.6,z-1.25));
      const roof=mesh(new THREE.ConeGeometry(2.1,1.6,4),K.thatch,sx,th+2.3,z);roof.rotation.y=Math.PI/4;B.add(roof);
      for(const[px,pz]of[[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]])B.add(mesh(new THREE.CylinderGeometry(.08,.08,1.6,4),K.log,sx+px,th+1.3,z+pz));}
    if(tier){B.add(mesh(new THREE.BoxGeometry(9,1,1.6),K.wood,0,6,K_WALL_R));flag(sc,K,0,6.5,K_WALL_R,flags);}
    return;}
  // stone walls with battlements, towers every few segments
  const h=2.2+tier*1.6,every=tier>=3?4:6,roof=tier>=4?K.gold:K.faction;
  wallSegs((a,x,z,i)=>{const w=mesh(new THREE.BoxGeometry(segLen+.2,h,1.6),K.stone,x,h/2,z);w.rotation.y=a;B.add(w);
    const tx=Math.cos(a),tz=-Math.sin(a);
    for(let j=0;j<4;j++){const o=(j-1.5)*segLen/4;const mr=mesh(new THREE.BoxGeometry(segLen/8,.8,.5),K.stone,x+tx*o+Math.sin(a)*.55,h+.4,z+tz*o+Math.cos(a)*.55);mr.rotation.y=a;B.add(mr);}
    if(i%every===every/2){tower(B,K,x,z,2,h+3.2,roof);if(tier>=3)flag(sc,K,x,h+3.2+2.6,z,flags);}});
  // stone gatehouse: two towers, an arch and a portcullis
  for(const sx of[-4.2,4.2])tower(B,K,sx,K_WALL_R,2.1,h+4,tier>=4?K.gold:null);
  B.add(mesh(new THREE.BoxGeometry(6.4,2,2),K.stone,0,h+1,K_WALL_R));
  for(let i=0;i<4;i++)B.add(mesh(new THREE.BoxGeometry(.9,.7,.5),K.stone,-2.7+i*1.8,h+2.35,K_WALL_R+.75));
  for(let i=0;i<6;i++)B.add(mesh(new THREE.BoxGeometry(.1,h-.4,.1),K.iron,-2.2+i*.88,h/2+1.4,K_WALL_R));// raised portcullis
  for(let i=0;i<3;i++)B.add(mesh(new THREE.BoxGeometry(4.6,.1,.1),K.iron,0,h-.4+i*-.9+1.4,K_WALL_R));
  if(tier>=3)for(const sx of[-1.5,1.5])sc.add(mesh(new THREE.PlaneGeometry(1,2.6),new THREE.MeshStandardMaterial({color:K.faction.color,side:THREE.DoubleSide}),sx,h-.6,K_WALL_R-1.05));}

// --- houses (one style per stage); local -z faces the plaza
function buildHouse(K,tier,w,d,h,rand){const g=new THREE.Group();
  const door=()=>g.add(mesh(new THREE.BoxGeometry(.9,1.6,.1),K.dark,0,.8,-d/2-.02));
  const win=(x,y,side)=>{const m=mesh(new THREE.PlaneGeometry(.55,.6),K.window,x,y,side*(d/2+.03));if(side<0)m.rotation.y=Math.PI;g.add(m);};
  if(tier===0){// round hut with a thatched cone
    const r=Math.min(w,d)*.48,hh=h*.75;g.add(mesh(new THREE.CylinderGeometry(r,r*1.05,hh,10),K.wattle,0,hh/2,0));
    g.add(mesh(new THREE.ConeGeometry(r*1.35,2.6,10),K.thatch,0,hh+1.2,0));
    g.add(mesh(new THREE.BoxGeometry(.9,1.5,.2),K.dark,0,.75,-r+.02));
    g.add(mesh(new THREE.CylinderGeometry(.08,.04,.6,4),K.log,0,hh+2.6,0));return g;}
  if(tier===1){// timber-framed house: plaster, dark beams, tiled gable, chimney
    const pl=K.plaster[Math.floor(rand()*2)];g.add(mesh(new THREE.BoxGeometry(w,h,d),pl,0,h/2,0));
    for(const sx of[-1,1])for(const sz of[-1,1])g.add(mesh(new THREE.BoxGeometry(.2,h,.2),K.beam,sx*w/2,h/2,sz*d/2));
    for(const sz of[-1,1]){g.add(mesh(new THREE.BoxGeometry(w,.18,.12),K.beam,0,h*.55,sz*(d/2+.02)));
      const x1=mesh(new THREE.BoxGeometry(.14,Math.hypot(w/2,h*.45),.1),K.beam,-w/4,h*.78,sz*(d/2+.03));x1.rotation.z=Math.atan2(w/2,h*.45);g.add(x1);
      const x2=x1.clone();x2.position.x=w/4;x2.rotation.z*=-1;g.add(x2);}
    g.add(gable(K.tile,w+.6,d+.6,1.9,0,h+.62,0));
    g.add(mesh(new THREE.BoxGeometry(.5,1.8,.5),K.stoneD,w*.3,h+1.1,d*.15));
    door();win(w*.28,h*.3,-1);return g;}
  if(tier===2){// stone cottage with a slate gable
    g.add(mesh(new THREE.BoxGeometry(w,h,d),K.stone,0,h/2,0));
    g.add(gable(K.slate,w+.5,d+.5,1.7,0,h+.55,0));
    g.add(mesh(new THREE.BoxGeometry(.6,2,.6),K.stoneD,-w*.3,h+1,0));
    door();win(w*.3,h*.55,-1);win(-w*.3,h*.55,1);return g;}
  // tier 3-4: two-storey townhouse with an overhanging upper floor
  const pl=K.plaster[Math.floor(rand()*4)],h1=h*.55,h2=h*.55;
  g.add(mesh(new THREE.BoxGeometry(w,h1,d),K.stone,0,h1/2,0));
  g.add(mesh(new THREE.BoxGeometry(w+.4,h2,d+.4),pl,0,h1+h2/2,0));
  for(const sx of[-1,1])g.add(mesh(new THREE.BoxGeometry(.18,h2,.18),K.beam,sx*(w/2+.2),h1+h2/2,-(d/2+.2)));
  g.add(gable(tier>=4&&rand()<.5?K.gold:(rand()<.5?K.tile:K.slate),w+.9,d+.9,2.2,0,h1+h2+.72,0));
  g.add(mesh(new THREE.BoxGeometry(.5,2.2,.5),K.stoneD,w*.3,h1+h2+1.2,d*.2));
  door();for(const x of[-w*.28,w*.28]){const m=mesh(new THREE.PlaneGeometry(.55,.6),K.window,x,h1+h2*.5,-(d/2+.23));m.rotation.y=Math.PI;g.add(m);}
  win(w*.3,h1*.55,-1);return g;}

// --- props
function propHay(B,K,x,z){B.add(mesh(new THREE.CylinderGeometry(.9,1,1.2,8),K.hay,x,.6,z));B.add(mesh(new THREE.ConeGeometry(1,.9,8),K.hay,x,1.65,z));}
function propWood(B,K,x,z,a){for(let r=0;r<3;r++)for(let i=0;i<3-r;i++){const l=mesh(new THREE.CylinderGeometry(.18,.18,1.6,6),K.log,0,0,0);
  l.rotation.z=Math.PI/2;l.position.set(x+Math.cos(a)*(i-1+r*.5)*.38,.2+r*.33,z-Math.sin(a)*(i-1+r*.5)*.38);l.rotation.y=a+Math.PI/2;B.add(l);}}
function propCart(B,K,x,z,a){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=a;
  g.add(mesh(new THREE.BoxGeometry(1.4,.5,2.2),K.wood,0,.8,0));for(const sx of[-.75,.75]){const wh=mesh(new THREE.CylinderGeometry(.45,.45,.1,10),K.dark,sx,.45,0);wh.rotation.z=Math.PI/2;g.add(wh);}
  g.add(mesh(new THREE.BoxGeometry(.06,.06,1.4),K.wood,.4,.6,1.6));g.add(mesh(new THREE.BoxGeometry(.06,.06,1.4),K.wood,-.4,.6,1.6));
  for(let i=0;i<3;i++)g.add(mesh(new THREE.BoxGeometry(.45,.45,.45),K.wood,-.3+i*.3,1.28,-.5+i*.45));B.add(g);}
function propBarrels(B,K,x,z){for(const[dx,dz]of[[0,0],[.75,.2],[.3,.75]])B.add(mesh(new THREE.CylinderGeometry(.35,.32,.85,8),K.wood,x+dx,.43,z+dz));}
function propLamp(B,K,x,z){B.add(mesh(new THREE.CylinderGeometry(.06,.08,3,5),K.iron,x,1.5,z));B.add(mesh(new THREE.BoxGeometry(.32,.4,.32),K.lamp,x,3.1,z));B.add(mesh(new THREE.ConeGeometry(.3,.3,4),K.iron,x,3.45,z));}
function propBrazier(B,K,x,z){B.add(mesh(new THREE.CylinderGeometry(.08,.12,1.2,5),K.iron,x,.6,z));B.add(mesh(new THREE.CylinderGeometry(.45,.25,.4,8),K.iron,x,1.3,z));
  B.add(mesh(new THREE.ConeGeometry(.35,.7,6),K.fire,x,1.75,z));}
function propDummy(B,K,x,z){B.add(mesh(new THREE.CylinderGeometry(.07,.07,1.8,5),K.wood,x,.9,z));B.add(mesh(new THREE.BoxGeometry(1.1,.12,.12),K.wood,x,1.4,z));
  B.add(mesh(new THREE.CylinderGeometry(.28,.24,.8,7),K.hay,x,1.3,z));B.add(mesh(new THREE.SphereGeometry(.22,7,5),K.hay,x,1.95,z));}
function propRack(B,K,x,z,a){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=a;g.add(mesh(new THREE.BoxGeometry(1.8,.1,.1),K.wood,0,1.3,0));
  for(const sx of[-.85,.85])g.add(mesh(new THREE.BoxGeometry(.1,1.4,.1),K.wood,sx,.7,0));
  for(let i=0;i<4;i++){const s=mesh(new THREE.BoxGeometry(.05,1.3,.02),K.iron,-.6+i*.4,.75,.08);s.rotation.z=.12;g.add(s);}B.add(g);}
function propWell(B,K,x,z){B.add(mesh(new THREE.CylinderGeometry(.9,.95,.8,10),K.stoneD,x,.4,z));const wt=mesh(new THREE.CircleGeometry(.75,10),K.water,x,.75,z);wt.rotation.x=-Math.PI/2;B.add(wt);
  for(const sx of[-.8,.8])B.add(mesh(new THREE.BoxGeometry(.1,1.6,.1),K.wood,x+sx,1.2,z));
  const r=gable(K.thatch,1.9,1.5,.7,x,2.2,z);B.add(r);}

// --- the keep (back of the plaza at z=-27)
function buildKeep(B,sc,K,tier,colliders,anim,flags){
  if(tier===0){// chief's longhouse with dragon-head gables and totems
    B.add(mesh(new THREE.BoxGeometry(10,3.4,5.5),K.wattle,0,1.7,-27));
    B.add(gable(K.thatch,11,6.6,3,0,4.4,-27));
    for(const sx of[-1,1]){const hd=mesh(new THREE.ConeGeometry(.35,1.6,5),K.log,sx*5.6,5.2,-27);hd.rotation.z=sx*-1.1;B.add(hd);}
    B.add(mesh(new THREE.BoxGeometry(1.4,2.2,.2),K.dark,0,1.1,-24.2));
    for(const sx of[-7,7]){B.add(mesh(new THREE.CylinderGeometry(.35,.4,4.5,6),K.log,sx,2.25,-24));
      for(let i=0;i<3;i++)B.add(mesh(new THREE.BoxGeometry(.9,.5,.9),[K.faction,K.wood,K.thatch][i],sx,1.2+i*1.3,-24));
      B.add(mesh(new THREE.BoxGeometry(2.2,.25,.4),K.faction,sx,4.4,-24));}
    colliders.push({x:-3,z:-27,r:3.2},{x:3,z:-27,r:3.2},{x:-7,z:-24,r:.6},{x:7,z:-24,r:.6});return;}
  const kh=7+tier*3.2,roof=tier>=4?K.gold:K.faction;
  if(tier===1){// fortified hall: stone base, timber top, side watchtowers
    B.add(mesh(new THREE.CylinderGeometry(3.4,3.7,kh*.45,10),K.stone,0,kh*.225,-27));
    B.add(mesh(new THREE.CylinderGeometry(3.2,3.4,kh*.55,10),K.wood,0,kh*.45+kh*.275,-27));
    B.add(mesh(new THREE.ConeGeometry(3.9,3.5,10),roof,0,kh+1.75,-27));
    for(const sx of[-6.5,6.5]){const h2=kh*.7;B.add(mesh(new THREE.CylinderGeometry(1.9,2.1,h2,8),K.wood,sx,h2/2,-25));B.add(mesh(new THREE.ConeGeometry(2.4,2.6,8),roof,sx,h2+1.3,-25));colliders.push({x:sx,z:-25,r:2.4});}
    colliders.push({x:0,z:-27,r:4.2});flag(sc,K,0,kh+3.4,-27,flags);return;}
  // stone keep with battlements; city adds a great hall, kingdom a full castle
  B.add(mesh(new THREE.CylinderGeometry(3.4,3.8,kh,12),K.stone,0,kh/2,-27));merlonRing(B,K.stone,3.4,kh+.35,20,0,-27);
  B.add(mesh(new THREE.CylinderGeometry(2.6,2.8,3,12),K.stone,0,kh+1.5,-27));B.add(mesh(new THREE.ConeGeometry(3.2,3.6,12),roof,0,kh+4.8,-27));
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const w=mesh(new THREE.PlaneGeometry(.5,.9),K.window,Math.sin(a)*3.45,kh*.7,-27+Math.cos(a)*3.45);w.rotation.y=a;B.add(w);}
  flag(sc,K,0,kh+6.5,-27,flags);
  const sides=tier>=4?[[-6.5,-25],[6.5,-25],[-9,-31],[9,-31]]:[[-6.5,-25],[6.5,-25]];
  for(const[sx,sz]of sides){const h2=kh*.7;tower(B,K,sx,sz,2.1,h2,roof);colliders.push({x:sx,z:sz,r:2.6});if(tier>=4)flag(sc,K,sx,h2+3.4,sz,flags);}
  if(tier>=3){B.add(mesh(new THREE.BoxGeometry(10,kh*.45,6),K.stone,0,kh*.225,-22));B.add(gable(tier>=4?K.gold:K.slate,10.6,6.6,2.6,0,kh*.45+.85,-22));
    for(let i=0;i<4;i++){const w=mesh(new THREE.PlaneGeometry(.6,1.4),K.window,-3.6+i*2.4,kh*.25,-18.97);B.add(w);}
    colliders.push({x:-3,z:-21,r:3.4},{x:3,z:-21,r:3.4});}
  if(tier>=4){const walls=[[0,-34,20,0],[-10,-28,12,Math.PI/2],[10,-28,12,Math.PI/2]];
    for(const[x,z,l,a]of walls){const w=mesh(new THREE.BoxGeometry(l,5,1.2),K.stone,x,2.5,z);w.rotation.y=a;B.add(w);}
    const crown=mesh(new THREE.TorusGeometry(1.2,.18,6,16),M(0xffd27a,{emissive:0xffb840,emissiveIntensity:1.2}),0,kh+8.6,-27);crown.rotation.x=Math.PI/2;sc.add(crown);anim.crown=crown;}
  else colliders.push({x:0,z:-27,r:4.2});
  if(tier>=4)colliders.push({x:0,z:-27,r:4.2});}

// --- stage-specific landmarks and props
function buildLandmarks(B,sc,K,tier,colliders,anim,rand){
  const free=(x,z,r)=>Math.hypot(x,z)>19&&Math.hypot(x,z)<33&&!colliders.some(c=>Math.hypot(c.x-x,c.z-z)<c.r+r)&&!(Math.abs(x)<3.5&&z>14);
  const spot=(r,tries)=>{for(let i=0;i<(tries||60);i++){const a=rand()*Math.PI*2,d=20+rand()*12,x=Math.sin(a)*d,z=Math.cos(a)*d;if(free(x,z,r))return{x,z,a};}return null;};
  const place=(r,fn,n)=>{for(let i=0;i<n;i++){const s=spot(r);if(!s)return;fn(s);colliders.push({x:s.x,z:s.z,r});}};
  if(tier===0){place(1.2,s=>propHay(B,K,s.x,s.z),5);place(1,s=>propWood(B,K,s.x,s.z,s.a),4);place(1.1,s=>propWell(B,K,s.x,s.z),1);
    place(1.2,s=>{B.add(mesh(new THREE.CylinderGeometry(.9,1,.3,8),K.stoneD,s.x,.15,s.z));B.add(mesh(new THREE.ConeGeometry(.5,1.1,6),K.fire,s.x,.8,s.z));},1);}// campfire
  if(tier===1){place(1.4,s=>propCart(B,K,s.x,s.z,s.a),4);place(1,s=>propBarrels(B,K,s.x,s.z),5);place(.4,s=>propLamp(B,K,s.x,s.z),6);place(1.1,s=>propWell(B,K,s.x,s.z),1);place(1.2,s=>propHay(B,K,s.x,s.z),2);}
  if(tier===2){place(.8,s=>propBrazier(B,K,s.x,s.z),6);place(.6,s=>propDummy(B,K,s.x,s.z),4);place(1,s=>propRack(B,K,s.x,s.z,s.a),3);place(1,s=>propBarrels(B,K,s.x,s.z),3);}
  if(tier>=3){place(.4,s=>propLamp(B,K,s.x,s.z),10);place(1,s=>propBarrels(B,K,s.x,s.z),3);place(1.4,s=>propCart(B,K,s.x,s.z,s.a),2);place(.8,s=>propBrazier(B,K,s.x,s.z),tier>=4?4:2);}
  // town: a windmill outside the walls (sails turn)
  if(tier===1){const x=-46,z=-18;B.add(mesh(new THREE.CylinderGeometry(1.6,2.4,9,8),K.plaster[0],x,4.5,z));B.add(mesh(new THREE.ConeGeometry(2.1,2.6,8),K.tile,x,10.3,z));
    const sails=new THREE.Group();sails.position.set(x+2,8.5,z);sails.rotation.y=Math.PI/2;
    for(let i=0;i<4;i++){const s=mesh(new THREE.BoxGeometry(.5,5.5,.08),new THREE.MeshStandardMaterial({color:0xd8cbb0,roughness:.9}),0,2.9,0);const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2;arm.add(s);sails.add(arm);}
    sc.add(sails);anim.mill=sails;}
  // stronghold: barracks inside the walls
  if(tier===2){const x=-22,z=-16,a=Math.atan2(x,z);const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=a+Math.PI/2;
    g.add(mesh(new THREE.BoxGeometry(9,3,4),K.stone,0,1.5,0));g.add(gable(K.slate,9.6,4.6,1.8,0,3.6,0));
    for(let i=0;i<4;i++){const w=mesh(new THREE.PlaneGeometry(.5,.6),K.window,-3+i*2,1.9,-2.03);w.rotation.y=Math.PI;g.add(w);}
    B.add(g);colliders.push({x,z,r:4.6});}
  // city & kingdom: paved roads to the gate and a cathedral
  if(tier>=3){const road=mesh(new THREE.PlaneGeometry(5,20),K.cobble,0,.03,26);road.rotation.x=-Math.PI/2;B.add(road);
    for(const a of[Math.PI/2,-Math.PI/2,Math.PI*.75,-Math.PI*.75]){const r=mesh(new THREE.PlaneGeometry(3.4,15),K.cobble,Math.sin(a)*25,.03,Math.cos(a)*25);r.rotation.x=-Math.PI/2;r.rotation.z=a;B.add(r);}
    const x=24,z=-16,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.atan2(x,z);
    g.add(mesh(new THREE.BoxGeometry(5,6,9),K.stone,0,3,0));g.add(gable(K.slate,9.6,5.6,3,0,7.2,0,true));
    g.add(mesh(new THREE.BoxGeometry(2.6,11,2.6),K.stone,0,5.5,-5));g.add(mesh(new THREE.ConeGeometry(1.9,6,4),tier>=4?K.gold:K.slate,0,14,-5));
    const ros=mesh(new THREE.CircleGeometry(.9,12),new THREE.MeshBasicMaterial({color:0x9fd4ff}),0,4.4,-6.32);ros.rotation.y=Math.PI;g.add(ros);
    for(const sx of[-1,1])for(let i=0;i<3;i++){const w=mesh(new THREE.PlaneGeometry(.6,1.8),K.window,sx*2.53,3.4,-2.5+i*2.5);w.rotation.y=sx*Math.PI/2;g.add(w);}
    B.add(g);colliders.push({x,z,r:5.4});}
  // kingdom: stone dragon statues guarding the gate road, dragons circling overhead
  if(tier>=4){const stoneMat=K.stone;
    for(const sx of[-5.5,5.5]){B.add(mesh(new THREE.BoxGeometry(3,1.4,4.4),K.stoneD,sx,.7,29));
      const st=makeDragon(0x8b847a,.75);st.position.set(sx,2.4,29);st.rotation.y=Math.PI+(sx<0?-.4:.4);
      st.userData.wingL.rotation.z=.6;st.userData.wingR.rotation.z=-.6;st.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.isMeshBasicMaterial))o.material=stoneMat;});
      B.add(st);colliders.push({x:sx,z:29,r:2.2});}
    anim.flyers=[0,1].map(i=>{const d=makeDragon(i?0xc9a35a:K.faction.color.getHex(),1.1);sc.add(d);return{d,r:42+i*14,h:24+i*6,sp:.18+i*.07,ph:i*Math.PI};});}}

// --- assemble the settlement for the current tier
function buildSettlement(sc,tier,F,colliders,anim){
  const K=kPalette(F,tier),B=new THREE.Group(),flags=[],rand=rng(11);
  buildWalls(B,sc,K,tier,flags);
  buildKeep(B,sc,K,tier,colliders,anim,flags);
  buildLandmarks(B,sc,K,tier,colliders,anim,rng(23));
  // houses: same placement rules as before (ring between the plaza and the walls, lanes kept clear)
  const nH=6+tier*5;let placed=0,guard=0;
  while(placed<nH&&guard++<400){const a=rand()*Math.PI*2,rr2=21+rand()*11;if(Math.abs(Math.sin(a))<.3)continue;
    const x=Math.sin(a)*rr2,z=Math.cos(a)*rr2;if(colliders.some(c=>Math.hypot(c.x-x,c.z-z)<Math.max(5.6,c.r+2.4)))continue;
    const w=3+rand()*2.5,d=3+rand()*2,h=2.4+rand()*1.6+(tier>=3?1.6:0);
    const g=buildHouse(K,tier,w,d,h,rand);g.position.set(x,0,z);g.rotation.y=a;B.add(g);
    colliders.push({x,z,r:Math.max(w,d)*.62});placed++;}
  sc.add(batchStatic(B));
  if(flags.length)anim.flags=flags;}

// Per-frame animation for the settlement (windmill, flags, circling dragons).
function animateSettlement(anim,dt,t){
  if(anim.mill)anim.mill.rotation.z+=dt*.6;
  if(anim.flags)anim.flags.forEach((f,i)=>{f.rotation.y=Math.sin(t*2+i)*.35;});
  if(anim.flyers)for(const f of anim.flyers){const a=t*f.sp+f.ph,x=Math.cos(a)*f.r,z=Math.sin(a)*f.r-10;
    f.d.position.set(x,f.h+Math.sin(t*.7+f.ph)*2,z);f.d.lookAt(Math.cos(a+.05)*f.r,f.d.position.y,Math.sin(a+.05)*f.r-10);flap(f.d,t+f.ph,5,.6);}}
