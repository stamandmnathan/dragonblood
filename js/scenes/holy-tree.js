// ========================================================================
// DragonBlood · Holy Tree model
// The sacred tree in the kingdom (bark crafting) and the one that grows at
// the end of a Holy Tree trial. Twisted golden trunk, roots, branches, a
// glowing canopy, hanging fruit, element gems, drifting leaves and motes.
// ========================================================================
'use strict';
// makeHolyTree(opts) returns a group about 7 tall (scale it as needed) with
// userData.tick(dt, t) to call every frame for the sway, glow and particles.
// opts.planter: true adds the carved stone ring around the base (kingdom).

// --- helpers
// A tapered tube along a smooth curve through `pts` (roots, branches, trunk strands).
function htTube(pts,r0,r1,mat,seg){const curve=new THREE.CatmullRomCurve3(pts);const n=seg||12,rs=6;
  const geo=new THREE.TubeGeometry(curve,n,1,rs,false),pos=geo.attributes.position,c=new THREE.Vector3(),p=new THREE.Vector3();
  // taper: pull each ring of vertices toward its centre point on the curve
  for(let i=0;i<=n;i++){curve.getPointAt(i/n,c);const r=r0+(r1-r0)*(i/n);
    for(let j=0;j<=rs;j++){const k=i*(rs+1)+j;p.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,p.x,p.y,p.z);}}
  geo.computeVertexNormals();return new THREE.Mesh(geo,mat);}
const htV=(x,y,z)=>new THREE.Vector3(x,y,z);

// --- the tree
function makeHolyTree(opts){opts=opts||{};const g=new THREE.Group(),r=rng(opts.seed||7);
  const bark=M(0xd8c79a,{emissive:0x5a4a20,emissiveIntensity:.35,roughness:.7});
  const barkD=M(0xb09a68,{emissive:0x3a2e14,emissiveIntensity:.25,roughness:.8});
  const leafA=new THREE.MeshStandardMaterial({color:0xf2e6a8,emissive:0xd8b850,emissiveIntensity:.55,flatShading:true,roughness:.6});
  const leafB=new THREE.MeshStandardMaterial({color:0xfff4c8,emissive:0xf0d070,emissiveIntensity:.75,flatShading:true,roughness:.5,transparent:true,opacity:.85});
  const fruitM=new THREE.MeshBasicMaterial({color:0xfff0b0}),stringM=new THREE.MeshBasicMaterial({color:0x8a7a50});
  const sway=new THREE.Group();g.add(sway);// everything above the roots sways gently

  // roots: curve out from the trunk base and dive into the ground
  const nR=7;for(let i=0;i<nR;i++){const a=i/nR*Math.PI*2+r()*.4,l=1.6+r()*1.2,c=Math.cos(a),s=Math.sin(a);
    g.add(htTube([htV(c*.25,.9,s*.25),htV(c*.7,.35,s*.7),htV(c*l*.75,.12,s*l*.75),htV(c*l,-.15,s*l)],.28,.05,i%2?barkD:bark,10));}

  // trunk: three strands twisting around each other, with a core
  sway.add(htTube([htV(0,0,0),htV(0,1.5,0),htV(.1,3,0),htV(0,4.2,0)],.55,.32,barkD,8));
  for(let k=0;k<3;k++){const pts=[];for(let i=0;i<=8;i++){const t=i/8,a=k/3*Math.PI*2+t*Math.PI*1.4,rr=.42-.12*t;pts.push(htV(Math.cos(a)*rr,t*4.3,Math.sin(a)*rr));}
    sway.add(htTube(pts,.3,.16,bark,24));}

  // branches: curve up and out from the top of the trunk, each with two twigs; canopy clusters at the tips
  const tips=[];const nB=6;
  for(let i=0;i<nB;i++){const a=i/nB*Math.PI*2+r()*.5,c=Math.cos(a),s=Math.sin(a),out=1.8+r()*.9,up=5.3+r()*1.1;
    const b0=htV(c*.2,3.6+r()*.5,s*.2),b1=htV(c*out*.45,up-.8,s*out*.45),b2=htV(c*out,up,s*out);
    sway.add(htTube([b0,b1,b2],.2,.07,bark,10));tips.push(b2);
    for(const side of[-1,1]){const a2=a+side*.6,t0=b1.clone().lerp(b2,.4),t1=htV(t0.x+Math.cos(a2)*.9,t0.y+.6+r()*.4,t0.z+Math.sin(a2)*.9);
      sway.add(htTube([t0,t0.clone().lerp(t1,.5).setY(t0.y+.45),t1],.08,.03,bark,6));tips.push(t1);}}
  tips.push(htV(0,6.6,0));

  // canopy: leaf clusters round every tip, plus a crown over the top
  const canopy=new THREE.Group();sway.add(canopy);
  for(const p of tips){const n=2+Math.floor(r()*2);
    for(let i=0;i<n;i++){const sz=.55+r()*.6,m=mesh(new THREE.IcosahedronGeometry(sz,0),r()<.35?leafB:leafA,p.x+(r()-.5)*.9,p.y+(r()-.3)*.7,p.z+(r()-.5)*.9);
      m.rotation.set(r()*3,r()*3,r()*3);canopy.add(m);}}
  const crownTop=mesh(new THREE.IcosahedronGeometry(1.5,1),leafA,0,6.4,0);canopy.add(crownTop);

  // hanging fruit: glowing drops on thin stems under the canopy
  const fruit=[];
  for(let i=0;i<10;i++){const p=tips[Math.floor(r()*tips.length)],len=.4+r()*.5,x=p.x+(r()-.5)*1.2,z=p.z+(r()-.5)*1.2,y=p.y-.5;
    const st=mesh(new THREE.CylinderGeometry(.012,.012,len,3),stringM,x,y-len/2,z);canopy.add(st);
    const f=mesh(new THREE.SphereGeometry(.11,8,6),fruitM,x,y-len-.08,z);f.scale.y=1.3;canopy.add(f);fruit.push(f);}

  // element gems set into the trunk: one per holy bark kind
  const gems=[];const gemCols=[0xe2552b,0x9ad8f2,0xf2d64b,0x7bc043,0xff8a1f,0x9b6bff];
  gemCols.forEach((col,i)=>{const a=i/6*Math.PI*2+.3,y=1.2+(i%3)*.75;
    const gm=mesh(new THREE.OctahedronGeometry(.2,0),new THREE.MeshBasicMaterial({color:col}),Math.cos(a)*.56,y,Math.sin(a)*.56);gm.scale.y=1.4;sway.add(gm);gems.push(gm);
    const set=mesh(new THREE.TorusGeometry(.22,.045,4,8),barkD,Math.cos(a)*.5,y,Math.sin(a)*.5);set.lookAt(Math.cos(a)*2,y,Math.sin(a)*2);sway.add(set);});

  // carved stone planter (kingdom only)
  if(opts.planter){const stone=M(0x9a938a),dark=M(0x6a645c);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const b=mesh(new THREE.BoxGeometry(.75,.5,.4),i%2?stone:dark,Math.cos(a)*1.85,.25,Math.sin(a)*1.85);b.rotation.y=-a+Math.PI/2;g.add(b);}
    const soil=mesh(new THREE.CircleGeometry(1.7,20),M(0x3a3020),0,.06,0);soil.rotation.x=-Math.PI/2;g.add(soil);
    const ring=mesh(new THREE.RingGeometry(2.1,2.35,40),new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.55,side:THREE.DoubleSide}),0,.04,0);ring.rotation.x=-Math.PI/2;g.add(ring);
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;// little shrine candles
      g.add(mesh(new THREE.CylinderGeometry(.07,.07,.3,6),M(0xf0e8d0),Math.cos(a)*2.3,.15,Math.sin(a)*2.3));
      g.add(mesh(new THREE.ConeGeometry(.05,.14,5),new THREE.MeshBasicMaterial({color:0xffc060}),Math.cos(a)*2.3,.37,Math.sin(a)*2.3));}}

  // falling leaves and floating motes (recycled, so the count stays fixed)
  const leafFall=[];const fallM=new THREE.MeshBasicMaterial({color:0xffe9a0,side:THREE.DoubleSide,transparent:true,opacity:.9});
  for(let i=0;i<9;i++){const m=mesh(new THREE.PlaneGeometry(.18,.12),fallM,0,0,0);g.add(m);leafFall.push({m,t:r()*6,life:4+r()*2,x:0,z:0,y0:0,spin:1+r()*2});}
  const motes=[];const moteM=new THREE.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:.85});
  for(let i=0;i<14;i++){const m=mesh(new THREE.SphereGeometry(.05,5,4),moteM,0,0,0);g.add(m);motes.push({m,a:r()*Math.PI*2,rad:1.2+r()*1.8,h:.6+r()*5.5,sp:.2+r()*.4,ph:r()*6});}

  g.userData.tick=(dt,t)=>{
    sway.rotation.z=Math.sin(t*.6)*.015;sway.rotation.x=Math.cos(t*.5)*.012;canopy.rotation.y=Math.sin(t*.25)*.05;
    leafA.emissiveIntensity=.5+Math.sin(t*1.3)*.1;leafB.emissiveIntensity=.7+Math.sin(t*1.3+1)*.15;
    fruit.forEach((f,i)=>{f.scale.setScalar(.9+Math.sin(t*2+i)*.15);f.scale.y*=1.3;});
    gems.forEach((gm,i)=>{gm.rotation.y+=dt*1.5;gm.scale.setScalar(1+Math.sin(t*3+i)*.12);gm.scale.y*=1.4;});
    for(const L of leafFall){L.t+=dt;if(L.t>=L.life){L.t=0;const p=tips[Math.floor(Math.random()*tips.length)];L.x=p.x+(Math.random()-.5);L.z=p.z+(Math.random()-.5);L.y0=p.y-.3;}
      const k=L.t/L.life;L.m.position.set(L.x+Math.sin(L.t*1.7)*.5,Math.max(.05,L.y0-k*L.y0),L.z+Math.cos(L.t*1.3)*.4);
      L.m.rotation.set(L.t*L.spin,L.t*L.spin*.7,0);L.m.visible=L.y0>0;}
    for(const o of motes){o.a+=dt*o.sp;o.m.position.set(Math.cos(o.a)*o.rad,o.h+Math.sin(t*1.5+o.ph)*.3,Math.sin(o.a)*o.rad);}};
  return g;}
