// ========================================================================
// DragonBlood · Effects
// Particles and short-lived effects: projectile trails, explosions, sparks,
// dust, the sword swoosh, spell casting rings. fxUpdate(dt) runs every frame.
// ========================================================================
'use strict';
// How it works: one THREE.Points cloud per scene holds every particle (one draw
// call). It is created on first use and rebuilt when the scene changes, since
// disposeScene() frees the old one. Bigger pieces (flash, shockwave, swoosh)
// are ordinary meshes tracked in FX.meshes. No lights are added at runtime:
// a new light would make three.js recompile every material and stutter.

// --- particle cloud
const FX_MAX=1400;
const FX={scene:null,pts:null,smoke:null,parts:[],meshes:[],trails:[]};// pts glows (additive), smoke darkens (normal)
const FX_VERT=`attribute float size;attribute vec4 rgba;varying vec4 vC;
void main(){vC=rgba;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(420.0/max(.1,-mv.z));gl_Position=projectionMatrix*mv;}`;
const FX_FRAG=`varying vec4 vC;
void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;float a=vC.a*(1.0-smoothstep(.12,.5,d));gl_FragColor=vec4(vC.rgb*a,a);}`;
const FX_SMOKE_FRAG=`varying vec4 vC;
void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(.5,.1,d));}`;
function fxCloud(){
  if(!cur)return null;
  if(FX.scene!==cur.scene||!FX.pts||!FX.pts.parent){// new scene: start fresh
    FX.scene=cur.scene;FX.parts.length=0;FX.trails.length=0;
    for(let i=FX.meshes.length-1;i>=0;i--)if(!FX.meshes[i].cam)FX.meshes.splice(i,1);// scene meshes went with the old scene
    const cloud=(frag,blending,order)=>{const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(FX_MAX*3),3));
      geo.setAttribute('rgba',new THREE.Float32BufferAttribute(new Float32Array(FX_MAX*4),4));
      geo.setAttribute('size',new THREE.Float32BufferAttribute(new Float32Array(FX_MAX),1));
      geo.setDrawRange(0,0);
      const pts=new THREE.Points(geo,new THREE.ShaderMaterial({vertexShader:FX_VERT,fragmentShader:frag,transparent:true,depthWrite:false,blending}));
      pts.frustumCulled=false;pts.renderOrder=order;cur.scene.add(pts);return pts;};
    FX.smoke=cloud(FX_SMOKE_FRAG,THREE.NormalBlending,4);FX.pts=cloud(FX_FRAG,THREE.AdditiveBlending,5);}
  return FX.pts;}

// Spawn one particle. o: {x,y,z, vx,vy,vz, life, size, size1, color, color1, alpha, grav, drag, smoke}
const _c0=new THREE.Color(),_c1=new THREE.Color();
function fxPart(o){if(!fxCloud())return;if(FX.parts.length>=FX_MAX)FX.parts.shift();
  _c0.set(o.color==null?0xffffff:o.color);_c1.set(o.color1==null?(o.color==null?0xffffff:o.color):o.color1);
  FX.parts.push({x:o.x,y:o.y,z:o.z,vx:o.vx||0,vy:o.vy||0,vz:o.vz||0,t:0,life:o.life||.6,s0:o.size||.5,s1:o.size1==null?(o.size||.5)*.2:o.size1,
    r0:_c0.r,g0:_c0.g,b0:_c0.b,r1:_c1.r,g1:_c1.g,b1:_c1.b,a:o.alpha==null?1:o.alpha,grav:o.grav||0,drag:o.drag||0,sm:!!o.smoke});}
const fxRand=(a,b)=>a+Math.random()*(b-a);
// Random unit vector (optionally biased upward).
function fxDir(up){const u=Math.random()*2-1+(up||0),a=Math.random()*Math.PI*2,s=Math.sqrt(Math.max(0,1-Math.min(1,u*u)));return new THREE.Vector3(Math.cos(a)*s,Math.min(1,u),Math.sin(a)*s).normalize();}

// --- mesh effects (flash ball, shockwave ring)
// Add a mesh that grows and fades over `life` seconds; grow = end scale.
function fxMesh(m,life,grow,parent){(parent||cur.scene).add(m);FX.meshes.push({m,t:0,life,grow,a0:m.material.opacity});}
function fxFlash(pos,color,r){
  fxMesh(mesh(new THREE.SphereGeometry(r*.5,14,10),new THREE.MeshBasicMaterial({color:0xfff4d0,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}),pos.x,pos.y,pos.z),.18,2.2);
  fxMesh(mesh(new THREE.SphereGeometry(r*.6,14,10),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending}),pos.x,pos.y,pos.z),.3,1.8);}
function fxRing(pos,color,r){const m=mesh(new THREE.RingGeometry(r*.8,r,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),pos.x,.08,pos.z);// on the ground
  m.rotation.x=-Math.PI/2;m.scale.setScalar(.15);fxMesh(m,.55,1);}

// --- public effects
// Explosion: flash, fireball, flying embers, smoke, and a ground shockwave when low.
// size ~1 for a small fireball hit, ~3 for a big dragon fireball, ~10 for a scroll blast.
function fxExplode(pos,color,size){if(!fxCloud())return;size=size||1;const p=pos.clone?pos:new THREE.Vector3(pos.x,pos.y,pos.z);
  fxFlash(p,color,size);if(p.y<size+1.5)fxRing(p,color,size*1.6);// shockwave only near the ground
  const n=Math.min(90,Math.round(18+size*9));
  for(let i=0;i<n;i++){const d=fxDir(.3),sp=fxRand(2,7)*Math.sqrt(size);// fireball body
    fxPart({x:p.x,y:p.y,z:p.z,vx:d.x*sp,vy:d.y*sp,vz:d.z*sp,life:fxRand(.35,.7),size:fxRand(.8,1.6)*Math.sqrt(size),size1:.3,color:0xffc870,color1:color,alpha:.75,drag:3});}
  for(let i=0;i<n*.6;i++){const d=fxDir(.6),sp=fxRand(6,14)*Math.sqrt(size);// embers
    fxPart({x:p.x,y:p.y,z:p.z,vx:d.x*sp,vy:d.y*sp,vz:d.z*sp,life:fxRand(.5,1.1),size:fxRand(.12,.25),size1:.05,color:0xffd27a,color1:color,grav:12,drag:.6});}
  for(let i=0;i<n*.4;i++){const d=fxDir(1),sp=fxRand(.8,2)*Math.sqrt(size);// smoke
    fxPart({x:p.x+d.x*size*.3,y:p.y,z:p.z+d.z*size*.3,vx:d.x*sp,vy:Math.abs(d.y)*sp+1,vz:d.z*sp,life:fxRand(.9,1.6),size:.6*Math.sqrt(size),size1:2*Math.sqrt(size),color:0x3a3530,color1:0x111111,alpha:.45,drag:1,smoke:true});}}
// Sparks on a hit (arrows, bites, blocked strikes).
function fxSparks(pos,color,n){if(!fxCloud())return;n=n||12;
  for(let i=0;i<n;i++){const d=fxDir(.4),sp=fxRand(3,9);fxPart({x:pos.x,y:pos.y,z:pos.z,vx:d.x*sp,vy:d.y*sp,vz:d.z*sp,life:fxRand(.2,.45),size:fxRand(.1,.2),size1:.02,color:0xffffff,color1:color==null?0xffc060:color,grav:14,drag:1});}}
// Dust puff where something hits the ground or a wall.
function fxDust(pos,n){if(!fxCloud())return;n=n||8;
  for(let i=0;i<n;i++){const d=fxDir(.8),sp=fxRand(.5,2);fxPart({x:pos.x,y:Math.max(.1,pos.y),z:pos.z,vx:d.x*sp,vy:Math.abs(d.y)*sp,vz:d.z*sp,life:fxRand(.5,.9),size:.3,size1:.9,color:0x9a8a70,color1:0x3a342c,alpha:.35,drag:2,smoke:true});}}
// Trail behind a moving object until it leaves the scene.
// o: {color, color1, size, life, every (metres between puffs), smoke, flicker}
function fxTrail(obj,o){if(!fxCloud())return;FX.trails.push({obj,o:Object.assign({color:0xffffff,size:.5,life:.35,every:.35},o),last:null,base:obj.scale.clone()});}
// A dragon fireball: trail + flickering core. Explodes via fxExplode when the scene removes it.
function fxFireball(obj,color,size){fxTrail(obj,{color:0xffd890,color1:color,size:(size||1)*1.5,life:.45,every:.25,smoke:true,flicker:true});}
// Ring of light rising around the knight while casting a spell or Dragon Power.
function fxCast(color){if(!fxCloud())return;const n=28;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;fxPart({x:P.x+Math.cos(a)*1.1,y:P.y+.1,z:P.z+Math.sin(a)*1.1,vx:-Math.sin(a)*1.6,vy:fxRand(1.5,3),vz:Math.cos(a)*1.6,life:.8,size:.35,size1:.05,color:0xffffff,color1:color});}
  fxRing(new THREE.Vector3(P.x,P.y+.06,P.z),color,1.6);}
// Sword swoosh: a fading arc in front of the camera. kind: 'sword' (diagonal sweep) or 'dagger' (thrust).
function fxSlash(kind,color){const thrust=kind==='dagger';
  const geo=thrust?new THREE.PlaneGeometry(.05,.9):new THREE.RingGeometry(.4,.47,24,1,0,Math.PI*.75);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:color==null?0xfff4e0:color,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending}));
  if(thrust){m.position.set(.25,-.3,-1.1);m.rotation.set(-Math.PI/2+.15,0,0);}else{m.position.set(.12,-.12,-.8);m.rotation.set(-.4,0,.35);}
  m.renderOrder=10;camera.add(m);FX.meshes.push({m,t:0,life:thrust?.14:.2,grow:thrust?1.3:1.12,a0:.4,cam:true,spin:thrust?0:-2.2});}

// --- per-frame update
function fxUpdate(dt){if(!cur)return;
  // swoosh meshes on the camera live across scenes; scene meshes are dropped with the scene
  for(let i=FX.meshes.length-1;i>=0;i--){const e=FX.meshes[i];e.t+=dt;const k=Math.min(1,e.t/e.life);
    e.m.material.opacity=e.a0*(1-k)*(1-k);const s=e.m.userData.s0||(e.m.userData.s0=e.m.scale.x);e.m.scale.setScalar(s*(1+(e.grow-1)*Math.sqrt(k)));
    if(e.spin)e.m.rotation.z+=e.spin*dt;
    if(k>=1){if(e.m.parent)e.m.parent.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();FX.meshes.splice(i,1);}}
  if(!FX.pts||FX.scene!==cur.scene){FX.trails.length=0;return;}
  // trails: spawn puffs along the path travelled since last frame
  const wp=new THREE.Vector3();
  for(let i=FX.trails.length-1;i>=0;i--){const tr=FX.trails[i],o=tr.o;
    if(!tr.obj.parent){FX.trails.splice(i,1);continue;}
    tr.obj.getWorldPosition(wp);
    if(o.flicker)tr.obj.scale.copy(tr.base).multiplyScalar(1+Math.sin(performance.now()*.04+i)*.12);
    if(!tr.last){tr.last=wp.clone();continue;}
    const dist=wp.distanceTo(tr.last),n=Math.min(12,Math.floor(dist/o.every));
    for(let k=1;k<=n;k++){const q=tr.last.clone().lerp(wp,k/n);
      fxPart({x:q.x+fxRand(-.1,.1)*o.size,y:q.y+fxRand(-.1,.1)*o.size,z:q.z+fxRand(-.1,.1)*o.size,vy:o.smoke?.4:0,life:o.life,size:o.size,size1:o.size*.15,color:o.color,color1:o.color1});
      if(o.smoke&&k%2===0)fxPart({x:q.x,y:q.y,z:q.z,vy:.8,life:.9,size:o.size*.6,size1:o.size*1.6,color:0x2a2420,color1:0x0a0a0a,alpha:.3,drag:1,smoke:true});}
    if(n)tr.last.copy(wp);}
  // particles
  const bufs=[FX.pts,FX.smoke].map(o=>{const a=o.geometry.attributes;return{geo:o.geometry,pa:a.position.array,ca:a.rgba.array,sa:a.size.array,n:0};});
  for(let i=FX.parts.length-1;i>=0;i--){const p=FX.parts[i];p.t+=dt;if(p.t>=p.life){FX.parts.splice(i,1);continue;}
    const k=p.t/p.life,dr=Math.max(0,1-p.drag*dt);p.vx*=dr;p.vy=p.vy*dr-p.grav*dt;p.vz*=dr;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<.02){p.y=.02;p.vy*=-.3;}
    const B=bufs[p.sm?1:0],n=B.n++;
    B.pa[n*3]=p.x;B.pa[n*3+1]=p.y;B.pa[n*3+2]=p.z;
    const fade=p.a*(k<.1?k/.1:1-(k-.1)/.9);// quick fade-in, slow fade-out
    B.ca[n*4]=p.r0+(p.r1-p.r0)*k;B.ca[n*4+1]=p.g0+(p.g1-p.g0)*k;B.ca[n*4+2]=p.b0+(p.b1-p.b0)*k;B.ca[n*4+3]=fade;
    B.sa[n]=p.s0+(p.s1-p.s0)*k;}
  for(const B of bufs){const a=B.geo.attributes;B.geo.setDrawRange(0,B.n);a.position.needsUpdate=a.rgba.needsUpdate=a.size.needsUpdate=true;}}
