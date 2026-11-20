// ========================================================================
// DragonBlood · Legendary spell effects
// What a Legendary scroll leaves behind for a few seconds after it lands:
// Fireball -> firestorm (fire tornado, burning ring, meteors)
// Electric Bolt -> electric field (crackling dome, arcs, sky strikes)
// Poison Missile -> toxic whirlpool (spinning pool, vortex, bubbles, cloud)
// Plus the magic circle on cast, camera shake and a flash of the sky.
// ========================================================================
'use strict';
// These are visual only: the blast damage is still dealt once by scrollImpact().
// A zone is {t, dur, meshes[], tick(dt, z)}; fxZonesUpdate() runs it each frame
// (called from fxUpdate in fx.js) and removes it, with its meshes, when done.

const SPELL_ZONE_DUR=3.5;

// --- shake and sky tint
function fxShake(a){FX.shake=Math.max(FX.shake,a);}
function fxTint(color,dur,amount){const sc=cur&&cur.scene;if(!sc||!sc.background)return;
  const base=FX.tint?FX.tint.base:sc.background.clone(),fogBase=FX.tint?FX.tint.fogBase:(sc.fog?sc.fog.color.clone():null);
  FX.tint={c:new THREE.Color(color),t:0,dur,amount:amount||.45,base,fogBase,sc};}

// --- zones
function fxZone(z){if(!fxCloud())return null;z.t=0;z.meshes=z.meshes||[];FX.zones.push(z);return z;}
function zoneAdd(z,m){cur.scene.add(m);z.meshes.push(m);return m;}
const zoneFade=z=>Math.min(1,z.t/.25,(z.dur-z.t)/.6);// fade in fast, out over the last .6s
function fxZonesUpdate(dt){
  for(let i=FX.zones.length-1;i>=0;i--){const z=FX.zones[i];z.t+=dt;
    if(z.t>=z.dur){for(const m of z.meshes){if(m.parent)m.parent.remove(m);m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});}FX.zones.splice(i,1);continue;}
    z.tick(dt,z);}
  // sky tint: flash toward the spell colour, then ease back
  const T=FX.tint;if(T){T.t+=dt;const k=T.t>=T.dur?0:Math.sin(Math.min(1,T.t/T.dur)*Math.PI)*T.amount;
    if(T.sc.background)T.sc.background.copy(T.base).lerp(T.c,k);if(T.sc.fog&&T.fogBase)T.sc.fog.color.copy(T.fogBase).lerp(T.c,k);if(T.t>=T.dur)FX.tint=null;}
  // camera shake (the camera is placed fresh every frame, so this offset never builds up)
  if(FX.shake>0){const a=FX.shake;camera.position.x+=(Math.random()-.5)*a;camera.position.y+=(Math.random()-.5)*a;camera.position.z+=(Math.random()-.5)*a;FX.shake=Math.max(0,a-dt*1.5);}}

// --- lightning ribbons (camera-facing strips, regenerated every few frames)
function boltMesh(maxQuads,color,opacity){const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(maxQuads*18),3));geo.setDrawRange(0,0);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.frustumCulled=false;m.userData.op=opacity;return m;}
function boltPath(a,b,segs,jag){const pts=[];for(let i=0;i<=segs;i++){const p=a.clone().lerp(b,i/segs);
  if(i>0&&i<segs){p.x+=(Math.random()-.5)*jag;p.y+=(Math.random()-.5)*jag;p.z+=(Math.random()-.5)*jag;}pts.push(p);}return pts;}
const _bd=new THREE.Vector3(),_bs=new THREE.Vector3(),_bc=new THREE.Vector3(),_bcam=new THREE.Vector3();
// Each path may carry its own width multiplier as path.w.
function setBolts(m,paths,w){const arr=m.geometry.attributes.position.array;let n=0;camera.getWorldPosition(_bcam);
  for(const pts of paths)for(let i=0;i<pts.length-1;i++){if((n+6)*3>arr.length)break;const a=pts[i],b=pts[i+1];
    _bd.subVectors(b,a);_bc.subVectors(_bcam,a);_bs.crossVectors(_bd,_bc).normalize().multiplyScalar(w*(pts.w||1)*(1-.6*i/pts.length));
    arr.set([a.x-_bs.x,a.y-_bs.y,a.z-_bs.z,a.x+_bs.x,a.y+_bs.y,a.z+_bs.z,b.x+_bs.x,b.y+_bs.y,b.z+_bs.z,
             a.x-_bs.x,a.y-_bs.y,a.z-_bs.z,b.x+_bs.x,b.y+_bs.y,b.z+_bs.z,b.x-_bs.x,b.y-_bs.y,b.z-_bs.z],n*3);n+=6;}
  m.geometry.setDrawRange(0,n);m.geometry.attributes.position.needsUpdate=true;}

// --- canvas textures (spiral pool, rune circle)
function spiralTex(color){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const col=new THREE.Color(color);
  const rgb=`${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)}`;x.translate(128,128);
  for(let arm=0;arm<5;arm++){x.beginPath();for(let i=0;i<=80;i++){const t=i/80,a=arm/5*Math.PI*2+t*Math.PI*3,r=6+t*118;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    x.strokeStyle=`rgba(${rgb},0.9)`;x.lineWidth=10;x.stroke();}
  const g=x.createRadialGradient(0,0,0,0,0,128);g.addColorStop(0,`rgba(${rgb},0.9)`);g.addColorStop(.25,`rgba(${rgb},0.25)`);g.addColorStop(1,`rgba(${rgb},0)`);
  x.fillStyle=g;x.beginPath();x.arc(0,0,128,0,Math.PI*2);x.fill();return new THREE.CanvasTexture(c);}
function runeTex(color){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const col='#'+new THREE.Color(color).getHexString();
  x.translate(128,128);x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;
  for(const r of[120,100,56]){x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.stroke();}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,b=a+Math.PI*2/3;x.beginPath();x.moveTo(Math.cos(a)*100,Math.sin(a)*100);x.lineTo(Math.cos(b)*100,Math.sin(b)*100);x.stroke();}
  x.font='bold 20px serif';x.textAlign='center';x.textBaseline='middle';const R='ΔΘΛΞΠΣΦΨΩΓβδ';// glyphs every font has
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;x.save();x.rotate(a);x.fillText(R[i],0,-110);x.restore();}
  return new THREE.CanvasTexture(c);}
function groundDisc(tex,r,opacity,normal){const m=mesh(new THREE.CircleGeometry(r,48),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,blending:normal?THREE.NormalBlending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;return m;}

// --- cast: a rotating rune circle under the knight
function fxMagicCircle(color){if(!fxCloud())return;const m=groundDisc(runeTex(color),2.6,.9);m.position.set(P.x,P.y+.06,P.z);
  fxMesh(m,1.3,1.5);FX.meshes[FX.meshes.length-1].spin=2.5;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;fxPart({x:P.x+Math.cos(a)*2.6,y:P.y+.1,z:P.z+Math.sin(a)*2.6,vy:fxRand(2,5),life:.9,size:.3,size1:.05,color:0xffffff,color1:color,swirl:3,cx:P.x,cz:P.z,grow:-.4});}}

// --- Electric Bolt: electric field
function fxElectricField(c,R,color){const z=fxZone({dur:SPELL_ZONE_DUR,cd:0,strikeCD:0,strike:null,tick:null});if(!z)return;
  const dome=zoneAdd(z,mesh(new THREE.SphereGeometry(R*.8,20,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),c.x,0,c.z));
  const cage=zoneAdd(z,mesh(new THREE.SphereGeometry(R*.8,14,7,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}),c.x,0,c.z));
  const ring=zoneAdd(z,mesh(new THREE.RingGeometry(R*.78,R*.82,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),c.x,.06,c.z));ring.rotation.x=-Math.PI/2;
  const glow=zoneAdd(z,boltMesh(400,color,.55)),core=zoneAdd(z,boltMesh(400,0xffffff,.95));
  const onDome=()=>{const a=Math.random()*Math.PI*2,e=Math.random()*Math.PI/2.2,r=R*.8;return new THREE.Vector3(c.x+Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,c.z+Math.sin(a)*Math.cos(e)*r);};
  z.tick=(dt)=>{const f=zoneFade(z);
    dome.material.opacity=.08*f*(.7+Math.random()*.6);cage.material.opacity=.25*f;cage.rotation.y+=dt*.8;ring.material.opacity=.8*f*(.6+.4*Math.sin(z.t*20));
    glow.material.opacity=.55*f;core.material.opacity=.95*f;
    // arcs jump between points on the dome and down to the ground; a sky strike holds for a moment
    z.cd-=dt;z.strikeCD-=dt;
    if(z.strikeCD<=0&&z.t<z.dur-.5){z.strikeCD=fxRand(.22,.4);const a=Math.random()*Math.PI*2,d=Math.random()*R*.7,gx=c.x+Math.cos(a)*d,gz=c.z+Math.sin(a)*d;
      z.strike={t:.13,path:boltPath(new THREE.Vector3(gx+fxRand(-4,4),34,gz+fxRand(-4,4)),new THREE.Vector3(gx,0,gz),16,3.2)};z.strike.path.w=3.5;// thick sky bolt
      const hit=new THREE.Vector3(gx,.3,gz);fxSparks(hit,color,18);fxRing(hit,color,2.2);fxShake(.18);}
    if(z.strike){z.strike.t-=dt;if(z.strike.t<=0)z.strike=null;}
    if(z.cd<=0){z.cd=.06;const paths=[];
      for(let i=0;i<7;i++)paths.push(boltPath(onDome(),onDome(),14,1.1));
      for(let i=0;i<4;i++){const p=onDome();paths.push(boltPath(p,new THREE.Vector3(p.x+(c.x-p.x)*.3,0,p.z+(c.z-p.z)*.3),12,.9));}
      if(z.strike)paths.push(z.strike.path);
      setBolts(glow,paths,.12);setBolts(core,paths,.035);}
    for(let i=0;i<4;i++){const p=onDome();fxPart({x:p.x,y:p.y,z:p.z,vx:fxRand(-2,2),vy:fxRand(-2,2),vz:fxRand(-2,2),life:.3,size:.25,size1:.02,color:0xffffff,color1:color});}};}

// --- Fireball: firestorm
function fxFirestorm(c,R,color){const z=fxZone({dur:SPELL_ZONE_DUR,mcd:.2,meteors:[],tick:null});if(!z)return;
  const mat=o=>new THREE.MeshBasicMaterial({color:o,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const outer=zoneAdd(z,mesh(new THREE.CylinderGeometry(R*.38,1.1,18,18,1,true),mat(color),c.x,9,c.z));
  const inner=zoneAdd(z,mesh(new THREE.CylinderGeometry(R*.2,.5,15,12,1,true),mat(0xffd27a),c.x,7.5,c.z));
  const scorch=zoneAdd(z,mesh(new THREE.CircleGeometry(R*.95,40),new THREE.MeshBasicMaterial({color:0x1a0a04,transparent:true,opacity:.6,depthWrite:false}),c.x,.04,c.z));scorch.rotation.x=-Math.PI/2;
  z.tick=(dt)=>{const f=zoneFade(z),T=z.t;
    outer.rotation.y+=dt*5;inner.rotation.y-=dt*7;outer.material.opacity=.13*f;inner.material.opacity=.22*f;
    outer.scale.set(1+Math.sin(T*9)*.08,f,1+Math.cos(T*7)*.08);inner.scale.set(1,f,1);scorch.material.opacity=.6*f;
    // the tornado: flames spiral up and widen, smoke spills from the top
    for(let i=0;i<16*f;i++){const a=Math.random()*Math.PI*2,r=fxRand(.6,2.4);
      fxPart({x:c.x+Math.cos(a)*r,y:fxRand(0,2),z:c.z+Math.sin(a)*r,vy:fxRand(7,12),life:fxRand(1,1.5),size:fxRand(1.2,2.2),size1:.4,color:0xffe0a0,color1:color,alpha:.8,swirl:5,cx:c.x,cz:c.z,grow:.45});}
    for(let i=0;i<3*f;i++){const a=Math.random()*Math.PI*2,r=R*.35;
      fxPart({x:c.x+Math.cos(a)*r,y:fxRand(13,17),z:c.z+Math.sin(a)*r,vy:fxRand(1,3),life:1.8,size:2,size1:4.5,color:0x3a2a20,color1:0x0a0606,alpha:.4,smoke:true,swirl:1.5,cx:c.x,cz:c.z,grow:.2});}
    // a ring of burning ground at the edge
    for(let i=0;i<6*f;i++){const a=Math.random()*Math.PI*2,r=R*fxRand(.82,.95);
      fxPart({x:c.x+Math.cos(a)*r,y:.1,z:c.z+Math.sin(a)*r,vy:fxRand(2,4),life:fxRand(.4,.7),size:fxRand(.6,1.1),size1:.1,color:0xffd27a,color1:color});}
    // meteors fall inside the storm and burst on the ground
    z.mcd-=dt;if(z.mcd<=0&&T<z.dur-.8){z.mcd=fxRand(.25,.45);const a=Math.random()*Math.PI*2,d=Math.random()*R*.85;
      const m=zoneAdd(z,mesh(new THREE.SphereGeometry(.55,8,6),new THREE.MeshBasicMaterial({color:0xffc070}),c.x+Math.cos(a)*d+fxRand(-6,6),32,c.z+Math.sin(a)*d+fxRand(-6,6)));
      fxFireball(m,color,1);z.meteors.push({m,to:new THREE.Vector3(c.x+Math.cos(a)*d,0,c.z+Math.sin(a)*d)});}
    for(let i=z.meteors.length-1;i>=0;i--){const mt=z.meteors[i],p=mt.m.position,v=mt.to.clone().sub(p);const step=46*dt;
      if(v.length()<=step){fxExplode(mt.to.clone().setY(.4),color,1.4);fxShake(.12);cur.scene.remove(mt.m);z.meteors.splice(i,1);}else p.addScaledVector(v.normalize(),step);}};}

// --- Poison Missile: toxic whirlpool
function fxToxicWhirlpool(c,R,color){const z=fxZone({dur:SPELL_ZONE_DUR,tick:null});if(!z)return;
  // two spirals turning opposite ways: dark green underneath, glowing green on top
  const pool2=zoneAdd(z,groundDisc(spiralTex(0x1e4a12),R*.95,.85,true));pool2.position.set(c.x,.05,c.z);pool2.scale.x=-1;
  const pool=zoneAdd(z,groundDisc(spiralTex(color),R*.8,.6));pool.position.set(c.x,.07,c.z);
  z.tick=(dt)=>{const f=zoneFade(z);
    pool.rotation.z+=dt*3.2;pool2.rotation.z-=dt*2;pool.material.opacity=.6*f;pool2.material.opacity=.85*f;
    // the edge of the pool is dragged round and sucked into the centre
    for(let i=0;i<10*f;i++){const a=Math.random()*Math.PI*2,r=R*fxRand(.6,.95);
      fxPart({x:c.x+Math.cos(a)*r,y:.15,z:c.z+Math.sin(a)*r,life:1.4,size:fxRand(.4,.8),size1:.15,color:0xc8ff8a,color1:color,swirl:3.5,cx:c.x,cz:c.z,grow:-.9});}
    // a column of poison spirals up from the middle and spreads as a cloud
    for(let i=0;i<5*f;i++){const a=Math.random()*Math.PI*2,r=fxRand(.3,1.2);
      fxPart({x:c.x+Math.cos(a)*r,y:.3,z:c.z+Math.sin(a)*r,vy:fxRand(3,6),life:1.3,size:1,size1:.3,color:0xd8ff9a,color1:color,swirl:4,cx:c.x,cz:c.z,grow:.4});}
    for(let i=0;i<3*f;i++){const a=Math.random()*Math.PI*2,r=Math.random()*R*.8;
      fxPart({x:c.x+Math.cos(a)*r,y:fxRand(.5,3),z:c.z+Math.sin(a)*r,vy:fxRand(.3,1),life:2,size:2,size1:4,color:0x4a7a2a,color1:0x1a2a10,alpha:.35,smoke:true,swirl:.8,cx:c.x,cz:c.z});}
    // bubbles swell and pop across the pool
    if(Math.random()<.6*f){const a=Math.random()*Math.PI*2,r=Math.random()*R*.85,x=c.x+Math.cos(a)*r,zz=c.z+Math.sin(a)*r;
      fxPart({x,y:.2,z:zz,vy:.6,life:.6,size:.2,size1:1,color:0xeaffc0,color1:color,alpha:.7});}};}

// --- pick the effect for a spell
function fxSpellZone(id,pos,R,color){const c=new THREE.Vector3(pos.x,0,pos.z);
  fxTint(color,.7,.5);fxShake(.6);fxRing(c,color,R);
  if(id==='bolt')fxElectricField(c,R,color);
  else if(id==='poison')fxToxicWhirlpool(c,R,color);
  else fxFirestorm(c,R,color);}
