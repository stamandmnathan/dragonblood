// ========================================================================
// DragonBlood · Dragon models
// Procedural dragon builder: a shared body (head, neck, legs, tail, wings)
// plus a look per element (horns, spine, frills, glow). Also the animation
// (flap, dragonBreathe, dragonBite) and the hit flash (tickFlash).
// ========================================================================
'use strict';
// Rules the rest of the game relies on (keep these when editing the model):
//   children[0] is the body (the tutorial mother "breathes" by scaling it);
//   userData.wingL / wingR are groups that flap by rotation.z (see flap());
//   flap(d,t,speed,amp) animates everything: wings, tail, head, legs, jaw;
//   userData.mats are the materials the hit flash tints (glow parts stay out);
//   a rider sits at about (0,.75,-.3), so the saddle area has no spikes;
//   feet reach about y=-1.3 (scenes place dragons on the ground with that).

// --- element looks
// horn: curved | straight | crown | tendril. spine: blades | crystals | fins | bulbs.
// glow: eye/accent color. veins: glowing cracks on the body. frill: neck frills.
const DRAGON_STYLES={
  fire:    {horn:'curved',  spine:'blades',  glow:0xffb347,belly:0xe8a65a,frill:false,veins:false},
  ice:     {horn:'straight',spine:'crystals',glow:0xbff4ff,belly:0xdff3fb,frill:false,veins:false,crystal:0xcff0ff},
  electric:{horn:'crown',   spine:'fins',    glow:0xfff27a,belly:0x6b6a84,frill:false,veins:true},
  poison:  {horn:'curved',  spine:'bulbs',   glow:0xb6ff6a,belly:0xa3c06a,frill:true, veins:false},
  lava:    {horn:'crown',   spine:'blades',  glow:0xff7a1a,belly:0x3a1a10,frill:false,veins:true},
  void:    {horn:'tendril', spine:'fins',    glow:0xd9a6ff,belly:0x2a2236,frill:true, veins:false},
  wild:    {horn:'curved',  spine:'blades',  glow:0xffe08a,belly:null,    frill:false,veins:false},
};

// --- small builders
// Tapered limb/bone between two points.
function dBone(a,b,r1,r2,mat,seg){const d=new THREE.Vector3().subVectors(b,a),len=d.length();
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,len,seg||6),mat);
  m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
// Cone pointing along dir from base point p.
function dSpike(p,dir,r,len,mat,seg){const m=new THREE.Mesh(new THREE.ConeGeometry(r,len,seg||5),mat);
  const v=dir.clone().normalize();m.position.copy(p).addScaledVector(v,len/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v);return m;}
// Curved horn: a short chain of shrinking segments bending by `bend` per step.
function dHorn(g,p,dir,bend,r,len,steps,mat){let pos=p.clone(),d=dir.clone().normalize(),rr=r;
  const ax=new THREE.Vector3(1,0,0);
  for(let i=0;i<steps;i++){const l=len/steps,nr=rr*.72;const next=pos.clone().addScaledVector(d,l);
    g.add(i===steps-1?dSpike(pos,d,rr,l*1.3,mat):dBone(pos,next,rr,nr,mat,5));pos=next;rr=nr;d.applyAxisAngle(ax,bend);}}

// --- the dragon
// makeDragon(color, scale, element?) - element picks the look; omitted = wild/enemy look.
function makeDragon(color,scale,el){
  const st=DRAGON_STYLES[el]||DRAGON_STYLES.wild;
  const g=new THREE.Group(),V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const base=new THREE.Color(color);
  const mat=M(color,{roughness:.55,metalness:.15});
  const dark=M(base.clone().multiplyScalar(.42),{roughness:.7,side:THREE.DoubleSide});
  const belly=M(st.belly!=null?st.belly:base.clone().lerp(new THREE.Color(0xe8d8b8),.35).getHex(),{roughness:.8});
  const horn=M(el==='ice'?0xe6f6ff:el==='void'?0x1a1420:0xe9dcc2,{roughness:.5,metalness:.1});
  const claw=M(0x221a16,{roughness:.4});
  const glow=new THREE.MeshBasicMaterial({color:st.glow});
  const mats=[mat,dark,belly,horn];

  // body (must stay children[0]) and belly plates
  const body=mesh(new THREE.SphereGeometry(1,14,10),mat);body.scale.set(.9,.8,1.8);g.add(body);
  const chest=mesh(new THREE.SphereGeometry(.75,12,8),mat,0,.15,1.05);chest.scale.set(1,.95,1.1);g.add(chest);
  for(let i=0;i<6;i++){const z=1.15-i*.48,w=.62-Math.abs(i-1.5)*.05;
    const pl=mesh(new THREE.BoxGeometry(w,.08,.36),belly,0,-.72+Math.abs(z)*.04,z);pl.rotation.x=.08;g.add(pl);}
  // shoulder and hip muscle
  for(const s of[-1,1]){g.add(mesh(new THREE.SphereGeometry(.38,8,6),mat,s*.58,-.25,.85));g.add(mesh(new THREE.SphereGeometry(.42,8,6),mat,s*.55,-.3,-.9));}

  // neck: a curve of shrinking segments from the chest up to the head
  const neckPts=[V(0,.35,1.45),V(0,.7,1.85),V(0,1.05,2.1),V(0,1.3,2.35)];
  for(let i=0;i<neckPts.length-1;i++){const r1=.42-i*.07,r2=r1-.07;g.add(dBone(neckPts[i],neckPts[i+1],r1,r2,mat,8));
    g.add(mesh(new THREE.SphereGeometry(r2,8,6),mat,neckPts[i+1].x,neckPts[i+1].y,neckPts[i+1].z));}
  // head: skull, snout, jaw, brow ridges, nostrils, teeth, eyes
  const head=new THREE.Group();head.position.set(0,1.35,2.45);g.add(head);
  const skull=mesh(new THREE.SphereGeometry(.34,10,8),mat);skull.scale.set(1,.85,1.15);head.add(skull);
  const snout=mesh(new THREE.BoxGeometry(.38,.22,.62),mat,0,-.04,.48);head.add(snout);
  const tip=mesh(new THREE.SphereGeometry(.2,8,6),mat,0,-.04,.78);tip.scale.set(1,.6,.8);head.add(tip);
  const jaw=new THREE.Group();jaw.position.set(0,-.14,.12);head.add(jaw);// hinge: rotation.x opens it
  const jawM=mesh(new THREE.BoxGeometry(.32,.1,.66),dark,0,-.06,.3);jawM.rotation.x=.12;jaw.add(jawM);
  for(const s of[-1,1])for(let t=0;t<2;t++)jaw.add(dSpike(V(s*.12,-.02,.3+t*.18),V(0,1,0),.022,.08,horn,4));// lower teeth
  for(const s of[-1,1]){
    const brow=mesh(new THREE.BoxGeometry(.12,.08,.32),dark,s*.17,.15,.18);brow.rotation.set(-.2,s*.25,s*.15);head.add(brow);
    head.add(mesh(new THREE.SphereGeometry(.06,8,6),glow,s*.2,.08,.28));// eye
    head.add(mesh(new THREE.SphereGeometry(.035,5,4),claw,s*.1,.05,.86));// nostril
    for(let t=0;t<3;t++)head.add(dSpike(V(s*.15,-.12,.35+t*.16),V(0,-1,0),.025,.09,horn,4));// teeth
  }

  // horns by element
  if(st.horn==='curved')for(const s of[-1,1])dHorn(head,V(s*.17,.18,0),V(s*.25,.6,-1),-.28,.075,.75,4,horn);
  else if(st.horn==='straight')for(const s of[-1,1]){head.add(dSpike(V(s*.16,.18,0),V(s*.2,.55,-1),.07,.85,horn,5));head.add(dSpike(V(s*.24,0,-.1),V(s*.9,.1,-1),.04,.4,horn,4));}
  else if(st.horn==='crown')for(let i=0;i<5;i++){const a=(i-2)*.38;head.add(dSpike(V(Math.sin(a)*.24,.2,-.12),V(Math.sin(a)*.5,.8,-.7),.05,.42+(2-Math.abs(i-2))*.08,horn,4));}
  else if(st.horn==='tendril')for(const s of[-1,1])dHorn(head,V(s*.17,.18,0),V(s*.4,.3,-1),.22,.06,1.1,6,horn);
  // cheek frills (poison, void)
  if(st.frill)for(const s of[-1,1]){const fr=new THREE.Group();fr.position.set(s*.28,0,-.05);fr.rotation.y=s*.5;head.add(fr);
    for(let i=0;i<3;i++){const sp=dSpike(V(0,0,0),V(s*.9,(i-1)*.6,-.6),.035,.55,horn,4);fr.add(sp);}
    const web=mesh(new THREE.CircleGeometry(.36,8,0,Math.PI),dark,0,0,-.08);web.rotation.set(0,s*Math.PI/2,s>0?-Math.PI/2:Math.PI/2);fr.add(web);}

  // tail: a chain of nested segment groups (each sways a little more than the last)
  const tailPts=[V(0,0,-1.6),V(0,-.08,-2.3),V(0,-.1,-3.0),V(0,-.05,-3.6),V(0,.05,-4.15),V(0,.15,-4.6)];
  const tail=[];
  for(let i=0;i<tailPts.length;i++){const seg=new THREE.Group();
    if(i===0){seg.position.copy(tailPts[0]);g.add(seg);}else{seg.position.subVectors(tailPts[i],tailPts[i-1]);tail[i-1].add(seg);}tail.push(seg);
    if(i<tailPts.length-1){const r1=.45*(1-i/5.5),r2=.45*(1-(i+1)/5.5);seg.add(dBone(V(0,0,0),tailPts[i+1].clone().sub(tailPts[i]),r1,Math.max(.05,r2),mat,7));}}
  // put a part (positioned in body space) onto the tail segment it sits on
  const onTail=o=>{let i=0;while(i+1<tailPts.length&&tailPts[i+1].z>=o.position.z)i++;o.position.sub(tailPts[i]);tail[i].add(o);};
  const addBack=o=>{if(o.position.z<tailPts[0].z)onTail(o);else g.add(o);};

  // spine: neck crest + back + tail, leaving the saddle (z .4 to -.9) clear for a rider
  const spineMat=st.spine==='crystals'?new THREE.MeshStandardMaterial({color:st.crystal,emissive:st.crystal,emissiveIntensity:.35,roughness:.15,metalness:.1,transparent:true,opacity:.85,flatShading:true}):dark;
  // (crystals keep their own glow: tickFlash would reset it, so they stay out of mats)
  const spinePts=[[0,1.3,1.75],[0,1.0,1.45],[0,.85,.85],[0,.8,-1.05],[0,.7,-1.5],[0,.5,-2.0],[0,.32,-2.6],[0,.18,-3.2],[0,.06,-3.8]];
  spinePts.forEach(([x,y,z],i)=>{const p=V(x,y,z),h=i<2?.32:i<5?.42:.36-i*.025;
    if(st.spine==='blades')addBack(dSpike(p,V(0,1,-.45),.11,h,spineMat,4));
    else if(st.spine==='crystals'){addBack(dSpike(p,V(.15,1,-.2),.09,h*1.1,spineMat,4));addBack(dSpike(p,V(-.2,1,-.4),.06,h*.7,spineMat,4));}
    else if(st.spine==='fins'){const f=mesh(new THREE.ConeGeometry(.2,h*1.1,3),spineMat);f.scale.set(.18,1,1.4);f.position.set(x,y+h*.45,z);f.rotation.x=-.35;addBack(f);}
    else if(st.spine==='bulbs'){addBack(mesh(new THREE.SphereGeometry(.1+h*.12,7,5),spineMat,x,y+.06,z));addBack(dSpike(V(x,y+.12,z),V(0,1,-.3),.04,h*.6,horn,4));}});

  // tail tip by element (on the last tail segment, built at body-space positions then moved onto it)
  const tEnd=tailPts[tailPts.length-1],tipParts=[];
  if(el==='ice'){tipParts.push(dSpike(tEnd,V(0,.2,-1),.12,.6,spineMat,4),dSpike(tEnd,V(.6,.3,-1),.08,.4,spineMat,4),dSpike(tEnd,V(-.6,.3,-1),.08,.4,spineMat,4));}
  else if(el==='poison'){tipParts.push(mesh(new THREE.SphereGeometry(.16,8,6),glow,tEnd.x,tEnd.y,tEnd.z-.08),dSpike(tEnd,V(0,-.2,-1),.06,.45,horn,4));}
  else if(el==='electric'||el==='void'){const fin=mesh(new THREE.ConeGeometry(.35,.7,3),dark);fin.scale.set(1.2,1,.12);fin.position.set(tEnd.x,tEnd.y,tEnd.z-.3);fin.rotation.x=-Math.PI/2;tipParts.push(fin);}
  else{const blade=mesh(new THREE.ConeGeometry(.28,.8,4),dark);blade.scale.set(1.4,1,.25);blade.position.set(tEnd.x,tEnd.y,tEnd.z-.35);blade.rotation.x=-Math.PI/2;tipParts.push(blade);}
  for(const o of tipParts){o.position.sub(tEnd);tail[tail.length-1].add(o);}

  // legs: thigh, shin, foot, three claws (feet reach about y=-1.3); each leg is a group pivoting at the hip
  const legs=[];
  for(const[sx,sz,front]of[[-.6,.9,1],[.6,.9,1],[-.6,-.9,0],[.6,-.9,0]]){const s=Math.sign(sx);
    const hip=V(sx,-.3,sz),knee=V(sx+s*.12,-.75,sz+(front?.18:-.22)),ankle=V(sx+s*.08,-1.18,sz+(front?.02:.05));
    const leg=new THREE.Group();leg.position.copy(hip);g.add(leg);leg.userData.front=front;legs.push(leg);
    const parts=[dBone(hip,knee,.2,.15,mat,6),dBone(knee,ankle,.14,.1,dark,6),mesh(new THREE.BoxGeometry(.24,.1,.3),dark,ankle.x,-1.24,ankle.z+.08)];
    for(const cx of[-.08,0,.08])parts.push(dSpike(V(ankle.x+cx,-1.25,ankle.z+.22),V(0,-.35,1),.03,.15,claw,4));
    for(const o of parts){o.position.sub(hip);leg.add(o);}}

  // glowing veins (electric, lava) - kept out of the hit flash
  if(st.veins){const vm=new THREE.MeshBasicMaterial({color:st.glow});const r=rng(el==='lava'?7:11);
    for(let i=0;i<14;i++){const a=r()*Math.PI*2,z=r()*2.8-1.4,k=Math.sqrt(1-(z/1.8)**2),y=Math.sin(a)*.8*k,x=Math.cos(a)*.9*k;// on the body surface
      if(y>.55&&z<.4&&z>-.9)continue;// keep the saddle clear
      const v=mesh(new THREE.BoxGeometry(.04,.04,.28+r()*.3),vm,x*1.01,y*1.01,z);v.rotation.set(0,(r()-.5)*1.2,a);g.add(v);}}

  // wings: arm bones (inner) + a hand section hinged at the wrist (outer) with finger bones.
  // The membrane is one mesh; its vertices are re-placed each frame to follow the hand (see dWingBend).
  const memb=M(base.clone().multiplyScalar(el==='void'?.25:.42),{roughness:.75,side:THREE.DoubleSide,transparent:el==='ice',opacity:el==='ice'?.82:1});
  mats.push(memb);
  function wing(){const w=new THREE.Group();
    const root=V(0,0,.55),elbow=V(1.3,.35,.55),wrist=V(2.2,.55,.35);
    const tips=[V(3.95,.5,.15),V(3.6,.2,-.8),V(2.95,.05,-1.5),V(1.9,0,-1.75)];
    w.add(dBone(root,elbow,.11,.08,mat,6));w.add(dBone(elbow,wrist,.08,.06,mat,6));
    const hand=new THREE.Group();hand.position.copy(wrist);w.add(hand);
    const handParts=[dSpike(wrist,V(.2,.6,.6),.05,.28,claw,4)];// thumb claw
    for(const t of tips)handParts.push(dBone(wrist,t,.045,.015,dark,5));
    for(const o of handParts){o.position.sub(wrist);hand.add(o);}
    // membrane: fan from the wrist between finger tips, scalloped trailing edge, back to the body.
    // wt = how much a vertex follows the hand (0 = arm/body, 1 = hand).
    const pos=[],wt=[];const tri=(a,wa,b,wb,c,wc)=>{pos.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z);wt.push(wa,wb,wc);};
    tri(root,0,elbow,0,wrist,0);
    for(let i=0;i<tips.length-1;i++){const a=tips[i],b=tips[i+1];const mid=a.clone().lerp(b,.5).lerp(wrist,.22);tri(wrist,0,a,1,mid,1);tri(wrist,0,mid,1,b,1);}
    const last=tips[tips.length-1],bodyEdge=V(.15,0,-1.35),mid=last.clone().lerp(bodyEdge,.5).lerp(wrist,.15);
    tri(wrist,0,last,1,mid,.45);tri(wrist,0,mid,.45,bodyEdge,0);tri(root,0,wrist,0,bodyEdge,0);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    w.add(new THREE.Mesh(geo,memb));
    w.userData={hand,geo,base:Float32Array.from(pos),wt:Float32Array.from(wt),wrist};return w;}
  const wingL=wing();wingL.position.set(.6,.55,.3);g.add(wingL);
  const wingR=wing();wingR.position.set(-.6,.55,.3);wingR.scale.x=-1;g.add(wingR);

  g.userData={wingL,wingR,mats,flash:0,head,jaw,tail,legs};g.scale.setScalar(scale||1);return g;
}

// --- animation
// Re-place membrane vertices so the skin stretches with the hand section.
const _wv=new THREE.Vector3(),_wq=new THREE.Vector3();
function dWingBend(w){const u=w.userData;if(!u.geo)return;u.hand.updateMatrix();
  const arr=u.geo.attributes.position.array,B=u.base,W=u.wt;
  for(let i=0;i<W.length;i++){const k=W[i],j=i*3;if(!k){continue;}
    _wv.set(B[j],B[j+1],B[j+2]);_wq.copy(_wv).sub(u.wrist).applyMatrix4(u.hand.matrix);_wv.lerp(_wq,k);arr[j]=_wv.x;arr[j+1]=_wv.y;arr[j+2]=_wv.z;}
  u.geo.attributes.position.needsUpdate=true;u.geo.computeVertexNormals();}
// Called every frame per dragon. speed/amp set the wingbeat; small amp (<.3) folds the wings
// (landed, resting or diving), big amp (>=.45) tucks the legs up for flight.
function flap(d,t,speed,amp){const u=d.userData,A=u.anim||(u.anim={last:t,fold:0,tuck:0,jawT:0,jawDur:.5});
  let dt=t-A.last;if(!(dt>0&&dt<.2))dt=.016;A.last=t;
  const k=Math.min(1,dt*4);A.fold+=((amp<.3?1:0)-A.fold)*k;A.tuck+=((amp>=.45?1:0)-A.tuck)*k;
  const f=A.fold,ph=t*speed;
  // wingbeat: the hand trails the arm, so the tips whip through each stroke
  const a=Math.sin(ph)*amp*(1-.5*f)+f*.3;
  u.wingL.rotation.z=a;u.wingR.rotation.z=-a;
  u.wingL.rotation.y=f*.55;u.wingR.rotation.y=-f*.55;// sweep back when folded
  for(const w of[u.wingL,u.wingR]){const h=w.userData.hand;if(!h)continue;
    h.rotation.z=Math.sin(ph-1.1)*amp*.75*(1-f)-f*.25;h.rotation.y=f*1.5;dWingBend(w);}
  if(!u.tail)return;// older models: wings only
  // tail sways in a wave from the root; head looks around a little
  const ts=1.2+speed*.25;
  u.tail.forEach((s,i)=>{s.rotation.y=Math.sin(t*ts-i*.7)*(.05+.035*i);s.rotation.x=Math.sin(t*ts*.7-i*.5)*.03*i-A.tuck*.03;});
  u.head.rotation.x=Math.sin(t*1.3)*.06;u.head.rotation.y=Math.sin(t*.6)*.14;
  // legs swing back in flight and paddle slightly
  for(const l of u.legs)l.rotation.x=A.tuck*(l.userData.front?.9:1.2)+Math.sin(t*2+(l.userData.front?0:1))*.08*A.tuck;
  // jaw: opens for breath / bite, then closes
  if(A.jawT>0){A.jawT=Math.max(0,A.jawT-dt);const p=1-A.jawT/A.jawDur;u.jaw.rotation.x=Math.sin(p*Math.PI)*.6;}else u.jaw.rotation.x=Math.sin(t*.9)*.03;}
// Open the jaw to breathe fire (dur seconds) or snap it for a bite.
function dragonBreathe(d,dur){const A=d.userData.anim||(d.userData.anim={last:0,fold:0,tuck:0,jawT:0,jawDur:.5});A.jawDur=A.jawT=dur||.5;}
function dragonBite(d){dragonBreathe(d,.22);}
// World position of the dragon's mouth (where breath comes from).
function dragonMouth(d){const h=d.userData.head;if(!h)return d.getWorldPosition(new THREE.Vector3());d.updateMatrixWorld();return h.localToWorld(new THREE.Vector3(0,-.12,.95));}
// Red hit flash (tints userData.mats while userData.flash > 0).
function tickFlash(o,dt){const u=o.userData;if(!u.mats)return;if(u.flash>0)u.flash-=dt;const on=u.flash>0;for(const m of u.mats)m.emissive.setHex(on?0x8a2a10:0x000000);}
